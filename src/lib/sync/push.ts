import "server-only";

// Push de la app móvil: aplica en orden las operaciones del outbox del
// dispositivo. Contrato en docs/mobile-api.md.
//
// Garantías:
//   · Idempotencia por opId: cada operación se registra en SyncOperation
//     DENTRO de la misma transacción que su mutación. Un reintento tras un
//     corte de red devuelve "duplicate" sin volver a aplicarla.
//   · Todo o nada por operación: si el servicio devuelve un fallo de
//     negocio, la transacción se ABORTA (aunque el servicio ya hubiera
//     escrito algo) y el rechazo se anota aparte. Sin esto, un servicio que
//     escribe y luego falla dejaría cambios a medias, porque dentro del push
//     su `inTx` reutiliza la transacción exterior en vez de abrir la suya.
//   · Las reglas son las de la web: cada operación llama al MISMO servicio
//     que la server action equivalente.
//   · Un rechazo de NEGOCIO no detiene el lote: las operaciones siguientes
//     se intentan (las que dependan de la rechazada fallarán con su mensaje).
//   · Un fallo TRANSITORIO de infraestructura (conexión, pool, timeout,
//     deadlock) no registra el opId y SÍ detiene el lote: lo que quede se
//     reintenta entero en el próximo push. Seguir era peor: los movimientos
//     de una cuenta cuyo `account.create` acababa de fallar por un corte se
//     rechazaban como negocio («Cuenta no válida») y quedaban REJECTED para
//     siempre aunque la cuenta se creara en el reintento.

import { z } from "zod";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/schemas";
import { isTransientDbError } from "@/lib/services/context";
import { OP_HANDLERS } from "./op-registry";

export const MAX_OPS_PER_PUSH = 200;

const opSchema = z.object({
  opId: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "opId inválido"),
  type: z.string().min(1).max(60),
  payload: z.unknown(),
  // Ids generados en el dispositivo para las filas que crea la operación
  // (p. ej. { id, initialTransactionId }). Ver el catálogo de operaciones.
  ids: z.record(z.string(), z.string()).optional(),
});

export const pushSchema = z.object({
  ops: z.array(opSchema).max(MAX_OPS_PER_PUSH),
});

export type OpStatus = "applied" | "duplicate" | "rejected";

export interface OpResult {
  opId: string;
  status: OpStatus;
  error?: string;
  data?: unknown;
}

/** Aborta la transacción de una operación rechazada. */
class RejectedOp extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}

/**
 * El servicio capturó un fallo transitorio de BD y lo devolvió como
 * `{ success: false, retryable: true }`: aborta la transacción SIN registrar
 * el opId, para que el móvil reintente la operación.
 */
class TransientOpFailure extends Error {}

const RETRY_MESSAGE = "No se pudo aplicar la operación; se reintentará";

export async function applyOps(
  userId: string,
  ops: z.infer<typeof pushSchema>["ops"]
): Promise<OpResult[]> {
  const results: OpResult[] = [];

  for (const op of ops) {
    const previous = await prisma.syncOperation.findUnique({
      where: { userId_opId: { userId, opId: op.opId } },
    });
    if (previous) {
      results.push({
        opId: op.opId,
        status: "duplicate",
        ...(previous.error ? { error: previous.error } : {}),
      });
      continue;
    }

    const handler = OP_HANDLERS[op.type];
    if (!handler) {
      results.push(await reject(userId, op, "Operación desconocida"));
      continue;
    }

    try {
      const data = await prisma.$transaction(
        async (tx) => {
          const result: ActionResult<unknown> = await handler(
            { db: tx, userId },
            op.payload,
            op.ids ?? {}
          );
          if (!result.success) {
            if (result.retryable) throw new TransientOpFailure(result.error);
            throw new RejectedOp(result.error);
          }
          await tx.syncOperation.create({
            data: { userId, opId: op.opId, type: op.type, status: "APPLIED" },
          });
          return result.data;
        },
        { maxWait: 10_000, timeout: 20_000 }
      );
      results.push({ opId: op.opId, status: "applied", data });
    } catch (error) {
      if (error instanceof RejectedOp) {
        results.push(await reject(userId, op, error.reason));
      } else {
        console.error(`mobile push ${op.type}:`, error);
        // Fallo de infraestructura: NO se registra el opId, así que el
        // móvil lo reintentará en el próximo push.
        results.push({ opId: op.opId, status: "rejected", error: RETRY_MESSAGE });
        // Si es transitorio, el resto del lote se deja para el reintento
        // (el cliente trata un opId ausente de la respuesta como pendiente).
        if (error instanceof TransientOpFailure || isTransientDbError(error)) {
          break;
        }
      }
    }
  }

  return results;
}

/** Anota el rechazo (fuera de la transacción abortada) y lo devuelve. */
async function reject(
  userId: string,
  op: { opId: string; type: string },
  error: string
): Promise<OpResult> {
  try {
    await prisma.syncOperation.create({
      data: { userId, opId: op.opId, type: op.type, status: "REJECTED", error },
    });
  } catch {
    // Carrera con un reintento simultáneo del mismo opId: si la OTRA petición
    // llegó a aplicarlo, este «rechazo» es falso (chocó con lo que ella
    // acababa de crear) y lo correcto es responder duplicate.
    const existing = await prisma.syncOperation
      .findUnique({ where: { userId_opId: { userId, opId: op.opId } } })
      .catch(() => null);
    if (existing?.status === "APPLIED") {
      return { opId: op.opId, status: "duplicate" };
    }
  }
  return { opId: op.opId, status: "rejected", error };
}

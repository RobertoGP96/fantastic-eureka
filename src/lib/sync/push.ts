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
//   · Un rechazo no detiene el lote: las operaciones siguientes se intentan
//     (las que dependan de la rechazada fallarán con su propio mensaje).

import { z } from "zod";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/lib/schemas";
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
          if (!result.success) throw new RejectedOp(result.error);
          await tx.syncOperation.create({
            data: { userId, opId: op.opId, type: op.type, status: "APPLIED" },
          });
          return result.data;
        },
        { timeout: 20_000 }
      );
      results.push({ opId: op.opId, status: "applied", data });
    } catch (error) {
      if (error instanceof RejectedOp) {
        results.push(await reject(userId, op, error.reason));
      } else {
        console.error(`mobile push ${op.type}:`, error);
        // Fallo de infraestructura: NO se registra el opId, así que el
        // móvil lo reintentará en el próximo push.
        results.push({
          opId: op.opId,
          status: "rejected",
          error: "No se pudo aplicar la operación; se reintentará",
        });
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
  await prisma.syncOperation
    .create({
      data: { userId, opId: op.opId, type: op.type, status: "REJECTED", error },
    })
    .catch(() => undefined); // carrera con un reintento simultáneo: inocuo
  return { opId: op.opId, status: "rejected", error };
}

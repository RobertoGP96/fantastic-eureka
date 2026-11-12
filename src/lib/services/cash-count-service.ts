// Servicio de arqueos. Lógica extraída de createCashCount
// (src/app/actions/cash-count-actions.ts) sin cambios de comportamiento:
// mismas validaciones y mismos mensajes. Devuelve además `accountId` para
// que la action web revalide el detalle de la caja arqueada.

import { accountBalanceMinor } from "@/lib/balances";
import { PRISMA_INT_MAX, sumMinor } from "@/lib/money";
import { cashCountSchema, type ActionResult } from "@/lib/schemas";
import { isCashLikeType } from "@/lib/domain";
import {
  clientIdOrUndefined,
  inTx,
  type CreateOptions,
  type ServiceContext,
  unexpectedFailure,
} from "./context";

/**
 * `adjustmentTransactionId`: id que el móvil dio offline al movimiento
 * ADJUSTMENT del arqueo. Sin él, tras sincronizar el móvil vería dos ajustes
 * (el suyo y el del servidor).
 */
export interface CashCountOptions extends CreateOptions {
  adjustmentTransactionId?: string;
}

export async function createCashCount(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CashCountOptions = {}
): Promise<
  ActionResult<{ id: string; differenceMinor: number; accountId: string }>
> {
  const parsed = cashCountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const account = await db.account.findFirst({
      where: { id: parsed.data.accountId, userId },
      include: { currency: true },
    });
    if (!account || account.archived || !isCashLikeType(account.type)) {
      return { success: false, error: "Solo se pueden arquear cajas de efectivo" };
    }

    const denominations = await db.denomination.findMany({
      where: {
        currencyId: account.currencyId,
        active: true,
        currency: { userId },
      },
    });
    const byId = new Map(denominations.map((d) => [d.id, d]));

    const seen = new Set<string>();
    for (const line of parsed.data.lines) {
      if (!byId.has(line.denominationId)) {
        return { success: false, error: "Denominación no válida para esta moneda" };
      }
      if (seen.has(line.denominationId)) {
        return { success: false, error: "Hay denominaciones repetidas en el conteo" };
      }
      seen.add(line.denominationId);
    }

    const totalMinor = sumMinor(
      parsed.data.lines.map(
        (line) => byId.get(line.denominationId)!.valueMinor * line.quantity
      )
    );
    if (totalMinor > PRISMA_INT_MAX) {
      return { success: false, error: "El total contado es demasiado grande" };
    }
    const storedLines = parsed.data.lines.filter((line) => line.quantity > 0);

    const { cashCount, differenceMinor } = await inTx(db, async (tx) => {
      // Saldo teórico leído dentro de la transacción: la diferencia guardada
      // es coherente aunque llegue otro movimiento concurrente.
      const expectedMinor = await accountBalanceMinor(account.id, tx);
      const differenceMinor = totalMinor - expectedMinor;

      const created = await tx.cashCount.create({
        data: {
          id: clientIdOrUndefined(options.id),
          accountId: account.id,
          totalMinor,
          expectedMinor,
          differenceMinor,
          note: parsed.data.note || undefined,
          userId,
          lines: {
            create: storedLines.map((line) => ({
              denominationId: line.denominationId,
              quantity: line.quantity,
            })),
          },
        },
      });

      if (parsed.data.createAdjustment && differenceMinor !== 0) {
        const adjustment = await tx.transaction.create({
          data: {
            id: clientIdOrUndefined(options.adjustmentTransactionId),
            kind: "ADJUSTMENT",
            accountId: account.id,
            amountMinor: differenceMinor,
            currencyId: account.currencyId,
            note: "Ajuste por arqueo",
            userId,
          },
        });
        await tx.cashCount.update({
          where: { id: created.id },
          data: { adjustmentTxId: adjustment.id },
        });
      }

      return { cashCount: created, differenceMinor };
    });

    return {
      success: true,
      data: { id: cashCount.id, differenceMinor, accountId: account.id },
    };
  } catch (error) {
    return unexpectedFailure("createCashCount", error, "No se pudo guardar el arqueo");
  }
}

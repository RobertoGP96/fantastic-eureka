import "server-only";

import { prisma } from "@/lib/db";
import { movementLineSign } from "@/lib/counting";

export interface DenominationStockLine {
  denominationId: string;
  valueMinor: number;
  kind: string;
  active: boolean;
  quantity: number;
}

export interface AccountDenominationStock {
  /** Fecha del arqueo que sirve de base; null si nunca se arqueó. */
  countedAt: Date | null;
  /** Movimientos con desglose aplicados después del arqueo base. */
  movements: number;
  /** Todas las denominaciones de la moneda (activas o con stock ≠ 0). */
  lines: DenominationStockLine[];
}

/**
 * Disponibilidad de denominaciones de una caja CASH_BOX, derivada (nunca
 * almacenada): líneas del ÚLTIMO arqueo ± desgloses de movimientos con
 * occurredAt posterior. Movimientos sin desglose no alteran el stock (su
 * efecto aparece como diferencia en el siguiente arqueo).
 */
export async function accountDenominationStock(
  userId: string,
  accountId: string
): Promise<AccountDenominationStock> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { currencyId: true },
  });
  if (!account) return { countedAt: null, movements: 0, lines: [] };

  const lastCount = await prisma.cashCount.findFirst({
    where: { accountId, userId },
    orderBy: { countedAt: "desc" },
    include: { lines: { select: { denominationId: true, quantity: true } } },
  });

  const [denominations, txLines] = await Promise.all([
    prisma.denomination.findMany({
      where: { currencyId: account.currencyId, currency: { userId } },
      orderBy: [{ kind: "asc" }, { valueMinor: "desc" }],
      select: { id: true, valueMinor: true, kind: true, active: true },
    }),
    prisma.transactionDenomination.findMany({
      where: {
        accountId,
        transaction: {
          userId,
          ...(lastCount ? { occurredAt: { gt: lastCount.countedAt } } : {}),
        },
      },
      select: {
        denominationId: true,
        quantity: true,
        transactionId: true,
        transaction: { select: { kind: true, accountId: true } },
      },
    }),
  ]);

  const stock = new Map<string, number>();
  for (const line of lastCount?.lines ?? []) {
    stock.set(line.denominationId, line.quantity);
  }

  const appliedTx = new Set<string>();
  for (const line of txLines) {
    const sign = movementLineSign(
      line.transaction.kind,
      line.transaction.accountId === accountId
    );
    if (sign === 0) continue;
    stock.set(
      line.denominationId,
      (stock.get(line.denominationId) ?? 0) + sign * line.quantity
    );
    appliedTx.add(line.transactionId);
  }

  const lines = denominations
    .map((d) => ({
      denominationId: d.id,
      valueMinor: d.valueMinor,
      kind: d.kind,
      active: d.active,
      quantity: stock.get(d.id) ?? 0,
    }))
    .filter((line) => line.active || line.quantity !== 0);

  return {
    countedAt: lastCount?.countedAt ?? null,
    movements: appliedTx.size,
    lines,
  };
}

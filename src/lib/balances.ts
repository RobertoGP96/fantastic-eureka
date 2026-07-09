import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { balancesFromGroups, signedKindMinor } from "@/lib/balances-core";
import { sumMinor } from "@/lib/money";
import { latestPairRates, resolvePairRate } from "@/lib/rates";

type Db = PrismaClient | Prisma.TransactionClient;

// Saldo derivado del libro mayor, nunca almacenado:
//   + INCOME y ADJUSTMENT (con signo) sobre la cuenta
//   − EXPENSE y TRANSFER saliente
//   + TRANSFER entrante (counterAmountMinor, en la moneda de la cuenta destino)
// Acepta un TransactionClient para releer el saldo dentro de la transacción
// que valida contra él (evita chequeos con datos obsoletos).
export async function accountBalanceMinor(
  accountId: string,
  db: Db = prisma
): Promise<number> {
  const [own, incoming] = await Promise.all([
    db.transaction.findMany({
      where: { accountId },
      select: { kind: true, amountMinor: true },
    }),
    db.transaction.aggregate({
      where: { counterAccountId: accountId, kind: "TRANSFER" },
      _sum: { counterAmountMinor: true },
    }),
  ]);

  const ownTotal = sumMinor(
    own.map((tx) => signedKindMinor(tx.kind, tx.amountMinor))
  );

  return ownTotal + (incoming._sum.counterAmountMinor ?? 0);
}

export interface AccountWithBalance {
  id: string;
  name: string;
  type: string;
  icon: string | null;
  archived: boolean;
  currency: {
    id: string;
    code: string;
    symbol: string;
    decimalPlaces: number;
  };
  group: { id: string; name: string } | null;
  balanceMinor: number;
}

export async function listAccountsWithBalances(
  userId: string,
  options?: {
    includeArchived?: boolean;
  }
): Promise<AccountWithBalance[]> {
  // 3 consultas fijas (antes 1 + 2 por cuenta): las sumas se agregan en la BD
  // con groupBy y el saldo se compone con la lógica pura de balances-core.
  const [accounts, ownGroups, incomingGroups] = await Promise.all([
    prisma.account.findMany({
      where: {
        userId,
        ...(options?.includeArchived ? {} : { archived: false }),
      },
      include: {
        currency: true,
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "kind"],
      where: { userId },
      _sum: { amountMinor: true },
    }),
    prisma.transaction.groupBy({
      by: ["counterAccountId"],
      where: { userId, kind: "TRANSFER", counterAccountId: { not: null } },
      _sum: { counterAmountMinor: true },
    }),
  ]);

  const balances = balancesFromGroups(
    ownGroups.map((group) => ({
      accountId: group.accountId,
      kind: group.kind,
      sumMinor: group._sum.amountMinor ?? 0,
    })),
    incomingGroups.flatMap((group) =>
      group.counterAccountId
        ? [
            {
              accountId: group.counterAccountId,
              sumMinor: group._sum.counterAmountMinor ?? 0,
            },
          ]
        : []
    )
  );

  return accounts.map((account) => ({
    id: account.id,
    name: account.name,
    type: account.type,
    icon: account.icon,
    archived: account.archived,
    currency: {
      id: account.currency.id,
      code: account.currency.code,
      symbol: account.currency.symbol,
      decimalPlaces: account.currency.decimalPlaces,
    },
    group: account.group,
    balanceMinor: balances.get(account.id) ?? 0,
  }));
}

/**
 * Tasa vigente de cada moneda CONTRA LA BASE, resuelta desde los pares
 * registrados (directo o inverso). Mantiene la interfaz histórica
 * Map<currencyId, {rateScaled, effectiveAt}> que consume el resto de la app.
 */
export async function latestRatesByCurrency(
  userId: string
): Promise<Map<string, { rateScaled: number; effectiveAt: Date }>> {
  const [base, currencies, pairs] = await Promise.all([
    prisma.currency.findFirst({
      where: { userId, isBase: true },
      select: { id: true },
    }),
    prisma.currency.findMany({ where: { userId }, select: { id: true } }),
    latestPairRates(userId),
  ]);

  const map = new Map<string, { rateScaled: number; effectiveAt: Date }>();
  if (!base) return map;

  for (const currency of currencies) {
    if (currency.id === base.id) continue;
    const resolved = resolvePairRate(pairs, currency.id, base.id);
    if (resolved) map.set(currency.id, resolved);
  }
  return map;
}

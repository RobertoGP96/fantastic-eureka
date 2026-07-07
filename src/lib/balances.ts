import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
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
    own.map((tx) => {
      switch (tx.kind) {
        case "INCOME":
        case "ADJUSTMENT":
          return tx.amountMinor;
        case "EXPENSE":
        case "TRANSFER":
          return -tx.amountMinor;
        default:
          // Un kind desconocido corrompería el saldo en silencio: mejor fallar.
          throw new Error(`Tipo de transacción desconocido: ${tx.kind}`);
      }
    })
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

export async function listAccountsWithBalances(options?: {
  includeArchived?: boolean;
}): Promise<AccountWithBalance[]> {
  const accounts = await prisma.account.findMany({
    where: options?.includeArchived ? {} : { archived: false },
    include: {
      currency: true,
      group: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    accounts.map(async (account) => ({
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
      balanceMinor: await accountBalanceMinor(account.id),
    }))
  );
}

/**
 * Tasa vigente de cada moneda CONTRA LA BASE, resuelta desde los pares
 * registrados (directo o inverso). Mantiene la interfaz histórica
 * Map<currencyId, {rateScaled, effectiveAt}> que consume el resto de la app.
 */
export async function latestRatesByCurrency(): Promise<
  Map<string, { rateScaled: number; effectiveAt: Date }>
> {
  const [base, currencies, pairs] = await Promise.all([
    prisma.currency.findFirst({ where: { isBase: true }, select: { id: true } }),
    prisma.currency.findMany({ select: { id: true } }),
    latestPairRates(),
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

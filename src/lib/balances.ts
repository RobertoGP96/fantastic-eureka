import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sumMinor } from "@/lib/money";

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
  balanceMinor: number;
}

export async function listAccountsWithBalances(options?: {
  includeArchived?: boolean;
}): Promise<AccountWithBalance[]> {
  const accounts = await prisma.account.findMany({
    where: options?.includeArchived ? {} : { archived: false },
    include: { currency: true },
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
      balanceMinor: await accountBalanceMinor(account.id),
    }))
  );
}

/** Última tasa vigente (mayor effectiveAt) de cada moneda contra la base. */
export async function latestRatesByCurrency(): Promise<
  Map<string, { rateScaled: number; effectiveAt: Date }>
> {
  const rates = await prisma.exchangeRate.findMany({
    orderBy: { effectiveAt: "desc" },
  });
  const latest = new Map<string, { rateScaled: number; effectiveAt: Date }>();
  for (const rate of rates) {
    if (!latest.has(rate.currencyId)) {
      latest.set(rate.currencyId, {
        rateScaled: rate.rateScaled,
        effectiveAt: rate.effectiveAt,
      });
    }
  }
  return latest;
}

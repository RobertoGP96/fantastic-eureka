import "server-only";

import { prisma } from "@/lib/db";
import { latestRatesByCurrency } from "@/lib/balances";
import { convertMinor } from "@/lib/money";
import {
  buildMonthlySeries,
  lastMonths,
  type BaseCurrencyInfo,
  type MonthBucket,
  type RatesMap,
} from "@/lib/metrics-core";
import {
  buildIncomeCardSeries,
  incomeCardRangeStart,
  type IncomeCardSeries,
} from "@/lib/income-series";

export interface DashboardMetrics {
  series: MonthBucket[];
  topCategories: { name: string; totalMinor: number }[];
  receivableMinor: number;
  payableMinor: number;
  missingRates: Set<string>;
}

/** Métricas del dashboard convertidas a la moneda base (últimos `months` meses). */
export async function dashboardMetrics(
  userId: string,
  base: BaseCurrencyInfo & { code: string },
  months = 6
): Promise<DashboardMetrics> {
  const monthList = lastMonths(months);
  const [year, month] = monthList[0].key.split("-").map(Number);
  const rangeStart = new Date(year, month - 1, 1);
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [rates, transactions, openDebts] = await Promise.all([
    latestRatesByCurrency(userId),
    prisma.transaction.findMany({
      where: {
        userId,
        kind: { in: ["INCOME", "EXPENSE"] },
        occurredAt: { gte: rangeStart },
      },
      select: {
        kind: true,
        amountMinor: true,
        occurredAt: true,
        currency: { select: { id: true, code: true, decimalPlaces: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.debt.findMany({
      where: { userId, status: "OPEN" },
      include: {
        currency: { select: { id: true, code: true, decimalPlaces: true } },
        payments: { select: { amountMinor: true } },
      },
    }),
  ]);

  const { series, missingRates } = buildMonthlySeries(
    transactions,
    monthList,
    base,
    rates
  );

  // Top de categorías de gasto del mes en curso.
  const byCategory = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.kind !== "EXPENSE" || tx.occurredAt < currentMonthStart) continue;
    let converted = tx.amountMinor;
    if (tx.currency.id !== base.id) {
      const rate = rates.get(tx.currency.id);
      if (!rate) continue; // ya reportada en missingRates
      converted = convertMinor(tx.amountMinor, tx.currency, base, rate.rateScaled);
    }
    const name = tx.category?.name ?? "Sin categoría";
    byCategory.set(name, (byCategory.get(name) ?? 0) + converted);
  }
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, totalMinor]) => ({ name, totalMinor }));

  // Totales de deudas abiertas (pendiente) por dirección.
  let receivableMinor = 0;
  let payableMinor = 0;
  for (const debt of openDebts) {
    const paid = debt.payments.reduce((acc, p) => acc + p.amountMinor, 0);
    let remaining = debt.totalMinor - paid;
    if (remaining <= 0) continue;
    if (debt.currency.id !== base.id) {
      const rate = rates.get(debt.currency.id);
      if (!rate) {
        missingRates.add(debt.currency.code);
        continue;
      }
      remaining = convertMinor(remaining, debt.currency, base, rate.rateScaled);
    }
    if (debt.direction === "RECEIVABLE") receivableMinor += remaining;
    else payableMinor += remaining;
  }

  return { series, topCategories, receivableMinor, payableMinor, missingRates };
}

export interface IncomeCardData {
  currency: { code: string; decimalPlaces: number };
  series: IncomeCardSeries;
  missingRates: string[];
  /** Nombre de la cuenta cuando el gadget filtra por una. */
  accountName?: string;
}

/**
 * Datos del gadget «Resumen de ingresos»: series día/semana/mes de ingresos
 * y gastos. Con `accountId` se limita a esa cuenta y los montos van en su
 * moneda (sin conversión); sin cuenta se agregan todas convertidas a base.
 * Devuelve null si la cuenta no existe (o es ajena) o si falta la base.
 */
export async function incomeCardData(
  userId: string,
  base: (BaseCurrencyInfo & { code: string }) | null,
  accountId?: string
): Promise<IncomeCardData | null> {
  const rangeStart = incomeCardRangeStart();

  if (accountId) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      include: {
        currency: { select: { id: true, code: true, decimalPlaces: true } },
      },
    });
    if (!account) return null;
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        accountId: account.id,
        kind: { in: ["INCOME", "EXPENSE"] },
        occurredAt: { gte: rangeStart },
      },
      select: {
        kind: true,
        amountMinor: true,
        occurredAt: true,
        currency: { select: { id: true, code: true, decimalPlaces: true } },
      },
    });
    // Los movimientos se guardan en la moneda de la cuenta: no hay conversión.
    const { series, missingRates } = buildIncomeCardSeries(
      transactions,
      account.currency,
      new Map() as RatesMap
    );
    return {
      currency: account.currency,
      series,
      missingRates: [...missingRates],
      accountName: account.name,
    };
  }

  if (!base) return null;
  const [rates, transactions] = await Promise.all([
    latestRatesByCurrency(userId),
    prisma.transaction.findMany({
      where: {
        userId,
        kind: { in: ["INCOME", "EXPENSE"] },
        occurredAt: { gte: rangeStart },
      },
      select: {
        kind: true,
        amountMinor: true,
        occurredAt: true,
        currency: { select: { id: true, code: true, decimalPlaces: true } },
      },
    }),
  ]);
  const { series, missingRates } = buildIncomeCardSeries(
    transactions,
    base,
    rates
  );
  return { currency: base, series, missingRates: [...missingRates] };
}

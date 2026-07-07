// Lógica pura del dashboard (agrupación mensual y conversión a moneda base),
// separada de Prisma para poder testearla en aislamiento.
import { convertMinor } from "@/lib/money";

export interface RawMetricTx {
  kind: string;
  amountMinor: number;
  occurredAt: Date;
  currency: { id: string; code: string; decimalPlaces: number };
}

export interface MonthBucket {
  key: string;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
}

export interface BaseCurrencyInfo {
  id: string;
  decimalPlaces: number;
}

export type RatesMap = Map<string, { rateScaled: number }>;

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABEL = new Intl.DateTimeFormat("es", { month: "short" });

/** Últimos `n` meses (incluyendo el actual), del más antiguo al más reciente. */
export function lastMonths(
  n: number,
  now: Date = new Date()
): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(date), label: MONTH_LABEL.format(date) });
  }
  return months;
}

/**
 * Serie mensual de ingresos/gastos convertidos a la moneda base con la tasa
 * vigente. Los montos en monedas sin tasa se excluyen y sus códigos se
 * devuelven en missingRates para avisar en el UI.
 */
export function buildMonthlySeries(
  rows: RawMetricTx[],
  months: { key: string; label: string }[],
  base: BaseCurrencyInfo,
  rates: RatesMap
): { series: MonthBucket[]; missingRates: Set<string> } {
  const buckets = new Map<string, MonthBucket>(
    months.map((m) => [
      m.key,
      { key: m.key, label: m.label, incomeMinor: 0, expenseMinor: 0 },
    ])
  );
  const missingRates = new Set<string>();

  for (const row of rows) {
    if (row.kind !== "INCOME" && row.kind !== "EXPENSE") continue;
    const bucket = buckets.get(monthKey(row.occurredAt));
    if (!bucket) continue;

    let converted = row.amountMinor;
    if (row.currency.id !== base.id) {
      const rate = rates.get(row.currency.id);
      if (!rate) {
        missingRates.add(row.currency.code);
        continue;
      }
      converted = convertMinor(
        row.amountMinor,
        row.currency,
        base,
        rate.rateScaled
      );
    }

    if (row.kind === "INCOME") bucket.incomeMinor += converted;
    else bucket.expenseMinor += converted;
  }

  return { series: months.map((m) => buckets.get(m.key)!), missingRates };
}

/** Variación porcentual respecto al valor anterior; null si no hay referencia. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

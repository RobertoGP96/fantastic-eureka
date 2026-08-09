// Series de ingresos/gastos por día, semana y mes para el gadget «Resumen
// de ingresos». Lógica pura (sin Prisma) para poder testearla; la consulta
// vive en src/lib/metrics.ts (incomeCardData).
import { convertMinor } from "@/lib/money";
import {
  lastMonths,
  monthKey,
  type BaseCurrencyInfo,
  type RatesMap,
  type RawMetricTx,
} from "@/lib/metrics-core";

export const INCOME_CARD_DAYS = 14;
export const INCOME_CARD_WEEKS = 12;
export const INCOME_CARD_MONTHS = 12;

export interface PeriodBucket {
  key: string;
  label: string;
  incomeMinor: number;
  expenseMinor: number;
}

export interface IncomeCardSeries {
  day: PeriodBucket[];
  week: PeriodBucket[];
  month: PeriodBucket[];
}

const DAY_LABEL = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
});

/** Clave local yyyy-mm-dd (sin UTC: los buckets siguen al reloj local). */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Lunes de la semana de `date` (a medianoche local). */
export function weekStart(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (monday.getDay() + 6) % 7; // lunes = 0
  monday.setDate(monday.getDate() - offset);
  return monday;
}

/** Últimos `n` días (incluido hoy), del más antiguo al más reciente. */
export function lastDays(
  n: number,
  now: Date = new Date()
): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({ key: dayKey(date), label: DAY_LABEL.format(date) });
  }
  return days;
}

/** Últimas `n` semanas (incluida la actual), etiquetadas por su lunes. */
export function lastWeeks(
  n: number,
  now: Date = new Date()
): { key: string; label: string }[] {
  const weeks: { key: string; label: string }[] = [];
  const monday = weekStart(now);
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() - i * 7
    );
    weeks.push({ key: dayKey(date), label: DAY_LABEL.format(date) });
  }
  return weeks;
}

/** Inicio del rango de consulta que cubre las tres series (12 meses). */
export function incomeCardRangeStart(now: Date = new Date()): Date {
  const [year, month] = lastMonths(INCOME_CARD_MONTHS, now)[0].key
    .split("-")
    .map(Number);
  return new Date(year, month - 1, 1);
}

/**
 * Agrega los movimientos en las tres series (día/semana/mes) convertidos a
 * la moneda de despliegue con la tasa vigente. Los montos en monedas sin
 * tasa se excluyen y sus códigos se devuelven en missingRates.
 */
export function buildIncomeCardSeries(
  rows: RawMetricTx[],
  display: BaseCurrencyInfo,
  rates: RatesMap,
  now: Date = new Date()
): { series: IncomeCardSeries; missingRates: Set<string> } {
  const windows = {
    day: lastDays(INCOME_CARD_DAYS, now),
    week: lastWeeks(INCOME_CARD_WEEKS, now),
    month: lastMonths(INCOME_CARD_MONTHS, now),
  };
  const buckets = {
    day: new Map<string, PeriodBucket>(),
    week: new Map<string, PeriodBucket>(),
    month: new Map<string, PeriodBucket>(),
  };
  for (const period of ["day", "week", "month"] as const) {
    for (const w of windows[period]) {
      buckets[period].set(w.key, {
        key: w.key,
        label: w.label,
        incomeMinor: 0,
        expenseMinor: 0,
      });
    }
  }
  const missingRates = new Set<string>();

  for (const row of rows) {
    if (row.kind !== "INCOME" && row.kind !== "EXPENSE") continue;

    let converted = row.amountMinor;
    if (row.currency.id !== display.id) {
      const rate = rates.get(row.currency.id);
      if (!rate) {
        missingRates.add(row.currency.code);
        continue;
      }
      converted = convertMinor(
        row.amountMinor,
        row.currency,
        display,
        rate.rateScaled
      );
    }

    const keys = {
      day: dayKey(row.occurredAt),
      week: dayKey(weekStart(row.occurredAt)),
      month: monthKey(row.occurredAt),
    };
    for (const period of ["day", "week", "month"] as const) {
      const bucket = buckets[period].get(keys[period]);
      if (!bucket) continue;
      if (row.kind === "INCOME") bucket.incomeMinor += converted;
      else bucket.expenseMinor += converted;
    }
  }

  return {
    series: {
      day: windows.day.map((w) => buckets.day.get(w.key)!),
      week: windows.week.map((w) => buckets.week.get(w.key)!),
      month: windows.month.map((w) => buckets.month.get(w.key)!),
    },
    missingRates,
  };
}

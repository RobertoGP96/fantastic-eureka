import { describe, expect, it } from "vitest";
import {
  buildIncomeCardSeries,
  dayKey,
  incomeCardRangeStart,
  lastDays,
  lastWeeks,
  weekStart,
  INCOME_CARD_DAYS,
  INCOME_CARD_MONTHS,
  INCOME_CARD_WEEKS,
} from "./income-series";
import type { RatesMap } from "./metrics-core";

// Domingo 9 de agosto de 2026.
const NOW = new Date(2026, 7, 9, 12, 0, 0);

const cup = { id: "cup", code: "CUP", decimalPlaces: 2 };
const usd = { id: "usd", code: "USD", decimalPlaces: 2 };
const mlc = { id: "mlc", code: "MLC", decimalPlaces: 2 };

describe("dayKey / weekStart", () => {
  it("clave local yyyy-mm-dd", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("weekStart devuelve el lunes de la semana", () => {
    // Domingo 9 ago → lunes 3 ago; lunes 3 ago → él mismo.
    expect(dayKey(weekStart(NOW))).toBe("2026-08-03");
    expect(dayKey(weekStart(new Date(2026, 7, 3)))).toBe("2026-08-03");
  });
});

describe("lastDays / lastWeeks", () => {
  it("del más antiguo al más reciente, incluyendo hoy", () => {
    const days = lastDays(3, NOW);
    expect(days.map((d) => d.key)).toEqual([
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
  });

  it("semanas etiquetadas por su lunes", () => {
    const weeks = lastWeeks(2, NOW);
    expect(weeks.map((w) => w.key)).toEqual(["2026-07-27", "2026-08-03"]);
  });

  it("el rango de consulta cubre los 12 meses", () => {
    expect(incomeCardRangeStart(NOW)).toEqual(new Date(2025, 8, 1));
  });
});

describe("buildIncomeCardSeries", () => {
  const rates: RatesMap = new Map([["usd", { rateScaled: 20000 }]]);
  const rows = [
    { kind: "INCOME", amountMinor: 100, occurredAt: new Date(2026, 7, 9), currency: cup },
    { kind: "EXPENSE", amountMinor: 40, occurredAt: new Date(2026, 7, 9), currency: cup },
    { kind: "INCOME", amountMinor: 50, occurredAt: new Date(2026, 7, 4), currency: cup },
    { kind: "INCOME", amountMinor: 30, occurredAt: new Date(2026, 6, 15), currency: cup },
    // USD con tasa 2 → se convierte a 200.
    { kind: "INCOME", amountMinor: 100, occurredAt: new Date(2026, 7, 9), currency: usd },
    // Sin tasa → excluida y reportada.
    { kind: "INCOME", amountMinor: 999, occurredAt: new Date(2026, 7, 9), currency: mlc },
    // Otros tipos no cuentan.
    { kind: "TRANSFER", amountMinor: 777, occurredAt: new Date(2026, 7, 9), currency: cup },
  ];

  it("agrega por día, semana y mes con conversión a la base", () => {
    const { series, missingRates } = buildIncomeCardSeries(rows, cup, rates, NOW);

    expect(series.day).toHaveLength(INCOME_CARD_DAYS);
    expect(series.week).toHaveLength(INCOME_CARD_WEEKS);
    expect(series.month).toHaveLength(INCOME_CARD_MONTHS);

    const today = series.day.at(-1)!;
    expect(today).toMatchObject({ incomeMinor: 300, expenseMinor: 40 });
    // 9 ago − 5 días = 4 ago.
    expect(series.day.at(-6)!.incomeMinor).toBe(50);

    const thisWeek = series.week.at(-1)!;
    expect(thisWeek).toMatchObject({ incomeMinor: 350, expenseMinor: 40 });
    // 15 jul cae en la semana del lunes 13 jul (3 semanas antes).
    expect(series.week.at(-4)!.incomeMinor).toBe(30);

    const thisMonth = series.month.at(-1)!;
    expect(thisMonth).toMatchObject({ incomeMinor: 350, expenseMinor: 40 });
    expect(series.month.at(-2)!.incomeMinor).toBe(30);

    expect(missingRates).toEqual(new Set(["MLC"]));
  });

  it("los movimientos fuera de ventana no rompen nada", () => {
    const { series } = buildIncomeCardSeries(
      [
        {
          kind: "INCOME",
          amountMinor: 500,
          occurredAt: new Date(2020, 0, 1),
          currency: cup,
        },
      ],
      cup,
      new Map() as RatesMap,
      NOW
    );
    expect(series.month.every((b) => b.incomeMinor === 0)).toBe(true);
  });
});

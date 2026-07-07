import { describe, expect, it } from "vitest";
import {
  buildMonthlySeries,
  deltaPct,
  lastMonths,
  monthKey,
  type RawMetricTx,
} from "@/lib/metrics-core";

const BASE = { id: "cup", decimalPlaces: 0 };
const CUP = { id: "cup", code: "CUP", decimalPlaces: 0 };
const USD = { id: "usd", code: "USD", decimalPlaces: 2 };

const tx = (
  kind: string,
  amountMinor: number,
  occurredAt: Date,
  currency = CUP
): RawMetricTx => ({ kind, amountMinor, occurredAt, currency });

describe("monthKey / lastMonths", () => {
  it("genera claves año-mes locales", () => {
    expect(monthKey(new Date(2026, 6, 15))).toBe("2026-07");
    expect(monthKey(new Date(2026, 0, 1))).toBe("2026-01");
  });

  it("devuelve los últimos meses en orden cronológico cruzando el año", () => {
    const months = lastMonths(3, new Date(2026, 0, 15));
    expect(months.map((m) => m.key)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
    ]);
  });
});

describe("buildMonthlySeries", () => {
  const months = lastMonths(2, new Date(2026, 6, 7));
  const rates = new Map([["usd", { rateScaled: 4_000_000 }]]); // 1 USD = 400 CUP

  it("agrupa ingresos y gastos por mes", () => {
    const { series } = buildMonthlySeries(
      [
        tx("INCOME", 1000, new Date(2026, 6, 1)),
        tx("EXPENSE", 300, new Date(2026, 6, 2)),
        tx("EXPENSE", 200, new Date(2026, 5, 20)),
      ],
      months,
      BASE,
      rates
    );
    expect(series[1]).toMatchObject({ incomeMinor: 1000, expenseMinor: 300 });
    expect(series[0]).toMatchObject({ incomeMinor: 0, expenseMinor: 200 });
  });

  it("convierte a la base con la tasa vigente", () => {
    const { series } = buildMonthlySeries(
      [tx("INCOME", 500, new Date(2026, 6, 3), USD)], // 5.00 USD → 2 000 CUP
      months,
      BASE,
      rates
    );
    expect(series[1].incomeMinor).toBe(2000);
  });

  it("excluye monedas sin tasa y las reporta", () => {
    const { series, missingRates } = buildMonthlySeries(
      [tx("EXPENSE", 500, new Date(2026, 6, 3), USD)],
      months,
      BASE,
      new Map()
    );
    expect(series[1].expenseMinor).toBe(0);
    expect([...missingRates]).toEqual(["USD"]);
  });

  it("ignora transferencias, ajustes y meses fuera de rango", () => {
    const { series } = buildMonthlySeries(
      [
        tx("TRANSFER", 900, new Date(2026, 6, 1)),
        tx("ADJUSTMENT", 900, new Date(2026, 6, 1)),
        tx("INCOME", 900, new Date(2025, 6, 1)),
      ],
      months,
      BASE,
      rates
    );
    expect(series.every((m) => m.incomeMinor === 0 && m.expenseMinor === 0)).toBe(
      true
    );
  });
});

describe("deltaPct", () => {
  it("calcula la variación porcentual", () => {
    expect(deltaPct(120, 100)).toBe(20);
    expect(deltaPct(80, 100)).toBe(-20);
  });

  it("devuelve null sin referencia previa", () => {
    expect(deltaPct(50, 0)).toBeNull();
  });
});

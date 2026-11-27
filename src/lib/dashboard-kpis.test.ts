import { describe, expect, it } from "vitest";
import { buildFlowKpis } from "./dashboard-kpis";
import type { MonthBucket } from "./metrics-core";

const month = (
  label: string,
  incomeMinor: number,
  expenseMinor: number
): MonthBucket => ({ key: label, label, incomeMinor, expenseMinor });

describe("buildFlowKpis", () => {
  it("serie vacía → null", () => {
    expect(buildFlowKpis([])).toBeNull();
  });

  it("toma el último mes y lo compara con el anterior", () => {
    const kpis = buildFlowKpis([
      month("sep", 1000, 400),
      month("oct", 2000, 1000),
      month("nov", 3000, 800),
    ])!;
    expect(kpis.monthLabel).toBe("nov");
    expect(kpis.previousLabel).toBe("oct");

    // Ingresos: 2000 → 3000 = +50 % (favorable).
    expect(kpis.income).toEqual({
      valueMinor: 3000,
      delta: 50,
      deltaGood: true,
      series: [1000, 2000, 3000],
    });
    // Gastos: 1000 → 800 = −20 % (gastar menos es favorable).
    expect(kpis.expense).toEqual({
      valueMinor: 800,
      delta: -20,
      deltaGood: true,
      series: [400, 1000, 800],
    });
    // Neto: 1000 → 2200 = +120 %.
    expect(kpis.net).toEqual({
      valueMinor: 2200,
      delta: 120,
      deltaGood: true,
      series: [600, 1000, 2200],
    });
  });

  it("marca como desfavorable ganar menos o gastar más", () => {
    const kpis = buildFlowKpis([month("oct", 2000, 500), month("nov", 1000, 900)])!;
    expect(kpis.income.delta).toBe(-50);
    expect(kpis.income.deltaGood).toBe(false);
    expect(kpis.expense.delta).toBe(80);
    expect(kpis.expense.deltaGood).toBe(false);
    expect(kpis.net.delta).toBe(-93);
    expect(kpis.net.deltaGood).toBe(false);
  });

  it("sin mes anterior no hay variación", () => {
    const kpis = buildFlowKpis([month("nov", 1000, 300)])!;
    expect(kpis.previousLabel).toBeNull();
    expect(kpis.income.delta).toBeNull();
    expect(kpis.expense.delta).toBeNull();
    expect(kpis.net.delta).toBeNull();
    expect(kpis.net.valueMinor).toBe(700);
  });

  it("con base cero o neto anterior negativo la variación es null", () => {
    const kpis = buildFlowKpis([month("oct", 0, 500), month("nov", 1000, 0)])!;
    expect(kpis.income.delta).toBeNull(); // base 0
    expect(kpis.net.delta).toBeNull(); // neto anterior −500
    expect(kpis.net.deltaGood).toBe(true);
    expect(kpis.net.series).toEqual([-500, 1000]);
  });
});

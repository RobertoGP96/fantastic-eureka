import { describe, expect, it } from "vitest";
import { basicDenominations } from "./user-defaults";

describe("basicDenominations", () => {
  it("moneda de 2 decimales: billetes 1-500 y monedas fraccionarias", () => {
    const denominations = basicDenominations(2);
    const bills = denominations.filter((d) => d.kind === "BILL");
    const coins = denominations.filter((d) => d.kind === "COIN");

    expect(bills.map((d) => d.valueMinor)).toEqual([
      50000, 20000, 10000, 5000, 2000, 1000, 500, 100,
    ]);
    expect(coins.map((d) => d.valueMinor)).toEqual([50, 25, 10, 5]);
  });

  it("moneda sin decimales: billetes 1-500 y moneda de 1", () => {
    const denominations = basicDenominations(0);
    const bills = denominations.filter((d) => d.kind === "BILL");
    const coins = denominations.filter((d) => d.kind === "COIN");

    expect(bills.map((d) => d.valueMinor)).toEqual([
      500, 200, 100, 50, 20, 10, 5, 1,
    ]);
    expect(coins.map((d) => d.valueMinor)).toEqual([1]);
  });

  it("descarta fracciones que no dan entero en unidades menores", () => {
    // Con 1 decimal, 0.25 y 0.05 darían 2.5 y 0.5 → fuera.
    const coins = basicDenominations(1).filter((d) => d.kind === "COIN");
    expect(coins.map((d) => d.valueMinor)).toEqual([5, 1]);
  });

  it("todos los valores son enteros positivos (regla amountMinor)", () => {
    for (const decimalPlaces of [0, 1, 2, 3]) {
      for (const denomination of basicDenominations(decimalPlaces)) {
        expect(Number.isInteger(denomination.valueMinor)).toBe(true);
        expect(denomination.valueMinor).toBeGreaterThan(0);
      }
    }
  });
});

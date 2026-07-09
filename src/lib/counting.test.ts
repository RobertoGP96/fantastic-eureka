import { describe, expect, it } from "vitest";
import {
  clampQty,
  countedPieces,
  countedTotalMinor,
  MAX_QTY,
  movementLineSign,
  suggestDistribution,
} from "./counting";

describe("clampQty", () => {
  it("trunca decimales y descarta negativos", () => {
    expect(clampQty(3.9)).toBe(3);
    expect(clampQty(-5)).toBe(0);
    expect(clampQty(0)).toBe(0);
  });

  it("convierte NaN en 0 y aplica el tope", () => {
    expect(clampQty(Number.NaN)).toBe(0);
    expect(clampQty(MAX_QTY + 1)).toBe(MAX_QTY);
  });
});

describe("countedTotalMinor", () => {
  const denominations = [
    { id: "b500", valueMinor: 50000 },
    { id: "b100", valueMinor: 10000 },
    { id: "c25", valueMinor: 25 },
  ];

  it("suma valor × cantidad por denominación", () => {
    const total = countedTotalMinor(denominations, {
      b500: 3,
      b100: 2,
      c25: 4,
    });
    expect(total).toBe(3 * 50000 + 2 * 10000 + 4 * 25);
  });

  it("trata denominaciones sin cantidad como 0", () => {
    expect(countedTotalMinor(denominations, { b100: 1 })).toBe(10000);
    expect(countedTotalMinor(denominations, {})).toBe(0);
  });

  it("ignora cantidades de denominaciones desconocidas", () => {
    expect(countedTotalMinor(denominations, { otra: 99 })).toBe(0);
  });
});

describe("countedPieces", () => {
  it("suma todas las piezas contadas", () => {
    expect(countedPieces({ a: 3, b: 0, c: 7 })).toBe(10);
    expect(countedPieces({})).toBe(0);
  });
});

describe("movementLineSign", () => {
  it("entra con INCOME y destino de TRANSFER", () => {
    expect(movementLineSign("INCOME", true)).toBe(1);
    expect(movementLineSign("TRANSFER", false)).toBe(1);
  });

  it("sale con EXPENSE y origen de TRANSFER", () => {
    expect(movementLineSign("EXPENSE", true)).toBe(-1);
    expect(movementLineSign("TRANSFER", true)).toBe(-1);
  });

  it("ADJUSTMENT y kinds desconocidos no llevan desglose", () => {
    expect(movementLineSign("ADJUSTMENT", true)).toBe(0);
    expect(movementLineSign("OTRO", false)).toBe(0);
  });
});

describe("suggestDistribution", () => {
  const d = (id: string, valueMinor: number, available?: number) => ({
    id,
    valueMinor,
    available,
  });

  it("reparte mayor-primero en sistemas canónicos", () => {
    const result = suggestDistribution(
      [d("b1000", 1000), d("b500", 500), d("b200", 200), d("b100", 100)],
      1700
    );
    expect(result).toEqual({ b1000: 1, b500: 1, b200: 1 });
  });

  it("retrocede cuando el voraz puro falla (billete de 3)", () => {
    // 6 = 3+3; el voraz tomaría 5 y no podría completar el resto.
    const result = suggestDistribution([d("b5", 5), d("b3", 3)], 6);
    expect(result).toEqual({ b3: 2 });
  });

  it("respeta el stock disponible", () => {
    const result = suggestDistribution(
      [d("b500", 500, 1), d("b200", 200, 4)],
      900
    );
    expect(result).toEqual({ b500: 1, b200: 2 });
  });

  it("devuelve null si el stock no alcanza o no hay combinación exacta", () => {
    expect(
      suggestDistribution([d("b500", 500, 1), d("b200", 200, 2)], 1000)
    ).toBeNull();
    expect(suggestDistribution([d("b200", 200)], 300)).toBeNull();
  });

  it("monto 0 → desglose vacío; negativo → null", () => {
    expect(suggestDistribution([d("b100", 100)], 0)).toEqual({});
    expect(suggestDistribution([d("b100", 100)], -5)).toBeNull();
  });

  it("resuelve montos grandes sin agotar el presupuesto de pasos", () => {
    const result = suggestDistribution(
      [d("b1000", 1000), d("b500", 500), d("b3", 3), d("b1", 1)],
      1_234_567
    );
    expect(result).not.toBeNull();
    const total =
      (result!.b1000 ?? 0) * 1000 +
      (result!.b500 ?? 0) * 500 +
      (result!.b3 ?? 0) * 3 +
      (result!.b1 ?? 0) * 1;
    expect(total).toBe(1_234_567);
  });
});

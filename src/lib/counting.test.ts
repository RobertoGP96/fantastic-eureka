import { describe, expect, it } from "vitest";
import {
  clampQty,
  countedPieces,
  countedTotalMinor,
  MAX_QTY,
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

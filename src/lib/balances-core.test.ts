import { describe, expect, it } from "vitest";
import {
  balancesFromGroups,
  consolidatedTotalMinor,
  signedKindMinor,
  totalsByCurrency,
} from "./balances-core";

describe("totalsByCurrency", () => {
  const cup = { id: "cup" };
  const usd = { id: "usd" };

  it("agrupa saldos por moneda conservando el orden de aparición", () => {
    const totals = totalsByCurrency([
      { balanceMinor: 4000, currency: cup },
      { balanceMinor: 250, currency: usd },
      { balanceMinor: -1500, currency: cup },
    ]);
    expect(totals).toEqual([
      { currency: cup, totalMinor: 2500 },
      { currency: usd, totalMinor: 250 },
    ]);
  });

  it("sin cuentas devuelve lista vacía", () => {
    expect(totalsByCurrency([])).toEqual([]);
  });
});

describe("consolidatedTotalMinor", () => {
  const cup = { id: "cup", code: "CUP", decimalPlaces: 0 };
  const usd = { id: "usd", code: "USD", decimalPlaces: 2 };
  const mlc = { id: "mlc", code: "MLC", decimalPlaces: 2 };
  // 1 USD = 400 CUP (tasa ×10 000).
  const rates = new Map([["usd", { rateScaled: 4_000_000 }]]);

  it("suma directo las cuentas en la moneda base", () => {
    expect(
      consolidatedTotalMinor(
        [
          { balanceMinor: 4000, currency: cup },
          { balanceMinor: -1500, currency: cup },
        ],
        cup,
        new Map()
      )
    ).toEqual({ totalMinor: 2500, complete: true, missing: [] });
  });

  it("convierte las demás monedas con su tasa (distintos decimales)", () => {
    // 250.50 USD × 400 = 100 200 CUP.
    expect(
      consolidatedTotalMinor(
        [
          { balanceMinor: 1000, currency: cup },
          { balanceMinor: 25050, currency: usd },
        ],
        cup,
        rates
      )
    ).toEqual({ totalMinor: 101_200, complete: true, missing: [] });
  });

  it("sin tasa y con saldo: queda incompleto y reporta el código una vez", () => {
    const total = consolidatedTotalMinor(
      [
        { balanceMinor: 1000, currency: cup },
        { balanceMinor: 500, currency: mlc },
        { balanceMinor: 700, currency: mlc },
      ],
      cup,
      rates
    );
    expect(total).toEqual({ totalMinor: 1000, complete: false, missing: ["MLC"] });
  });

  it("sin tasa pero con saldo 0 no estorba", () => {
    expect(
      consolidatedTotalMinor(
        [
          { balanceMinor: 1000, currency: cup },
          { balanceMinor: 0, currency: mlc },
        ],
        cup,
        rates
      )
    ).toEqual({ totalMinor: 1000, complete: true, missing: [] });
  });

  it("admite saldos negativos convertidos y lista vacía", () => {
    expect(
      consolidatedTotalMinor([{ balanceMinor: -100, currency: usd }], cup, rates)
    ).toEqual({ totalMinor: -400, complete: true, missing: [] });
    expect(consolidatedTotalMinor([], cup, rates)).toEqual({
      totalMinor: 0,
      complete: true,
      missing: [],
    });
  });
});

describe("signedKindMinor", () => {
  it("suma INCOME y resta EXPENSE/TRANSFER", () => {
    expect(signedKindMinor("INCOME", 5000)).toBe(5000);
    expect(signedKindMinor("EXPENSE", 3000)).toBe(-3000);
    expect(signedKindMinor("TRANSFER", 1200)).toBe(-1200);
  });

  it("ADJUSTMENT conserva su signo (puede ser negativo)", () => {
    expect(signedKindMinor("ADJUSTMENT", 700)).toBe(700);
    expect(signedKindMinor("ADJUSTMENT", -700)).toBe(-700);
  });

  it("lanza con un kind desconocido (no corromper saldos en silencio)", () => {
    expect(() => signedKindMinor("LOAN", 100)).toThrow(/desconocido/i);
  });
});

describe("balancesFromGroups", () => {
  it("combina sumas propias por kind y transferencias entrantes", () => {
    const balances = balancesFromGroups(
      [
        { accountId: "a1", kind: "INCOME", sumMinor: 10000 },
        { accountId: "a1", kind: "EXPENSE", sumMinor: 4000 },
        { accountId: "a1", kind: "TRANSFER", sumMinor: 1000 },
        { accountId: "a2", kind: "ADJUSTMENT", sumMinor: -500 },
      ],
      [{ accountId: "a2", sumMinor: 2500 }]
    );
    // a1: 10000 − 4000 − 1000 = 5000
    expect(balances.get("a1")).toBe(5000);
    // a2: −500 + 2500 entrantes = 2000
    expect(balances.get("a2")).toBe(2000);
  });

  it("incluye cuentas que solo reciben transferencias", () => {
    const balances = balancesFromGroups(
      [],
      [{ accountId: "destino", sumMinor: 800 }]
    );
    expect(balances.get("destino")).toBe(800);
  });

  it("devuelve mapa vacío sin datos y no inventa cuentas", () => {
    const balances = balancesFromGroups([], []);
    expect(balances.size).toBe(0);
  });

  it("propaga el error de un kind desconocido", () => {
    expect(() =>
      balancesFromGroups(
        [{ accountId: "a1", kind: "WAT", sumMinor: 1 }],
        []
      )
    ).toThrow(/desconocido/i);
  });
});

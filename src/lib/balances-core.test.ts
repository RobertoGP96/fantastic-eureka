import { describe, expect, it } from "vitest";
import { balancesFromGroups, signedKindMinor } from "./balances-core";

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

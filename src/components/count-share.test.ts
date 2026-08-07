import { describe, expect, it } from "vitest";
import { buildCountShareText } from "./count-share";

const CUP = { code: "CUP", decimalPlaces: 2 };

const denominations = [
  { id: "b500", valueMinor: 50000, kind: "BILL" },
  { id: "b100", valueMinor: 10000, kind: "BILL" },
  { id: "c100", valueMinor: 100, kind: "COIN" },
];

describe("buildCountShareText", () => {
  it("lista solo las denominaciones contadas, con subtotal y total", () => {
    const text = buildCountShareText(
      denominations,
      { b500: 4, b100: 0, c100: 3 },
      CUP
    );
    expect(text).toBe(
      [
        "Conteo de efectivo · CUP",
        "500 CUP (Billete) × 4 = 2 000 CUP",
        "1 CUP (Moneda) × 3 = 3 CUP",
        "Total: 2 003 CUP · 7 piezas",
      ].join("\n")
    );
  });

  it("con una sola pieza usa el singular", () => {
    const text = buildCountShareText(denominations, { b100: 1 }, CUP);
    expect(text).toContain("Total: 100 CUP · 1 pieza");
  });
});

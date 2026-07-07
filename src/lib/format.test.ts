import { describe, expect, it } from "vitest";
import {
  fmtMinor,
  fmtRate,
  fmtSignedMinor,
  normalizeText,
} from "@/lib/format";

const CUP = { code: "CUP", decimalPlaces: 0 };
const USD = { code: "USD", decimalPlaces: 2 };

describe("fmtMinor", () => {
  it("separa miles con espacio y pone el código al final", () => {
    expect(fmtMinor(4750, CUP)).toBe("4 750 CUP");
    expect(fmtMinor(1234567, CUP)).toBe("1 234 567 CUP");
  });

  it("omite decimales cuando son todo ceros", () => {
    expect(fmtMinor(25000, USD)).toBe("250 USD");
  });

  it("muestra decimales cuando existen", () => {
    expect(fmtMinor(25050, USD)).toBe("250.50 USD");
    expect(fmtMinor(1, USD)).toBe("0.01 USD");
  });

  it("maneja negativos", () => {
    expect(fmtMinor(-4750, CUP)).toBe("-4 750 CUP");
    expect(fmtMinor(-1250, USD)).toBe("-12.50 USD");
  });

  it("maneja cero", () => {
    expect(fmtMinor(0, CUP)).toBe("0 CUP");
    expect(fmtMinor(0, USD)).toBe("0 USD");
  });
});

describe("fmtSignedMinor", () => {
  it("antepone + a los positivos", () => {
    expect(fmtSignedMinor(4750, CUP)).toBe("+4 750 CUP");
    expect(fmtSignedMinor(-4750, CUP)).toBe("-4 750 CUP");
    expect(fmtSignedMinor(0, CUP)).toBe("0 CUP");
  });
});

describe("fmtRate", () => {
  it("recorta ceros finales", () => {
    expect(fmtRate(4_355_000)).toBe("435.5");
    expect(fmtRate(4_350_000)).toBe("435");
  });

  it("conserva decimales significativos", () => {
    expect(fmtRate(10842)).toBe("1.0842");
    expect(fmtRate(23)).toBe("0.0023");
  });

  it("separa miles en la parte entera", () => {
    expect(fmtRate(12_345_678_900)).toBe("1 234 567.89");
  });
});

describe("normalizeText", () => {
  it("quita acentos y pasa a minúsculas", () => {
    expect(normalizeText("Pérez")).toBe("perez");
    expect(normalizeText("Alimentación")).toBe("alimentacion");
  });
});

import { describe, expect, it } from "vitest";
import {
  composeRatesScaled,
  convertMinor,
  crossRateScaled,
  invertRateScaled,
  parseAmountToMinor,
  pow10,
  RATE_SCALE,
  sumMinor,
} from "@/lib/money";

const CUP = { decimalPlaces: 0 };
const USD = { decimalPlaces: 2 };

describe("parseAmountToMinor", () => {
  it("convierte enteros con 2 decimales", () => {
    expect(parseAmountToMinor("1234.56", USD)).toBe(123456);
  });

  it("convierte enteros con 0 decimales", () => {
    expect(parseAmountToMinor("4750", CUP)).toBe(4750);
  });

  it("acepta coma decimal y espacios de miles", () => {
    expect(parseAmountToMinor("1 234,56", USD)).toBe(123456);
  });

  it("rellena decimales faltantes", () => {
    expect(parseAmountToMinor("12.5", USD)).toBe(1250);
    expect(parseAmountToMinor("12", USD)).toBe(1200);
  });

  it("redondea half-up los decimales sobrantes", () => {
    expect(parseAmountToMinor("12.345", USD)).toBe(1235);
    expect(parseAmountToMinor("12.344", USD)).toBe(1234);
    expect(parseAmountToMinor("99.9", CUP)).toBe(100);
    expect(parseAmountToMinor("99.4", CUP)).toBe(99);
  });

  it("acepta negativos", () => {
    expect(parseAmountToMinor("-12.50", USD)).toBe(-1250);
  });

  it("rechaza formatos inválidos", () => {
    expect(() => parseAmountToMinor("", USD)).toThrow();
    expect(() => parseAmountToMinor("abc", USD)).toThrow();
    expect(() => parseAmountToMinor("12.34.56", USD)).toThrow();
    expect(() => parseAmountToMinor("12,34,56", USD)).toThrow();
  });
});

describe("convertMinor", () => {
  it("convierte USD a CUP (tasa 435.5)", () => {
    // 100.00 USD × 435.5 = 43 550 CUP
    expect(convertMinor(10000, USD, CUP, 4_355_000)).toBe(43550);
  });

  it("convierte CUP a USD (tasa 1/435.5 ≈ 0.0023)", () => {
    // 43 550 CUP × 0.0023 = 100.17 USD
    expect(convertMinor(43550, CUP, USD, 23)).toBe(10017);
  });

  it("convierte entre monedas de igual decimales", () => {
    // 100.00 USD × 0.92 = 92.00 EUR
    expect(convertMinor(10000, USD, { decimalPlaces: 2 }, 9200)).toBe(9200);
  });

  it("redondea half-up", () => {
    // 1 CUP × 0.0023 USD = 0.0023 → 0.00 USD
    expect(convertMinor(1, CUP, USD, 23)).toBe(0);
    // 3 CUP × 0.0023 = 0.0069 → 0.01 USD
    expect(convertMinor(3, CUP, USD, 23)).toBe(1);
  });

  it("maneja montos negativos (ajustes)", () => {
    expect(convertMinor(-10000, USD, CUP, 4_355_000)).toBe(-43550);
  });

  it("rechaza tasas inválidas", () => {
    expect(() => convertMinor(100, USD, CUP, 0)).toThrow();
    expect(() => convertMinor(100, USD, CUP, -5)).toThrow();
    expect(() => convertMinor(100, USD, CUP, 1.5)).toThrow();
  });
});

describe("crossRateScaled", () => {
  it("deriva la tasa entre dos monedas vía la base", () => {
    // USD→CUP = 435.5, EUR→CUP = 470 ⇒ USD→EUR = 435.5/470 ≈ 0.9266
    expect(crossRateScaled(4_355_000, 4_700_000)).toBe(9266);
  });

  it("es identidad contra sí misma", () => {
    expect(crossRateScaled(4_355_000, 4_355_000)).toBe(RATE_SCALE);
  });

  it("rechaza tasas no positivas", () => {
    expect(() => crossRateScaled(0, 100)).toThrow();
    expect(() => crossRateScaled(100, 0)).toThrow();
  });
});

describe("invertRateScaled", () => {
  it("invierte tasas (USD→CUP 435.5 ⇒ CUP→USD 0.0023)", () => {
    expect(invertRateScaled(4_355_000)).toBe(23);
    // y viceversa, recuperando ≈434.78 (precisión de 4 decimales)
    expect(invertRateScaled(23)).toBe(4_347_826);
  });

  it("la identidad se invierte a sí misma", () => {
    expect(invertRateScaled(RATE_SCALE)).toBe(RATE_SCALE);
  });

  it("rechaza tasas no positivas o no enteras", () => {
    expect(() => invertRateScaled(0)).toThrow();
    expect(() => invertRateScaled(-3)).toThrow();
    expect(() => invertRateScaled(1.5)).toThrow();
  });
});

describe("composeRatesScaled", () => {
  it("compone EUR→USD ∘ USD→CUP = EUR→CUP", () => {
    // 1 EUR = 1.08 USD; 1 USD = 435.5 CUP ⇒ 1 EUR = 470.34 CUP
    expect(composeRatesScaled(10_800, 4_355_000)).toBe(4_703_400);
  });

  it("componer con la identidad no cambia la tasa", () => {
    expect(composeRatesScaled(4_355_000, RATE_SCALE)).toBe(4_355_000);
    expect(composeRatesScaled(RATE_SCALE, 4_355_000)).toBe(4_355_000);
  });

  it("rechaza tasas no positivas", () => {
    expect(() => composeRatesScaled(0, 100)).toThrow();
    expect(() => composeRatesScaled(100, -1)).toThrow();
  });
});

describe("sumMinor / pow10", () => {
  it("suma listas de montos", () => {
    expect(sumMinor([100, 250, -50])).toBe(300);
    expect(sumMinor([])).toBe(0);
  });

  it("pow10 cubre el rango soportado", () => {
    expect(pow10(0)).toBe(1);
    expect(pow10(2)).toBe(100);
    expect(() => pow10(9)).toThrow();
  });
});

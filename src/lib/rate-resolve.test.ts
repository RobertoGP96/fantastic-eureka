import { describe, expect, it } from "vitest";
import { buildPairMap, resolveRateScaled } from "@/lib/rate-resolve";
import { RATE_SCALE } from "@/lib/money";

// Pares registrados: EUR→CUP 470 y USD→CUP 435.5 (CUP es la base).
const map = buildPairMap([
  { fromId: "eur", toId: "cup", rateScaled: 4_700_000 },
  { fromId: "usd", toId: "cup", rateScaled: 4_355_000 },
]);

describe("resolveRateScaled", () => {
  it("misma moneda ⇒ identidad", () => {
    expect(resolveRateScaled(map, "cup", "cup", "cup")).toBe(RATE_SCALE);
  });

  it("usa el par directo", () => {
    expect(resolveRateScaled(map, "eur", "cup", "cup")).toBe(4_700_000);
  });

  it("resuelve el par inverso automáticamente", () => {
    // CUP→EUR = 1/470 ≈ 0.0021
    expect(resolveRateScaled(map, "cup", "eur", "cup")).toBe(21);
  });

  it("compone vía la moneda base cuando no hay par directo ni inverso", () => {
    // USD→EUR = (USD→CUP) ∘ (CUP→EUR) = 435.5 × 0.0021 ≈ 0.9146
    expect(resolveRateScaled(map, "usd", "eur", "cup")).toBe(9146);
  });

  it("devuelve null si no hay camino registrado", () => {
    expect(resolveRateScaled(map, "usd", "mlc", "cup")).toBeNull();
    expect(resolveRateScaled(map, "usd", "eur", null)).toBeNull();
  });
});

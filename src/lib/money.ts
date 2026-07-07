// Aritmética monetaria en enteros: montos en unidades menores (centavos)
// y tasas escaladas ×RATE_SCALE. Nunca floats para dinero.

export const RATE_SCALE = 10_000;

/** Máximo de una columna Int de Prisma (4 bytes con signo). */
export const PRISMA_INT_MAX = 2_147_483_647;

export interface MinorCurrency {
  decimalPlaces: number;
}

const POW10 = [1, 10, 100, 1_000, 10_000, 100_000, 1_000_000];

export function pow10(n: number): number {
  const value = POW10[n];
  if (value === undefined) throw new Error(`Exponente fuera de rango: ${n}`);
  return value;
}

/**
 * Convierte el texto de un input ("1234.56", "1 234,56") a unidades menores.
 * Redondea half-up los decimales sobrantes. Lanza Error si el formato es inválido.
 */
export function parseAmountToMinor(
  input: string,
  currency: MinorCurrency
): number {
  const raw = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(raw)) throw new Error("Monto inválido");

  const negative = raw.startsWith("-");
  const [intPart, decPart = ""] = raw.replace("-", "").split(".");
  const dec = currency.decimalPlaces;

  const decKept = (decPart + "0".repeat(dec)).slice(0, dec);
  const decExtra = decPart.slice(dec);

  let minor = Number(intPart) * pow10(dec) + (dec > 0 ? Number(decKept) : 0);
  if (decExtra && Number(decExtra[0]) >= 5) minor += 1;

  if (!Number.isSafeInteger(minor)) throw new Error("Monto demasiado grande");
  return negative ? -minor : minor;
}

export function sumMinor(values: number[]): number {
  const total = values.reduce((acc, v) => acc + v, 0);
  if (!Number.isSafeInteger(total)) throw new Error("Suma fuera de rango");
  return total;
}

/**
 * Convierte un monto entre monedas.
 * rateScaled = unidades de la moneda destino por 1 unidad de la de origen, ×RATE_SCALE.
 * Usa BigInt internamente para no perder precisión; redondeo half-up.
 */
export function convertMinor(
  amountMinor: number,
  from: MinorCurrency,
  to: MinorCurrency,
  rateScaled: number
): number {
  if (!Number.isInteger(rateScaled) || rateScaled <= 0) {
    throw new Error("Tasa inválida");
  }
  const numerator =
    BigInt(amountMinor) * BigInt(rateScaled) * BigInt(pow10(to.decimalPlaces));
  const denominator = BigInt(RATE_SCALE) * BigInt(pow10(from.decimalPlaces));
  const half = numerator < 0n ? -(denominator / 2n) : denominator / 2n;
  const result = Number((numerator + half) / denominator);
  if (!Number.isSafeInteger(result)) throw new Error("Conversión fuera de rango");
  return result;
}

/**
 * Tasa X→Y derivada de las tasas de X e Y contra la moneda base.
 * Ej.: USD→EUR = tasa(USD→base) / tasa(EUR→base).
 */
export function crossRateScaled(
  rateXtoBaseScaled: number,
  rateYtoBaseScaled: number
): number {
  if (rateXtoBaseScaled <= 0 || rateYtoBaseScaled <= 0) {
    throw new Error("Tasa inválida");
  }
  const result = Math.round(
    (rateXtoBaseScaled * RATE_SCALE) / rateYtoBaseScaled
  );
  if (result <= 0 || !Number.isSafeInteger(result)) {
    throw new Error("Tasa resultante fuera de rango");
  }
  return result;
}

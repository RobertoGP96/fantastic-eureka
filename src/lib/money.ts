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

/**
 * Convierte unidades menores a texto editable para un input ("1234.5"),
 * sin separadores de miles y sin ceros decimales sobrantes.
 */
export function minorToAmountInput(
  valueMinor: number,
  currency: MinorCurrency
): string {
  const dec = currency.decimalPlaces;
  const negative = valueMinor < 0;
  const abs = Math.abs(valueMinor);
  const intPart = Math.floor(abs / pow10(dec));
  const frac =
    dec > 0
      ? String(abs % pow10(dec))
          .padStart(dec, "0")
          .replace(/0+$/, "")
      : "";
  const result = frac ? `${intPart}.${frac}` : String(intPart);
  return negative ? `-${result}` : result;
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
 * Convierte un monto entre monedas con la tasa citada en sentido INVERSO
 * (unidades de `from` por 1 unidad de `to`, ×RATE_SCALE). Divide con BigInt
 * en vez de invertir la tasa, para no perder precisión.
 */
export function convertMinorInverse(
  amountMinor: number,
  from: MinorCurrency,
  to: MinorCurrency,
  rateScaled: number
): number {
  if (!Number.isInteger(rateScaled) || rateScaled <= 0) {
    throw new Error("Tasa inválida");
  }
  const numerator =
    BigInt(amountMinor) * BigInt(RATE_SCALE) * BigInt(pow10(to.decimalPlaces));
  const denominator = BigInt(rateScaled) * BigInt(pow10(from.decimalPlaces));
  const half = numerator < 0n ? -(denominator / 2n) : denominator / 2n;
  const result = Number((numerator + half) / denominator);
  if (!Number.isSafeInteger(result)) throw new Error("Conversión fuera de rango");
  return result;
}

/**
 * Tasa implícita entre dos montos ya conocidos: unidades de la moneda de
 * `counterMinor` por 1 unidad de la de `amountMinor`, ×RATE_SCALE. Solo
 * informativa; devuelve null si no cabe en un Int de Prisma o queda en 0.
 */
export function impliedRateScaled(
  amountMinor: number,
  from: MinorCurrency,
  counterMinor: number,
  to: MinorCurrency
): number | null {
  if (amountMinor <= 0 || counterMinor <= 0) return null;
  const numerator =
    BigInt(counterMinor) * BigInt(RATE_SCALE) * BigInt(pow10(from.decimalPlaces));
  const denominator = BigInt(amountMinor) * BigInt(pow10(to.decimalPlaces));
  const implied = Number((numerator + denominator / 2n) / denominator);
  return implied >= 1 && implied <= PRISMA_INT_MAX ? implied : null;
}

/** Invierte una tasa: X→Y escalada ⇒ Y→X escalada (1e8 / tasa, half-up). */
export function invertRateScaled(rateScaled: number): number {
  if (!Number.isInteger(rateScaled) || rateScaled <= 0) {
    throw new Error("Tasa inválida");
  }
  const result = Math.round((RATE_SCALE * RATE_SCALE) / rateScaled);
  if (result <= 0) throw new Error("Tasa resultante fuera de rango");
  return result;
}

/** Compone tasas escaladas: a (X→Y) ∘ b (Y→Z) ⇒ X→Z. BigInt, half-up. */
export function composeRatesScaled(aScaled: number, bScaled: number): number {
  if (aScaled <= 0 || bScaled <= 0) throw new Error("Tasa inválida");
  const result = Number(
    (BigInt(aScaled) * BigInt(bScaled) + BigInt(RATE_SCALE / 2)) /
      BigInt(RATE_SCALE)
  );
  if (result <= 0 || !Number.isSafeInteger(result)) {
    throw new Error("Tasa resultante fuera de rango");
  }
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

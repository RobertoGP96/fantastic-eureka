import { pow10, RATE_SCALE } from "@/lib/money";

export interface DisplayCurrency {
  code: string;
  decimalPlaces: number;
}

// Miles con espacio + código (ej. "4 750 CUP"), igual que la tienda: evita el
// ambiguo "$" solo. Los decimales se omiten solo cuando son todo ceros
// ("250 CUP", nunca "250.00 CUP"; "250.50 USD" sí se muestra).
export function fmtMinor(minor: number, currency: DisplayCurrency): string {
  const dec = currency.decimalPlaces;
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const base = pow10(dec);

  const intPart = Math.trunc(abs / base).toString();
  const decValue = abs % base;
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const amount =
    dec > 0 && decValue !== 0
      ? `${withThousands}.${decValue.toString().padStart(dec, "0")}`
      : withThousands;

  return `${negative ? "-" : ""}${amount} ${currency.code}`;
}

/** Como fmtMinor pero con "+" explícito para montos positivos (historiales). */
export function fmtSignedMinor(
  minor: number,
  currency: DisplayCurrency
): string {
  return `${minor > 0 ? "+" : ""}${fmtMinor(minor, currency)}`;
}

/** Tasa escalada → texto ("435.5", "1.0842"); recorta ceros finales. */
export function fmtRate(rateScaled: number): string {
  const intPart = Math.trunc(rateScaled / RATE_SCALE).toString();
  const frac = (rateScaled % RATE_SCALE)
    .toString()
    .padStart(4, "0")
    .replace(/0+$/, "");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return frac ? `${withThousands}.${frac}` : withThousands;
}

/** Entero menor → texto para inputs ("12.50", "4750"); sin separador de miles. */
export function minorToInput(minor: number, decimalPlaces: number): string {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const base = pow10(decimalPlaces);
  const intPart = Math.trunc(abs / base).toString();
  const decValue = abs % base;
  const text =
    decimalPlaces > 0 && decValue !== 0
      ? `${intPart}.${decValue.toString().padStart(decimalPlaces, "0")}`
      : intPart;
  return negative ? `-${text}` : text;
}

// Rango de combinantes diacríticos vía constructor: un literal /\p{Diacritic}/u
// es SyntaxError al parsear el bundle en WebViews/Safari viejos y tumba toda la app.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

/** Normaliza para búsqueda: minúsculas y sin acentos ("perez" encuentra "Pérez"). */
export function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

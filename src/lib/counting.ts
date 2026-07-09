// Lógica pura del conteo de efectivo por denominaciones (arqueo y
// calculadora). Sin dependencias de React ni Prisma para poder testearla.

export interface CountableDenomination {
  id: string;
  valueMinor: number;
}

/** Tope defensivo de piezas por denominación (evita overflow del subtotal). */
export const MAX_QTY = 1_000_000;

/** Normaliza una cantidad de piezas: entero, sin negativos, con tope. */
export function clampQty(value: number): number {
  return Math.max(0, Math.min(MAX_QTY, Math.trunc(value) || 0));
}

/** Total contado en unidades menores: Σ valor × cantidad. */
export function countedTotalMinor(
  denominations: readonly CountableDenomination[],
  quantities: Readonly<Record<string, number>>
): number {
  return denominations.reduce(
    (acc, d) => acc + d.valueMinor * (quantities[d.id] ?? 0),
    0
  );
}

/** Número total de piezas (billetes + monedas) contadas. */
export function countedPieces(
  quantities: Readonly<Record<string, number>>
): number {
  return Object.values(quantities).reduce((acc, qty) => acc + qty, 0);
}

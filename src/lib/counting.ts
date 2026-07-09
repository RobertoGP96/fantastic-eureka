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

/**
 * Signo del desglose de denominaciones de un movimiento respecto a UNA caja:
 * +1 entra (INCOME, destino de TRANSFER), −1 sale (EXPENSE, origen de
 * TRANSFER), 0 sin desglose (ADJUSTMENT los repone el propio arqueo).
 */
export function movementLineSign(
  kind: string,
  isOrigin: boolean
): 1 | -1 | 0 {
  if (kind === "INCOME") return 1;
  if (kind === "EXPENSE") return -1;
  if (kind === "TRANSFER") return isOrigin ? -1 : 1;
  return 0;
}

export interface SuggestibleDenomination {
  id: string;
  valueMinor: number;
  /** Tope de piezas (stock al sacar dinero); undefined = sin límite. */
  available?: number;
}

// Presupuesto de pasos del backtracking: corta combinaciones patológicas
// sin bloquear el hilo (con denominaciones reales sobra de largo).
const SUGGEST_MAX_STEPS = 200_000;

/**
 * Sugiere un desglose exacto de `targetMinor` con las denominaciones dadas,
 * mayor-primero con backtracking (cubre sistemas no canónicos como el
 * billete de 3 CUP) y memoización de estados fallidos. Devuelve id→cantidad
 * (solo > 0), {} para monto 0 y null si no existe combinación exacta.
 */
export function suggestDistribution(
  denominations: readonly SuggestibleDenomination[],
  targetMinor: number
): Record<string, number> | null {
  if (targetMinor < 0 || !Number.isInteger(targetMinor)) return null;
  if (targetMinor === 0) return {};

  const sorted = denominations
    .filter((d) => d.valueMinor > 0 && (d.available ?? 1) > 0)
    .slice()
    .sort((a, b) => b.valueMinor - a.valueMinor);

  const failed = new Set<string>();
  let steps = 0;

  const solve = (
    index: number,
    remaining: number
  ): Record<string, number> | null => {
    if (remaining === 0) return {};
    if (index >= sorted.length) return null;
    if (steps++ > SUGGEST_MAX_STEPS) return null;

    const key = `${index}:${remaining}`;
    if (failed.has(key)) return null;

    const { id, valueMinor, available } = sorted[index];
    const maxQty = Math.min(
      Math.floor(remaining / valueMinor),
      available ?? Number.MAX_SAFE_INTEGER
    );
    for (let qty = maxQty; qty >= 0; qty--) {
      const rest = solve(index + 1, remaining - qty * valueMinor);
      if (rest !== null) {
        return qty > 0 ? { ...rest, [id]: qty } : rest;
      }
    }

    failed.add(key);
    return null;
  };

  return solve(0, targetMinor);
}

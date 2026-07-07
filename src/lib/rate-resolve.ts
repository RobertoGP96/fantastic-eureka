// Resolución pura de tasas por pares (usable en cliente y servidor):
// 1) par directo, 2) par inverso, 3) composición vía la moneda base.
import {
  composeRatesScaled,
  invertRateScaled,
  RATE_SCALE,
} from "@/lib/money";

export interface PairRateLite {
  fromId: string;
  toId: string;
  rateScaled: number;
}

export function pairKey(fromId: string, toId: string): string {
  return `${fromId}→${toId}`;
}

export function buildPairMap(pairs: PairRateLite[]): Map<string, number> {
  return new Map(pairs.map((p) => [pairKey(p.fromId, p.toId), p.rateScaled]));
}

function directOrInverse(
  map: Map<string, number>,
  fromId: string,
  toId: string
): number | null {
  const direct = map.get(pairKey(fromId, toId));
  if (direct !== undefined) return direct;
  const inverse = map.get(pairKey(toId, fromId));
  if (inverse !== undefined) {
    try {
      return invertRateScaled(inverse);
    } catch {
      return null;
    }
  }
  return null;
}

/** Tasa from→to escalada, o null si no hay camino registrado. */
export function resolveRateScaled(
  map: Map<string, number>,
  fromId: string,
  toId: string,
  baseId?: string | null
): number | null {
  if (fromId === toId) return RATE_SCALE;

  const simple = directOrInverse(map, fromId, toId);
  if (simple !== null) return simple;

  if (baseId && baseId !== fromId && baseId !== toId) {
    const toBase = directOrInverse(map, fromId, baseId);
    const fromBase = directOrInverse(map, baseId, toId);
    if (toBase !== null && fromBase !== null) {
      try {
        return composeRatesScaled(toBase, fromBase);
      } catch {
        return null;
      }
    }
  }

  return null;
}

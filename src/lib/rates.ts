import "server-only";

import { prisma } from "@/lib/db";
import { invertRateScaled } from "@/lib/money";
import { pairKey } from "@/lib/rate-resolve";

export interface PairRate {
  rateScaled: number;
  effectiveAt: Date;
}

/** Última tasa vigente por PAR (clave `fromId→toId`). */
export async function latestPairRates(): Promise<Map<string, PairRate>> {
  const rates = await prisma.exchangeRate.findMany({
    orderBy: { effectiveAt: "desc" },
  });
  const latest = new Map<string, PairRate>();
  for (const rate of rates) {
    const key = pairKey(rate.fromCurrencyId, rate.toCurrencyId);
    if (!latest.has(key)) {
      latest.set(key, {
        rateScaled: rate.rateScaled,
        effectiveAt: rate.effectiveAt,
      });
    }
  }
  return latest;
}

/** Tasa from→to con fecha, usando par directo o el inverso. */
export function resolvePairRate(
  pairs: Map<string, PairRate>,
  fromId: string,
  toId: string
): PairRate | null {
  const direct = pairs.get(pairKey(fromId, toId));
  if (direct) return direct;
  const inverse = pairs.get(pairKey(toId, fromId));
  if (inverse) {
    try {
      return {
        rateScaled: invertRateScaled(inverse.rateScaled),
        effectiveAt: inverse.effectiveAt,
      };
    } catch {
      return null;
    }
  }
  return null;
}

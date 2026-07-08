import "server-only";

import { prisma } from "@/lib/db";
import { invertRateScaled } from "@/lib/money";
import { pairKey, type PairRateLite } from "@/lib/rate-resolve";

export interface PairRate {
  rateScaled: number;
  effectiveAt: Date;
}

/**
 * Serie histórica completa por PAR (clave `fromId→toId`), en orden
 * cronológico ascendente y con una sola consulta. El último elemento de
 * cada serie es la tasa vigente del par.
 */
export async function pairRateSeries(
  userId: string
): Promise<Map<string, PairRate[]>> {
  const rates = await prisma.exchangeRate.findMany({
    where: { userId },
    orderBy: { effectiveAt: "asc" },
  });
  const series = new Map<string, PairRate[]>();
  for (const rate of rates) {
    const key = pairKey(rate.fromCurrencyId, rate.toCurrencyId);
    const point: PairRate = {
      rateScaled: rate.rateScaled,
      effectiveAt: rate.effectiveAt,
    };
    const list = series.get(key);
    if (list) {
      list.push(point);
    } else {
      series.set(key, [point]);
    }
  }
  return series;
}

/** Última tasa vigente por PAR (clave `fromId→toId`). */
export async function latestPairRates(
  userId: string
): Promise<Map<string, PairRate>> {
  const rates = await prisma.exchangeRate.findMany({
    where: { userId },
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

/**
 * Última tasa vigente por PAR en formato plano y serializable, para pasarla
 * a componentes cliente que resuelven con `rate-resolve`.
 */
export async function latestPairRatesLite(
  userId: string
): Promise<PairRateLite[]> {
  const rates = await prisma.exchangeRate.findMany({
    where: { userId },
    orderBy: { effectiveAt: "desc" },
    select: { fromCurrencyId: true, toCurrencyId: true, rateScaled: true },
  });
  const seen = new Set<string>();
  const latest: PairRateLite[] = [];
  for (const rate of rates) {
    const key = pairKey(rate.fromCurrencyId, rate.toCurrencyId);
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push({
      fromId: rate.fromCurrencyId,
      toId: rate.toCurrencyId,
      rateScaled: rate.rateScaled,
    });
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

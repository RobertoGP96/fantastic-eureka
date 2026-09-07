// Actividad de UNA cuenta a partir de su libro mayor (puro, sin Prisma):
// cada movimiento aporta un delta con signo desde la perspectiva de la cuenta
// (lado propio vía signedKindMinor; transferencia entrante vía
// counterAmountMinor, que ya viene en la moneda de la cuenta destino) y los
// deltas se agrupan por día/semana/mes para el gráfico de barras del detalle.

import { signedKindMinor } from "@/lib/balances-core";

export interface AccountLedgerEntry {
  accountId: string;
  counterAccountId: string | null;
  kind: string;
  amountMinor: number;
  counterAmountMinor: number | null;
  occurredAt: Date;
}

export interface ActivityDelta {
  /** occurredAt en epoch ms (serializable de servidor a cliente). */
  t: number;
  /** Cambio que el movimiento produce en el saldo de la cuenta (con signo). */
  deltaMinor: number;
}

/** Delta con signo de un movimiento desde la perspectiva de `accountId`. */
export function accountDeltaMinor(
  accountId: string,
  entry: AccountLedgerEntry
): number {
  if (entry.accountId === accountId) {
    return signedKindMinor(entry.kind, entry.amountMinor);
  }
  if (entry.counterAccountId === accountId && entry.kind === "TRANSFER") {
    return entry.counterAmountMinor ?? 0;
  }
  return 0;
}

/** Deltas cronológicos de la cuenta; omite movimientos que no la afectan. */
export function activityDeltas(
  accountId: string,
  entries: readonly AccountLedgerEntry[]
): ActivityDelta[] {
  const deltas: ActivityDelta[] = [];
  for (const entry of entries) {
    const deltaMinor = accountDeltaMinor(accountId, entry);
    if (deltaMinor === 0) continue;
    deltas.push({ t: entry.occurredAt.getTime(), deltaMinor });
  }
  return deltas;
}

export type ActivityGranularity = "day" | "week" | "month";

export interface ActivityBucket {
  /** Inicio del bucket en epoch ms (calendario local). */
  startT: number;
  /** Inicio del bucket siguiente (fin exclusivo). */
  endT: number;
  /** Suma de deltas positivos (entradas). */
  inMinor: number;
  /** Suma de |deltas negativos| (salidas), siempre ≥ 0. */
  outMinor: number;
}

// Aritmética de calendario local (no ms fijos: sobrevive cambios de hora).

export function startOfDay(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Lunes como inicio de semana (convención es-ES). */
export function startOfWeek(t: number): number {
  const d = new Date(t);
  const sinceMonday = (d.getDay() + 6) % 7;
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() - sinceMonday
  ).getTime();
}

export function startOfMonth(t: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export function addDays(t: number, days: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days).getTime();
}

export function addMonths(t: number, months: number): number {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + months, 1).getTime();
}

/**
 * Bordes de buckets (ascendentes, n+1 para n buckets) desde `fromT` — que
 * debe venir ya alineado al calendario — hasta cubrir `toT`.
 */
export function bucketRange(
  fromT: number,
  toT: number,
  granularity: ActivityGranularity
): number[] {
  const edges: number[] = [fromT];
  let cursor = fromT;
  while (cursor <= toT) {
    cursor =
      granularity === "month"
        ? addMonths(cursor, 1)
        : addDays(cursor, granularity === "week" ? 7 : 1);
    edges.push(cursor);
  }
  return edges;
}

/** Suma entradas/salidas por bucket; los deltas fuera del rango se ignoran. */
export function aggregateActivity(
  deltas: readonly ActivityDelta[],
  edges: readonly number[]
): ActivityBucket[] {
  const buckets: ActivityBucket[] = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    buckets.push({ startT: edges[i], endT: edges[i + 1], inMinor: 0, outMinor: 0 });
  }
  if (buckets.length === 0) return buckets;

  for (const delta of deltas) {
    if (delta.t < edges[0] || delta.t >= edges[edges.length - 1]) continue;
    // Búsqueda binaria del último borde ≤ t.
    let lo = 0;
    let hi = buckets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (edges[mid] <= delta.t) lo = mid;
      else hi = mid - 1;
    }
    const bucket = buckets[lo];
    if (delta.deltaMinor >= 0) bucket.inMinor += delta.deltaMinor;
    else bucket.outMinor += -delta.deltaMinor;
  }
  return buckets;
}

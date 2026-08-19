// Lógica pura de mensualidades (planes de cuotas): equivalencia mensual entre
// frecuencias, urgencia de vencimiento y compromiso por moneda.
// Sin Prisma ni React — se testea en plans-core.test.ts.

import type { Frequency } from "@/lib/domain";

/** Repeticiones al año de cada frecuencia. ONCE no es recurrente. */
const PER_YEAR: Record<Frequency, number> = {
  ONCE: 0,
  WEEKLY: 52,
  BIWEEKLY: 26,
  MONTHLY: 12,
};

/**
 * Equivalente mensual de una cuota: permite sumar en una sola cifra
 * mensualidades de distinta frecuencia. Las de frecuencia única no son un
 * compromiso recurrente, así que aportan 0.
 */
export function monthlyEquivalentMinor(
  amountMinor: number,
  frequency: string
): number {
  const perYear = PER_YEAR[frequency as Frequency] ?? 0;
  if (perYear === 0) return 0;
  return Math.round((amountMinor * perYear) / 12);
}

export type DueTone = "danger" | "warn" | "neutral";

/**
 * Tono del badge de vencimiento (vencida → danger, hoy/mañana → warn).
 * Centraliza el ternario que antes se repetía en cada vista.
 */
export function dueTone(days: number): DueTone {
  if (days < 0) return "danger";
  if (days <= 1) return "warn";
  return "neutral";
}

export interface InstallmentLike {
  dueAt: Date;
  status: string;
}

/** Cuota pendiente más próxima, o null si no queda ninguna. */
export function nextPending<T extends InstallmentLike>(
  installments: readonly T[]
): T | null {
  let best: T | null = null;
  for (const inst of installments) {
    if (inst.status !== "PENDING") continue;
    if (!best || inst.dueAt.getTime() < best.dueAt.getTime()) best = inst;
  }
  return best;
}

export interface PlanLike {
  active: boolean;
  amountMinor: number;
  frequency: string;
  currencyId: string;
}

/**
 * Compromiso mensual por moneda: suma el equivalente mensual de los planes
 * activos y recurrentes, de mayor a menor importe.
 */
export function monthlyCommitmentByCurrency(
  plans: readonly PlanLike[]
): { currencyId: string; amountMinor: number }[] {
  const totals = new Map<string, number>();
  for (const plan of plans) {
    if (!plan.active) continue;
    const monthly = monthlyEquivalentMinor(plan.amountMinor, plan.frequency);
    if (monthly === 0) continue;
    totals.set(plan.currencyId, (totals.get(plan.currencyId) ?? 0) + monthly);
  }
  return [...totals.entries()]
    .map(([currencyId, amountMinor]) => ({ currencyId, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
}

export interface UrgencySortable {
  nextDueAt: Date | null;
  description: string;
}

/**
 * Orden de la lista de mensualidades: primero las de vencimiento más
 * cercano (las vencidas quedan arriba por ser fechas pasadas), al final las
 * que ya no tienen cuota pendiente. Desempata por descripción.
 */
export function comparePlansByUrgency(
  a: UrgencySortable,
  b: UrgencySortable
): number {
  if (a.nextDueAt && b.nextDueAt) {
    const diff = a.nextDueAt.getTime() - b.nextDueAt.getTime();
    if (diff !== 0) return diff;
  } else if (a.nextDueAt !== b.nextDueAt) {
    return a.nextDueAt ? -1 : 1;
  }
  return a.description.localeCompare(b.description, "es");
}

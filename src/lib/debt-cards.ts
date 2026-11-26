// Datos de las tarjetas de deuda y de mensualidad. Las pintan /deudas,
// /mensualidades y la ficha de un contacto, así que la consulta (`include`)
// y el mapeo viven aquí una sola vez.

import type { Prisma } from "@prisma/client";
import { daysUntil } from "@/lib/dates";
import type { DisplayCurrency } from "@/lib/format";
import { nextPending } from "@/lib/plans-core";

// ── Deudas ───────────────────────────────────────────────────────────────────

export const DEBT_CARD_INCLUDE = {
  contact: { select: { id: true, name: true } },
  currency: true,
  payments: { select: { amountMinor: true } },
  plans: {
    where: { active: true },
    select: {
      installments: {
        where: { status: "PENDING" },
        select: { dueAt: true, status: true },
        orderBy: { dueAt: "asc" },
        take: 1,
      },
    },
  },
} satisfies Prisma.DebtInclude;

type DebtForCard = Prisma.DebtGetPayload<{ include: typeof DEBT_CARD_INCLUDE }>;

export interface DebtCardData {
  id: string;
  contactId: string;
  contactName: string;
  description: string;
  direction: string;
  status: string;
  currencyId: string;
  currency: DisplayCurrency;
  totalMinor: number;
  paidMinor: number;
  remainingMinor: number;
  /** Porcentaje abonado, 0–100. */
  pct: number;
  /** Vencimiento de la próxima cuota pendiente de sus planes activos. */
  nextDueAt: Date | null;
}

export function toDebtCard(debt: DebtForCard): DebtCardData {
  const paidMinor = debt.payments.reduce((sum, p) => sum + p.amountMinor, 0);
  const next = nextPending(debt.plans.flatMap((plan) => plan.installments));
  return {
    id: debt.id,
    contactId: debt.contact.id,
    contactName: debt.contact.name,
    description: debt.description,
    direction: debt.direction,
    status: debt.status,
    currencyId: debt.currencyId,
    currency: {
      code: debt.currency.code,
      decimalPlaces: debt.currency.decimalPlaces,
    },
    totalMinor: debt.totalMinor,
    paidMinor,
    remainingMinor: debt.totalMinor - paidMinor,
    pct: Math.min(
      100,
      Math.round((paidMinor / Math.max(1, debt.totalMinor)) * 100)
    ),
    nextDueAt: next?.dueAt ?? null,
  };
}

// ── Mensualidades ────────────────────────────────────────────────────────────

export const PLAN_CARD_INCLUDE = {
  currency: true,
  contact: { select: { id: true, name: true } },
  debt: {
    select: {
      id: true,
      totalMinor: true,
      accountId: true,
      contact: { select: { id: true, name: true } },
      payments: { select: { amountMinor: true } },
    },
  },
  installments: {
    select: { id: true, dueAt: true, amountMinor: true, status: true },
    orderBy: { dueAt: "asc" },
  },
} satisfies Prisma.PaymentPlanInclude;

type PlanForCard = Prisma.PaymentPlanGetPayload<{
  include: typeof PLAN_CARD_INCLUDE;
}>;

export interface PlanCardData {
  id: string;
  description: string;
  kind: string;
  frequency: string;
  active: boolean;
  currencyId: string;
  currency: DisplayCurrency;
  amountMinor: number;
  /** Contacto propio del plan o, si cuelga de una deuda, el de la deuda. */
  contactName: string | null;
  /** Cuenta con la que se salda: la del plan o la de su deuda. */
  settleAccountId: string | null;
  /** Pendiente de la deuda ligada (null si el plan no cuelga de una deuda). */
  debtRemainingMinor: number | null;
  next: { id: string; dueAt: Date; amountMinor: number } | null;
  /** Para `comparePlansByUrgency`. */
  nextDueAt: Date | null;
  paidCount: number;
  overdue: boolean;
}

export function toPlanCard(plan: PlanForCard): PlanCardData {
  const next = nextPending(plan.installments);
  return {
    id: plan.id,
    description: plan.description,
    kind: plan.kind,
    frequency: plan.frequency,
    active: plan.active,
    currencyId: plan.currencyId,
    currency: {
      code: plan.currency.code,
      decimalPlaces: plan.currency.decimalPlaces,
    },
    amountMinor: plan.amountMinor,
    contactName: plan.contact?.name ?? plan.debt?.contact.name ?? null,
    settleAccountId: plan.accountId ?? plan.debt?.accountId ?? null,
    debtRemainingMinor: plan.debt
      ? plan.debt.totalMinor -
        plan.debt.payments.reduce((sum, p) => sum + p.amountMinor, 0)
      : null,
    next: next
      ? { id: next.id, dueAt: next.dueAt, amountMinor: next.amountMinor }
      : null,
    nextDueAt: next?.dueAt ?? null,
    paidCount: plan.installments.filter((inst) => inst.status === "PAID")
      .length,
    overdue: plan.installments.some(
      (inst) => inst.status === "PENDING" && daysUntil(inst.dueAt) < 0
    ),
  };
}

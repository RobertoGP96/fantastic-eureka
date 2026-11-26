import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  UserRound,
} from "lucide-react";
import { SettleInstallment } from "@/components/settle-installment";
import { Badge } from "@/components/ui/badge";
import { daysUntil, dueLabel } from "@/lib/dates";
import type { PlanCardData } from "@/lib/debt-cards";
import {
  FREQUENCY_LABELS,
  PLAN_KIND_LABELS,
  type Frequency,
  type PlanKind,
} from "@/lib/domain";
import { fmtMinor, minorToInput } from "@/lib/format";
import { dueTone } from "@/lib/plans-core";
import { cn } from "@/lib/utils";

// Una cuota se salda desde la propia tarjeta si ya venció o vence dentro de
// esta ventana: es lo que permite despachar varias mensualidades de una vez.
const SETTLE_WINDOW_DAYS = 7;

interface AccountOption {
  id: string;
  name: string;
  currencyId: string;
}

/** Tarjeta de una mensualidad ACTIVA, con el pago de la cuota embebido. */
export function PlanCard({
  plan,
  accounts,
  hideContact = false,
}: {
  plan: PlanCardData;
  /** Cuentas activas del usuario (se filtran por la moneda del plan). */
  accounts: AccountOption[];
  hideContact?: boolean;
}) {
  const { next } = plan;
  const days = next ? daysUntil(next.dueAt) : null;
  const collect = plan.kind === "COLLECT";
  const Icon = collect ? ArrowDownLeft : ArrowUpRight;
  const canSettle = next !== null && days !== null && days <= SETTLE_WINDOW_DAYS;
  const planAccounts = accounts.filter(
    (account) => account.currencyId === plan.currencyId
  );

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border bg-card",
        plan.overdue ? "border-danger/35" : "border-line"
      )}
    >
      <Link
        href={`/mensualidades/${plan.id}`}
        className="flex flex-1 items-start gap-3.5 p-4 transition-colors hover:bg-chip/30 focus-visible:bg-chip/30 focus-visible:outline-none"
      >
        <span
          className={cn(
            "flex size-10 flex-none items-center justify-center rounded-xl",
            plan.overdue
              ? "bg-danger-bg text-danger"
              : collect
                ? "bg-ok-bg text-ok"
                : "bg-chip text-brand-ink"
          )}
        >
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span className="truncate text-sm font-semibold text-heading">
              {plan.description}
            </span>
            <span className="money text-base font-bold whitespace-nowrap text-heading">
              {fmtMinor(plan.amountMinor, plan.currency)}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            {hideContact ? (
              <span className="truncate">
                {PLAN_KIND_LABELS[plan.kind as PlanKind]}
              </span>
            ) : (
              <>
                <UserRound className="size-3 flex-none" />
                <span className="truncate">
                  {plan.contactName ?? "Sin contacto"}
                </span>
              </>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="neutral">
              {FREQUENCY_LABELS[plan.frequency as Frequency]}
            </Badge>
            {next && days !== null && (
              <Badge variant={dueTone(days)}>
                <CalendarClock className="size-3" />
                {dueLabel(next.dueAt)}
              </Badge>
            )}
            {plan.paidCount > 0 && (
              <span className="text-[11px] text-muted">
                {plan.paidCount} saldada{plan.paidCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="mt-1 size-4 flex-none text-muted" />
      </Link>

      {canSettle && next && (
        <div className="border-t border-line-2 bg-app/60 px-4 py-3">
          {/* key por cuota y cuenta: al saldar llega la cuota siguiente y el
              formulario debe re-inicializarse (si no, heredaba el monto
              editado de la anterior). */}
          <SettleInstallment
            key={`${next.id}-${plan.settleAccountId ?? "none"}`}
            installmentId={next.id}
            accounts={planAccounts}
            // En un plan de deuda no se puede cobrar más de lo pendiente.
            defaultAmount={minorToInput(
              plan.debtRemainingMinor === null
                ? next.amountMinor
                : Math.min(
                    next.amountMinor,
                    Math.max(plan.debtRemainingMinor, 0)
                  ),
              plan.currency.decimalPlaces
            )}
            currencyCode={plan.currency.code}
            kind={plan.kind}
            defaultAccountId={plan.settleAccountId}
          />
        </div>
      )}
    </article>
  );
}

/** Fila compacta de una mensualidad finalizada. */
export function EndedPlanRow({
  plan,
  hideContact = false,
}: {
  plan: PlanCardData;
  hideContact?: boolean;
}) {
  return (
    <Link
      href={`/mensualidades/${plan.id}`}
      className="press flex items-center gap-3 rounded-2xl border border-line bg-card px-3.5 py-3 opacity-80 hover:border-brand-soft hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-heading">
          {plan.description}
        </div>
        <div className="truncate text-xs text-muted">
          {PLAN_KIND_LABELS[plan.kind as PlanKind]}
          {!hideContact && plan.contactName ? ` · ${plan.contactName}` : ""} ·{" "}
          {plan.paidCount} saldada{plan.paidCount === 1 ? "" : "s"}
        </div>
      </div>
      <span className="money text-sm font-bold whitespace-nowrap text-heading">
        {fmtMinor(plan.amountMinor, plan.currency)}
      </span>
      <ChevronRight className="size-4 flex-none text-muted" />
    </Link>
  );
}

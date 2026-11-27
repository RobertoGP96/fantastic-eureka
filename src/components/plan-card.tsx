import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";
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

// Filas de mensualidad. NO traen marco: van dentro de UNA tarjeta de lista
// (`<Card padding="none" className="divide-y divide-line-2 overflow-hidden">`).
// Las pintan /mensualidades y la ficha de un contacto.

// Una cuota se salda desde la propia lista si ya venció o vence dentro de
// esta ventana: es lo que permite despachar varias mensualidades de una vez.
const SETTLE_WINDOW_DAYS = 7;

/** ¿La próxima cuota del plan se puede saldar desde la lista? */
export function planCanSettle(plan: PlanCardData): boolean {
  return (
    plan.next !== null && daysUntil(plan.next.dueAt) <= SETTLE_WINDOW_DAYS
  );
}

// Anillo hacia dentro: la tarjeta de la lista recorta lo que sobresale.
const ROW_LINK =
  "transition-colors hover:bg-subtle/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset";

interface AccountOption {
  id: string;
  name: string;
  currencyId: string;
}

/**
 * Fila de una mensualidad ACTIVA, con el pago de la cuota embebido. Es un
 * <article> con UN solo enlace (los tests E2E lo localizan así); el
 * formulario de saldar va FUERA del enlace.
 *
 * `settleColumn`: en escritorio reserva una columna a la derecha para ese
 * formulario. La lista la activa para TODAS sus filas en cuanto una lo
 * lleva, así los montos quedan alineados entre filas con y sin formulario.
 * Sin ella (columna estrecha de un detalle) el formulario va debajo.
 */
export function PlanCard({
  plan,
  accounts,
  hideContact = false,
  settleColumn = false,
}: {
  plan: PlanCardData;
  /** Cuentas activas del usuario (se filtran por la moneda del plan). */
  accounts: AccountOption[];
  hideContact?: boolean;
  settleColumn?: boolean;
}) {
  const { next } = plan;
  const days = next ? daysUntil(next.dueAt) : null;
  const collect = plan.kind === "COLLECT";
  const Icon = collect ? ArrowDownLeft : ArrowUpRight;
  const planAccounts = accounts.filter(
    (account) => account.currencyId === plan.currencyId
  );

  return (
    <article
      className={
        settleColumn
          ? "@4xl/main:grid @4xl/main:grid-cols-[minmax(0,1fr)_20rem]"
          : undefined
      }
    >
      {/* Rejilla propia por fila: en móvil, qué + monto arriba y las
          etiquetas debajo; en escritorio, tres columnas. El mínimo de la
          del monto (7rem) mantiene las columnas alineadas entre filas. */}
      <Link
        href={`/mensualidades/${plan.id}`}
        className={cn(
          "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-4 py-3 @4xl/main:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(7rem,auto)] @4xl/main:items-center @4xl/main:gap-x-5",
          ROW_LINK
        )}
      >
        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 flex-none items-center justify-center rounded-xl",
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
            <div className="truncate text-sm font-medium text-heading">
              {plan.description}
            </div>
            <div className="truncate text-xs text-muted">
              {hideContact
                ? PLAN_KIND_LABELS[plan.kind as PlanKind]
                : (plan.contactName ?? "Sin contacto")}
            </div>
          </div>
        </div>

        <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 pl-12 @4xl/main:col-span-1 @4xl/main:col-start-2 @4xl/main:row-start-1 @4xl/main:pl-0">
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
            <span className="text-xs text-muted">
              {plan.paidCount} saldada{plan.paidCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="money col-start-2 row-start-1 text-right text-[15px] font-semibold whitespace-nowrap text-heading @4xl/main:col-start-3">
          {fmtMinor(plan.amountMinor, plan.currency)}
        </div>
      </Link>

      {next && planCanSettle(plan) && (
        <div
          className={cn(
            "bg-subtle/50 px-4 py-3",
            settleColumn &&
              "@4xl/main:flex @4xl/main:flex-col @4xl/main:justify-center @4xl/main:bg-transparent @4xl/main:pl-0"
          )}
        >
          {/* Sin columna propia el formulario no se estira de lado a lado. */}
          <div className={settleColumn ? undefined : "@2xl/main:max-w-sm"}>
            {/* key por cuota y cuenta: al saldar llega la cuota siguiente y
                el formulario debe re-inicializarse (si no, heredaba el
                monto editado de la anterior). */}
            <SettleInstallment
              key={`${next.id}-${plan.settleAccountId ?? "none"}`}
              installmentId={next.id}
              accounts={planAccounts}
              // En un plan de deuda no se puede cobrar más de lo pendiente:
              // el monto propuesto se recorta igual que en /deudas/[id].
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
        </div>
      )}
    </article>
  );
}

/** Fila de una mensualidad finalizada. */
export function EndedPlanRow({
  plan,
  hideContact = false,
}: {
  plan: PlanCardData;
  hideContact?: boolean;
}) {
  const Icon = plan.kind === "COLLECT" ? ArrowDownLeft : ArrowUpRight;

  return (
    <Link
      href={`/mensualidades/${plan.id}`}
      className={cn("flex items-center gap-3 px-4 py-3", ROW_LINK)}
    >
      <span
        aria-hidden="true"
        className="flex size-9 flex-none items-center justify-center rounded-xl bg-subtle text-ink-soft"
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-heading">
          {plan.description}
        </div>
        <div className="truncate text-xs text-muted">
          {PLAN_KIND_LABELS[plan.kind as PlanKind]}
          {!hideContact && plan.contactName ? ` · ${plan.contactName}` : ""} ·{" "}
          {plan.paidCount} saldada{plan.paidCount === 1 ? "" : "s"}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-1">
        <span className="money text-[15px] font-semibold whitespace-nowrap text-heading">
          {fmtMinor(plan.amountMinor, plan.currency)}
        </span>
        <Badge variant="neutral">Finalizada</Badge>
      </div>
    </Link>
  );
}

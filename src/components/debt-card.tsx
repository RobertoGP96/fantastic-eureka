import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { EntityAvatar } from "@/components/entity-avatar";
import { Badge } from "@/components/ui/badge";
import { daysUntil, dueLabel } from "@/lib/dates";
import type { DebtCardData } from "@/lib/debt-cards";
import { DEBT_STATUS_LABELS, type DebtStatus } from "@/lib/domain";
import { fmtMinor } from "@/lib/format";
import { dueTone } from "@/lib/plans-core";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de una deuda ABIERTA. Con `hideContact` (ficha de un contacto) el
 * título es la descripción y el avatar se cambia por el sentido de la deuda.
 */
export function DebtCard({
  debt,
  hideContact = false,
}: {
  debt: DebtCardData;
  hideContact?: boolean;
}) {
  const receivable = debt.direction === "RECEIVABLE";
  const days = debt.nextDueAt ? daysUntil(debt.nextDueAt) : null;
  const DirectionIcon = receivable ? ArrowDownLeft : ArrowUpRight;

  return (
    <Link
      href={`/deudas/${debt.id}`}
      className="press flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4 hover:border-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      <div className="flex items-start gap-3.5">
        {hideContact ? (
          <span
            className={cn(
              "flex size-10 flex-none items-center justify-center rounded-xl",
              receivable ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
            )}
          >
            <DirectionIcon className="size-[18px]" />
          </span>
        ) : (
          <EntityAvatar
            name={debt.contactName}
            tone={receivable ? "ok" : "warn"}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <span className="truncate text-sm font-semibold text-heading">
              {hideContact ? debt.description : debt.contactName}
            </span>
            <span className="money text-base font-bold whitespace-nowrap text-heading">
              {fmtMinor(debt.remainingMinor, debt.currency)}
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="truncate text-xs text-muted">
              {hideContact
                ? `Total ${fmtMinor(debt.totalMinor, debt.currency)}`
                : debt.description}
            </span>
            <span className="text-[11px] whitespace-nowrap text-muted">
              {receivable ? "por cobrar" : "por pagar"}
            </span>
          </div>
        </div>
        <ChevronRight className="mt-1 size-4 flex-none text-muted" />
      </div>

      {debt.paidMinor > 0 && (
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line-2">
            <div
              className={cn(
                "anim-grow-x h-1.5 rounded-full",
                receivable ? "bg-ok" : "bg-brand-mid"
              )}
              style={{ width: `${debt.pct}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Abonado {fmtMinor(debt.paidMinor, debt.currency)} de{" "}
            {fmtMinor(debt.totalMinor, debt.currency)} ({debt.pct}%)
          </div>
        </div>
      )}

      {debt.nextDueAt && days !== null && (
        <div>
          <Badge variant={dueTone(days)}>
            <CalendarClock className="size-3" />
            Próxima cuota · {dueLabel(debt.nextDueAt)}
          </Badge>
        </div>
      )}
    </Link>
  );
}

/** Fila compacta de una deuda saldada o cancelada (historial). */
export function ClosedDebtRow({
  debt,
  hideContact = false,
}: {
  debt: DebtCardData;
  hideContact?: boolean;
}) {
  return (
    <Link
      href={`/deudas/${debt.id}`}
      className="press flex items-center gap-3 rounded-2xl border border-line bg-card px-3.5 py-3 opacity-80 hover:border-brand-soft hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-heading">
          {hideContact ? debt.description : debt.contactName}
        </div>
        <div className="truncate text-xs text-muted">
          {hideContact
            ? debt.direction === "RECEIVABLE"
              ? "Por cobrar"
              : "Por pagar"
            : debt.description}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="money text-sm font-bold whitespace-nowrap text-heading">
          {fmtMinor(debt.totalMinor, debt.currency)}
        </span>
        <Badge variant={debt.status === "PAID" ? "ok" : "neutral"}>
          {DEBT_STATUS_LABELS[debt.status as DebtStatus] ?? debt.status}
        </Badge>
      </div>
      <ChevronRight className="size-4 flex-none text-muted" />
    </Link>
  );
}

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, CalendarClock } from "lucide-react";
import { EntityAvatar } from "@/components/entity-avatar";
import { ProgressBar } from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";
import { daysUntil, dueLabel } from "@/lib/dates";
import type { DebtCardData } from "@/lib/debt-cards";
import { DEBT_STATUS_LABELS, type DebtStatus } from "@/lib/domain";
import { fmtMinor } from "@/lib/format";
import { dueTone } from "@/lib/plans-core";
import { cn } from "@/lib/utils";

// Filas de deuda. NO traen marco: van dentro de UNA tarjeta de lista
// (`<Card padding="none" className="divide-y divide-line-2 overflow-hidden">`).
// Las pintan /deudas y la ficha de un contacto.

// Anillo hacia dentro: la tarjeta de la lista recorta lo que sobresale.
const ROW_LINK =
  "transition-colors hover:bg-subtle/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset";

/**
 * Fila de una deuda ABIERTA. Es UN solo enlace con todo su texto dentro (los
 * tests E2E la localizan por el nombre del contacto). Rejilla propia: en
 * móvil, quién + pendiente arriba y el avance debajo; en escritorio, tres
 * columnas en una fila. La del pendiente tiene un mínimo holgado (9rem):
 * así las columnas coinciden de una fila a otra.
 *
 * - `hideContact` (ficha de un contacto): el título es la descripción y el
 *   avatar se cambia por el sentido de la deuda.
 * - `stacked`: se queda en dos líneas a cualquier ancho, para listas que
 *   viven en la columna principal de un detalle (más estrecha).
 */
export function DebtCard({
  debt,
  hideContact = false,
  stacked = false,
}: {
  debt: DebtCardData;
  hideContact?: boolean;
  stacked?: boolean;
}) {
  const receivable = debt.direction === "RECEIVABLE";
  const days = debt.nextDueAt ? daysUntil(debt.nextDueAt) : null;
  const DirectionIcon = receivable ? ArrowDownLeft : ArrowUpRight;

  return (
    <Link
      href={`/deudas/${debt.id}`}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2.5 px-4 py-3",
        ROW_LINK,
        !stacked &&
          "@4xl/main:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(9rem,auto)] @4xl/main:items-center @4xl/main:gap-x-5"
      )}
    >
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
        {hideContact ? (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 flex-none items-center justify-center rounded-xl",
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
          <div className="truncate text-sm font-medium text-heading">
            {hideContact ? debt.description : debt.contactName}
          </div>
          <div className="truncate text-xs text-muted">
            {hideContact
              ? `Total ${fmtMinor(debt.totalMinor, debt.currency)}`
              : debt.description}
          </div>
        </div>
      </div>

      {(debt.paidMinor > 0 || debt.nextDueAt) && (
        <div
          className={cn(
            "col-span-2 row-start-2 flex min-w-0 flex-col items-start gap-2 pl-12",
            !stacked &&
              "@4xl/main:col-span-1 @4xl/main:col-start-2 @4xl/main:row-start-1 @4xl/main:pl-0"
          )}
        >
          {debt.paidMinor > 0 && (
            <div className="w-full">
              {/* La frase entera en UN elemento: los tests la buscan tal cual. */}
              <div className="text-xs text-muted">
                {`Abonado ${fmtMinor(debt.paidMinor, debt.currency)} de ${fmtMinor(debt.totalMinor, debt.currency)} (${debt.pct}%)`}
              </div>
              <ProgressBar percent={debt.pct} className="mt-1.5" />
            </div>
          )}
          {debt.nextDueAt && days !== null && (
            // whitespace-normal: es la etiqueta más larga de la fila («… ·
            // Vencida hace 12 días») y en móviles de 320 px no cabe en una
            // línea.
            <Badge variant={dueTone(days)} className="whitespace-normal">
              <CalendarClock className="size-3 flex-none" />
              Próxima cuota · {dueLabel(debt.nextDueAt)}
            </Badge>
          )}
        </div>
      )}

      <div
        className={cn(
          "col-start-2 row-start-1 text-right",
          !stacked && "@4xl/main:col-start-3"
        )}
      >
        <div className="money text-[15px] font-semibold whitespace-nowrap text-heading">
          {fmtMinor(debt.remainingMinor, debt.currency)}
        </div>
        {/* En minúsculas en el DOM: los tests lo comprueban así. */}
        <div className="text-xs text-muted">
          {receivable ? "por cobrar" : "por pagar"}
        </div>
      </div>
    </Link>
  );
}

/** Fila de una deuda saldada o cancelada (historial). */
export function ClosedDebtRow({
  debt,
  hideContact = false,
}: {
  debt: DebtCardData;
  hideContact?: boolean;
}) {
  const receivable = debt.direction === "RECEIVABLE";
  const DirectionIcon = receivable ? ArrowDownLeft : ArrowUpRight;

  return (
    <Link
      href={`/deudas/${debt.id}`}
      className={cn("flex items-center gap-3 px-4 py-3", ROW_LINK)}
    >
      {/* Neutro: cerrada ya no hay nada por cobrar ni pagar. */}
      {hideContact ? (
        <span
          aria-hidden="true"
          className="flex size-9 flex-none items-center justify-center rounded-xl bg-subtle text-ink-soft"
        >
          <DirectionIcon className="size-[18px]" />
        </span>
      ) : (
        <EntityAvatar name={debt.contactName} />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-heading">
          {hideContact ? debt.description : debt.contactName}
        </div>
        <div className="truncate text-xs text-muted">
          {hideContact
            ? receivable
              ? "Por cobrar"
              : "Por pagar"
            : debt.description}
        </div>
      </div>
      <div className="flex flex-none flex-col items-end gap-1">
        <span className="money text-[15px] font-semibold whitespace-nowrap text-heading">
          {fmtMinor(debt.totalMinor, debt.currency)}
        </span>
        <Badge variant={debt.status === "PAID" ? "ok" : "neutral"}>
          {DEBT_STATUS_LABELS[debt.status as DebtStatus] ?? debt.status}
        </Badge>
      </div>
    </Link>
  );
}

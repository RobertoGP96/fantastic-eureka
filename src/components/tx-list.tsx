import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  SlidersHorizontal,
} from "lucide-react";
import { fmtSignedMinor, type DisplayCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface TxRow {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  occurredAt: Date;
  /** Monto con signo desde la perspectiva de la vista actual. */
  amountMinor: number;
  currency: DisplayCurrency;
}

const KIND_ICONS: Record<string, LucideIcon> = {
  INCOME: ArrowDownLeft,
  EXPENSE: ArrowUpRight,
  TRANSFER: ArrowRightLeft,
  ADJUSTMENT: SlidersHorizontal,
};

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * Historial de movimientos: UNA tarjeta con filas divididas (antes, una
 * tarjeta por movimiento). Cada fila enlaza a su detalle salvo en modo
 * `readOnly` (vista pública compartida: no hay sesión ni detalle que abrir).
 * `bare` quita el marco para incrustarla dentro de otra tarjeta (gadget de
 * cuenta de Inicio).
 */
export function TxList({
  rows,
  readOnly = false,
  bare = false,
  className,
}: {
  rows: TxRow[];
  readOnly?: boolean;
  bare?: boolean;
  className?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div
      className={cn(
        "divide-y divide-line-2",
        !bare && "overflow-hidden rounded-2xl border border-line bg-card",
        className
      )}
    >
      {rows.map((row) => {
        const Icon = KIND_ICONS[row.kind] ?? ArrowRightLeft;
        const positive = row.amountMinor > 0;
        // Mover dinero (transferencia/ajuste) no es perderlo: tinte neutro.
        const neutral = row.kind === "TRANSFER" || row.kind === "ADJUSTMENT";
        const rowClass = cn(
          "flex items-center gap-3",
          bare ? "py-2.5" : "px-4 py-3",
          !readOnly && "transition-colors hover:bg-subtle/60"
        );
        const content = (
          <>
            <span
              className={`flex size-9 flex-none items-center justify-center rounded-xl ${
                neutral
                  ? "bg-subtle text-ink-soft"
                  : positive
                    ? "bg-ok-bg text-ok"
                    : "bg-danger-bg text-danger"
              }`}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-heading">
                {row.title}
              </div>
              <div className="truncate text-xs text-muted">
                {row.subtitle ? `${row.subtitle} · ` : ""}
                {DATE_FMT.format(row.occurredAt)}
              </div>
            </div>
            <div
              className={`money text-[15px] font-semibold whitespace-nowrap ${
                positive ? "text-ok" : "text-heading"
              }`}
            >
              {fmtSignedMinor(row.amountMinor, row.currency)}
            </div>
          </>
        );
        return readOnly ? (
          <div key={row.id} className={rowClass}>
            {content}
          </div>
        ) : (
          <Link
            key={row.id}
            href={`/movimientos/${row.id}`}
            className={rowClass}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}

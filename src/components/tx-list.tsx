import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  SlidersHorizontal,
} from "lucide-react";
import { fmtSignedMinor, type DisplayCurrency } from "@/lib/format";

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
 * Historial de movimientos. Cada fila enlaza a su detalle salvo en modo
 * `readOnly` (vista pública compartida: no hay sesión ni detalle que abrir).
 */
export function TxList({
  rows,
  readOnly = false,
}: {
  rows: TxRow[];
  readOnly?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => {
        const Icon = KIND_ICONS[row.kind] ?? ArrowRightLeft;
        const positive = row.amountMinor > 0;
        const className =
          "flex items-center gap-3 rounded-[16px] border border-line bg-white px-3.5 py-3 transition-colors hover:border-brand-soft";
        const content = (
          <>
            <span
              className={`flex h-9 w-9 flex-none items-center justify-center rounded-[12px] ${
                positive ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger"
              }`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-navy">
                {row.title}
              </div>
              <div className="truncate text-[11.5px] text-muted">
                {row.subtitle ? `${row.subtitle} · ` : ""}
                {DATE_FMT.format(row.occurredAt)}
              </div>
            </div>
            <div
              className={`text-[13.5px] font-bold whitespace-nowrap ${
                positive ? "text-ok" : "text-navy"
              }`}
            >
              {fmtSignedMinor(row.amountMinor, row.currency)}
            </div>
          </>
        );
        return readOnly ? (
          <div key={row.id} className={className}>
            {content}
          </div>
        ) : (
          <Link
            key={row.id}
            href={`/movimientos/${row.id}`}
            className={className}
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}

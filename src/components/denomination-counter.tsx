"use client";

import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { clampQty } from "@/lib/counting";
import { fmtMinor, type DisplayCurrency } from "@/lib/format";
import {
  DENOMINATION_KIND_LABELS,
  type DenominationKind,
} from "@/lib/domain";

export interface CounterDenomination {
  id: string;
  valueMinor: number;
  kind: string;
  /** Texto extra junto al tipo (ej. "quedan 4" en cajas con stock). */
  hint?: string;
}

// Filas de conteo por denominación compartidas por el arqueo y la
// calculadora. El subtotal va en una línea propia a lo ancho de la tarjeta
// (aparece solo con cantidad > 0) para que nunca se salga en móviles.
export function DenominationCounter({
  denominations,
  quantities,
  onQtyChange,
  currency,
}: {
  denominations: CounterDenomination[];
  quantities: Record<string, number>;
  onQtyChange: (id: string, qty: number) => void;
  currency: DisplayCurrency;
}) {
  const setQty = (id: string, value: number) => {
    onQtyChange(id, clampQty(value));
  };

  return (
    <div className="flex flex-col gap-2">
      {denominations.map((d) => {
        const qty = quantities[d.id] ?? 0;
        const subtotal = d.valueMinor * qty;
        const valueLabel = fmtMinor(d.valueMinor, currency);
        return (
          <div
            key={d.id}
            className="rounded-2xl border border-line bg-card px-4 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-heading">
                  {valueLabel}
                </div>
                <div className="truncate text-[11px] text-muted">
                  {DENOMINATION_KIND_LABELS[d.kind as DenominationKind] ??
                    d.kind}
                  {d.hint ? ` · ${d.hint}` : ""}
                </div>
              </div>
              <div className="flex flex-none items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQty(d.id, qty - 1)}
                  aria-label={`Quitar ${valueLabel}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-chip text-brand-ink transition-[box-shadow,transform] hover:ring-1 hover:ring-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-90"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <Input
                  value={qty === 0 ? "" : String(qty)}
                  onChange={(e) => setQty(d.id, Number(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                  className="h-11 w-14 rounded-lg px-1 text-center font-semibold"
                  aria-label={`Cantidad de ${valueLabel}`}
                />
                <button
                  type="button"
                  onClick={() => setQty(d.id, qty + 1)}
                  aria-label={`Añadir ${valueLabel}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-chip text-brand-ink transition-[box-shadow,transform] hover:ring-1 hover:ring-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-90"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
            </div>
            {qty > 0 && (
              <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-line-2 pt-1.5">
                <span className="text-[11px] text-muted">
                  {qty} × {valueLabel}
                </span>
                <span className="text-sm font-semibold text-ink-soft tabular-nums">
                  {fmtMinor(subtotal, currency)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

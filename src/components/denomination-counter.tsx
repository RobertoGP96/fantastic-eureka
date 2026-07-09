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
            className="rounded-[16px] border border-line bg-white px-3.5 py-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[13.5px] font-bold text-navy">
                  {valueLabel}
                </div>
                <div className="truncate text-[10.5px] text-muted">
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
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-app text-brand-mid transition-[color,transform] hover:text-brand active:scale-90"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  value={qty === 0 ? "" : String(qty)}
                  onChange={(e) => setQty(d.id, Number(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                  className="h-9 w-14 rounded-[10px] px-1 text-center font-semibold"
                  aria-label={`Cantidad de ${valueLabel}`}
                />
                <button
                  type="button"
                  onClick={() => setQty(d.id, qty + 1)}
                  aria-label={`Añadir ${valueLabel}`}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-app text-brand-mid transition-[color,transform] hover:text-brand active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {qty > 0 && (
              <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-line-2 pt-1.5">
                <span className="text-[10.5px] text-muted">
                  {qty} × {valueLabel}
                </span>
                <span className="text-[12.5px] font-semibold text-ink-soft tabular-nums">
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

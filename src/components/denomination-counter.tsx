"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Botones −/+ de 44 px en táctil y 36 px en escritorio, igual que el campo
// de cantidad (Input ya encoge con `dense:`).
const STEP_BUTTON = "size-11 flex-none dense:size-9";

// Filas de conteo por denominación compartidas por el arqueo, la calculadora
// y el desglose de /registrar. NO llevan marco propio: son filas divididas y
// la tarjeta la pone quien las usa (`<Card padding="none">`). El subtotal va
// en una línea propia bajo la fila (aparece solo con cantidad > 0) para que
// nunca se salga en móviles: los controles ya ocupan 44 + 56 + 44 px.
// Los aria-label («Quitar…», «Cantidad de…», «Añadir…») los usan los tests
// E2E para localizar cada control: no cambiarlos.
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
    <div className="divide-y divide-line-2">
      {denominations.map((d) => {
        const qty = quantities[d.id] ?? 0;
        const subtotal = d.valueMinor * qty;
        const valueLabel = fmtMinor(d.valueMinor, currency);
        return (
          <div key={d.id} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="money truncate text-sm font-medium text-heading">
                  {valueLabel}
                </div>
                <div className="truncate text-xs text-muted">
                  {DENOMINATION_KIND_LABELS[d.kind as DenominationKind] ??
                    d.kind}
                  {d.hint ? ` · ${d.hint}` : ""}
                </div>
              </div>
              <div className="flex flex-none items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className={STEP_BUTTON}
                  onClick={() => setQty(d.id, qty - 1)}
                  aria-label={`Quitar ${valueLabel}`}
                >
                  <Minus />
                </Button>
                <Input
                  value={qty === 0 ? "" : String(qty)}
                  onChange={(e) => setQty(d.id, Number(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                  className="money w-14 flex-none px-1 text-center font-semibold"
                  aria-label={`Cantidad de ${valueLabel}`}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className={STEP_BUTTON}
                  onClick={() => setQty(d.id, qty + 1)}
                  aria-label={`Añadir ${valueLabel}`}
                >
                  <Plus />
                </Button>
              </div>
            </div>
            {qty > 0 && (
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="money text-xs text-muted">
                  {qty} × {valueLabel}
                </span>
                <span className="money text-sm font-semibold text-heading">
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

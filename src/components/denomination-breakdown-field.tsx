"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DenominationCounter,
  type CounterDenomination,
} from "@/components/denomination-counter";
import {
  countedTotalMinor,
  suggestDistribution,
  type SuggestibleDenomination,
} from "@/lib/counting";
import { fmtMinor, type DisplayCurrency } from "@/lib/format";

export interface BreakdownDenomination extends CounterDenomination {
  /** Stock derivado de la caja (solo informativo/sugerencias en salidas). */
  available?: number;
}

// Desglose de denominaciones de un movimiento sobre una caja CASH_BOX.
// Con el monto ya escrito, «Sugerir» rellena una distribución exacta
// (mayor-primero con backtracking); en salidas respeta el stock derivado.
export function DenominationBreakdownField({
  title,
  denominations,
  currency,
  targetMinor,
  quantities,
  onQtyChange,
  outflow,
}: {
  title: string;
  denominations: BreakdownDenomination[];
  currency: DisplayCurrency;
  /** Monto a cuadrar en unidades menores; null si aún no es parseable. */
  targetMinor: number | null;
  quantities: Record<string, number>;
  onQtyChange: (next: Record<string, number>) => void;
  /** true = el dinero SALE de la caja (limita sugerencias al stock). */
  outflow: boolean;
}) {
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const totalMinor = countedTotalMinor(denominations, quantities);
  const matches = targetMinor !== null && totalMinor === targetMinor;
  const started = Object.values(quantities).some((qty) => qty > 0);

  const rows: CounterDenomination[] = denominations.map((d) => ({
    ...d,
    hint:
      outflow && d.available !== undefined
        ? d.available > 0
          ? `quedan ${d.available}`
          : "sin stock"
        : undefined,
  }));

  const suggest = () => {
    if (targetMinor === null || targetMinor <= 0) return;
    setSuggestError(null);
    const pool: SuggestibleDenomination[] = denominations.map((d) => ({
      id: d.id,
      valueMinor: d.valueMinor,
      available: outflow ? Math.max(0, d.available ?? 0) : undefined,
    }));
    const suggestion = suggestDistribution(pool, targetMinor);
    if (suggestion === null) {
      setSuggestError(
        outflow
          ? "No hay combinación exacta con las denominaciones disponibles en la caja."
          : "No hay combinación exacta con las denominaciones de la moneda."
      );
      return;
    }
    onQtyChange(suggestion);
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-app/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          {title}
        </span>
        <button
          type="button"
          onClick={suggest}
          disabled={targetMinor === null || targetMinor <= 0}
          className="flex items-center gap-1.5 rounded-[10px] border border-line bg-white px-2.5 py-1.5 text-[11.5px] font-semibold text-brand-mid transition-colors hover:border-brand-soft hover:text-brand disabled:opacity-40"
        >
          <Wand2 className="h-3.5 w-3.5" />
          Sugerir distribución
        </button>
      </div>

      <DenominationCounter
        denominations={rows}
        quantities={quantities}
        onQtyChange={(id, qty) => {
          setSuggestError(null);
          onQtyChange({ ...quantities, [id]: qty });
        }}
        currency={currency}
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] text-muted">
          Desglose: {fmtMinor(totalMinor, currency)}
          {targetMinor !== null && !matches
            ? ` · monto: ${fmtMinor(targetMinor, currency)}`
            : ""}
        </span>
        {targetMinor === null ? (
          <Badge variant="neutral">Escribe el monto</Badge>
        ) : matches ? (
          <Badge variant="ok">Cuadra</Badge>
        ) : (
          <Badge variant={started ? "danger" : "warn"}>
            {totalMinor > targetMinor
              ? `Sobra ${fmtMinor(totalMinor - targetMinor, currency)}`
              : `Falta ${fmtMinor(targetMinor - totalMinor, currency)}`}
          </Badge>
        )}
      </div>

      {suggestError && (
        <div className="rounded-[10px] bg-danger-bg px-3 py-2 text-[11.5px] font-medium text-danger">
          {suggestError}
        </div>
      )}
    </div>
  );
}

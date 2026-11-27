"use client";

import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
// El flujo normal es contar primero: el total del desglose se muestra en
// grande y, con `drivesAmount`, el formulario dueño rellena el monto con él.
// El camino inverso sigue vivo: con el monto ya escrito, «Sugerir» rellena
// una distribución exacta (mayor-primero con backtracking); en salidas
// respeta el stock derivado.
export function DenominationBreakdownField({
  title,
  denominations,
  currency,
  targetMinor,
  quantities,
  onQtyChange,
  outflow,
  drivesAmount = false,
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
  /** true = el formulario copia el total del desglose al campo de monto. */
  drivesAmount?: boolean;
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
    // Panel interior neutro dentro de la tarjeta del formulario (sin borde ni
    // tinte de acento). En móvil (`max-sm:`) va A SANGRE: `-mx-4` compensa el
    // p-4 de la <Card> que lo contiene y la lista pierde su marco lateral.
    // Con panel + lista + fila anidados, a 375 px quedaban ~70 px para la
    // denominación y el «quedan N» de las salidas se cortaba.
    <div className="flex flex-col gap-2.5 rounded-xl bg-subtle p-3.5 max-sm:-mx-4 max-sm:rounded-none max-sm:border-y max-sm:border-line max-sm:px-0">
      {/* flex-wrap: si no caben en una línea, el botón baja bajo el título
          en vez de estrujarlo. */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 max-sm:px-4">
        <span className="text-sm font-medium text-ink-soft">
          {title}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={suggest}
          disabled={targetMinor === null || targetMinor <= 0}
        >
          <Wand2 className="size-3.5" />
          Sugerir distribución
        </Button>
      </div>

      {/* Las filas del contador no traen marco propio: lo pone quien las usa. */}
      <Card
        padding="none"
        className="overflow-hidden max-sm:rounded-none max-sm:border-x-0"
      >
        <DenominationCounter
          denominations={rows}
          quantities={quantities}
          onQtyChange={(id, qty) => {
            setSuggestError(null);
            onQtyChange({ ...quantities, [id]: qty });
          }}
          currency={currency}
        />
      </Card>

      <div className="flex items-center justify-between gap-2 max-sm:px-4">
        <div className="flex flex-col">
          <span className="text-[11px] text-muted">Total del desglose</span>
          <span className="money text-xl font-semibold text-heading">
            {fmtMinor(totalMinor, currency)}
          </span>
          {targetMinor !== null && !matches && (
            <span className="money text-[11px] text-muted">
              Monto: {fmtMinor(targetMinor, currency)}
            </span>
          )}
        </div>
        {targetMinor === null ? (
          // bg-card: la insignia neutra es del mismo gris que este panel.
          <Badge variant="neutral" className="bg-card">
            {drivesAmount ? "Cuenta las piezas" : "Escribe el monto"}
          </Badge>
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

      {drivesAmount && (
        <span className="text-xs text-muted max-sm:px-4">
          El monto se rellena solo con lo que cuentes aquí. También puedes
          escribir el monto y usar «Sugerir distribución».
        </span>
      )}

      {suggestError && (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger max-sm:mx-4">
          {suggestError}
        </div>
      )}
    </div>
  );
}

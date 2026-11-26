"use client";

import { useMemo, useState } from "react";
import { Eraser } from "lucide-react";
import {
  DenominationCounter,
  type CounterDenomination,
} from "@/components/denomination-counter";
import { CountShareButton } from "@/components/count-share";
import { SplitLayout } from "@/components/page-body";
import { countedPieces, countedTotalMinor } from "@/lib/counting";
import { fmtMinor } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CalculatorCurrency {
  id: string;
  code: string;
  name: string;
  decimalPlaces: number;
  denominations: CounterDenomination[];
}

// Calculadora libre: cuenta efectivo por denominaciones sin tocar la BD.
// Las cantidades se guardan por moneda, así cambiar de divisa no borra
// el conteo en curso de la otra.
// Referencia estable para «sin cantidades»: un `{}` nuevo en cada render
// invalidaba los useMemo que dependen de `quantities`.
const NO_QUANTITIES: Record<string, number> = {};

export function CashCalculator({
  currencies,
}: {
  currencies: CalculatorCurrency[];
}) {
  const [currencyId, setCurrencyId] = useState(currencies[0].id);
  const [quantitiesByCurrency, setQuantitiesByCurrency] = useState<
    Record<string, Record<string, number>>
  >({});

  const currency =
    currencies.find((c) => c.id === currencyId) ?? currencies[0];
  const quantities = quantitiesByCurrency[currency.id] ?? NO_QUANTITIES;

  const setQty = (id: string, qty: number) => {
    setQuantitiesByCurrency((prev) => ({
      ...prev,
      [currency.id]: { ...(prev[currency.id] ?? {}), [id]: qty },
    }));
  };

  const clear = () => {
    setQuantitiesByCurrency((prev) => ({ ...prev, [currency.id]: {} }));
  };

  const totalMinor = useMemo(
    () => countedTotalMinor(currency.denominations, quantities),
    [currency, quantities]
  );
  const pieces = useMemo(() => countedPieces(quantities), [quantities]);

  return (
    // Mientras no cabe en dos columnas, una sola de ancho de lectura; al
    // partirse (SplitLayout) ocupa todo el panel.
    <div className="flex max-w-xl flex-col gap-4 @4xl:max-w-none">
      {currencies.length > 1 && (
        <div
          role="radiogroup"
          aria-label="Moneda"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {currencies.map((option) => {
            const active = option.id === currency.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCurrencyId(option.id)}
                className={cn(
                  "min-h-11 flex-none rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                  active
                    ? "border-brand-ink bg-chip text-brand-ink"
                    : "border-line bg-card text-ink-soft hover:border-brand-soft"
                )}
              >
                {option.code}
              </button>
            );
          })}
        </div>
      )}

      {/* Escritorio: contadores a la izquierda y el total fijo a la derecha,
          siempre a la vista. En móvil el total va ANTES de los contadores
          (asideFirst), como siempre. */}
      <SplitLayout
        asideFirst
        main={
          <DenominationCounter
            denominations={currency.denominations}
            quantities={quantities}
            onQtyChange={setQty}
            currency={currency}
          />
        }
        aside={
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4 @4xl:flex-col @4xl:items-stretch">
            <div className="min-w-0">
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Total contado
              </div>
              <div className="money mt-0.5 text-[28px] leading-tight font-bold tracking-[-0.5px] text-heading">
                {fmtMinor(totalMinor, currency)}
              </div>
              <div className="text-xs text-muted">
                {pieces === 1 ? "1 pieza" : `${pieces} piezas`}
              </div>
            </div>
            <div className="flex flex-none flex-col items-stretch gap-1.5 @md:flex-row">
              <CountShareButton
                denominations={currency.denominations}
                quantities={quantities}
                currency={currency}
              />
              <button
                type="button"
                onClick={clear}
                disabled={pieces === 0}
                className="flex flex-none items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
              >
                <Eraser className="size-4" />
                Limpiar
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
}

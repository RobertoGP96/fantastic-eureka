"use client";

import { useMemo, useState } from "react";
import { Eraser } from "lucide-react";
import {
  DenominationCounter,
  type CounterDenomination,
} from "@/components/denomination-counter";
import { countedPieces, countedTotalMinor } from "@/lib/counting";
import { fmtMinor } from "@/lib/format";

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
  const quantities = quantitiesByCurrency[currency.id] ?? {};

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
    <div className="flex flex-col gap-4">
      {currencies.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {currencies.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setCurrencyId(option.id)}
              className={`flex-none rounded-full border px-4 py-2 text-[12.5px] font-semibold transition-colors ${
                option.id === currency.id
                  ? "border-brand bg-chip text-brand"
                  : "border-line bg-white text-ink-soft hover:border-brand-soft"
              }`}
            >
              {option.code}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-[18px] border border-line bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
              Total contado
            </div>
            <div className="mt-0.5 text-[24px] font-bold tracking-[-0.5px] text-navy">
              {fmtMinor(totalMinor, currency)}
            </div>
            <div className="text-[11.5px] text-muted">
              {pieces === 1 ? "1 pieza" : `${pieces} piezas`}
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={pieces === 0}
            className="flex flex-none items-center gap-1.5 rounded-[12px] border border-line bg-white px-3 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand disabled:opacity-40"
          >
            <Eraser className="h-4 w-4" />
            Limpiar
          </button>
        </div>
      </div>

      <DenominationCounter
        denominations={currency.denominations}
        quantities={quantities}
        onQtyChange={setQty}
        currency={currency}
      />
    </div>
  );
}

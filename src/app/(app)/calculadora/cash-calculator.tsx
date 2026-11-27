"use client";

import { useMemo, useState } from "react";
import { Eraser } from "lucide-react";
import {
  DenominationCounter,
  type CounterDenomination,
} from "@/components/denomination-counter";
import { CountShareButton } from "@/components/count-share";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { countedPieces, countedTotalMinor } from "@/lib/counting";
import { fmtMinorParts } from "@/lib/format";

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
  const total = fmtMinorParts(totalMinor, currency);

  return (
    <div className="grid gap-5 @4xl/main:grid-cols-12">
      {/* Primero en el DOM para que en móvil el total quede arriba; en
          escritorio pasa a la derecha (order-2) y se queda fijo mientras se
          recorre la lista de denominaciones. */}
      <div className="flex min-w-0 flex-col gap-3 self-start @4xl/main:sticky @4xl/main:top-4 @4xl/main:order-2 @4xl/main:col-span-4">
        {currencies.length > 1 && (
          <Segmented
            ariaLabel="Moneda"
            className="self-start"
            options={currencies.map((option) => ({
              value: option.id,
              label: option.code,
            }))}
            value={currency.id}
            onValueChange={setCurrencyId}
          />
        )}

        <StatCard
          label="Total contado"
          value={total.amount}
          unit={total.code}
          hint={pieces === 1 ? "1 pieza" : `${pieces} piezas`}
        >
          <div className="flex gap-2">
            <CountShareButton
              className="flex-1"
              denominations={currency.denominations}
              quantities={quantities}
              currency={currency}
            />
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={clear}
              disabled={pieces === 0}
            >
              <Eraser className="size-3.5" />
              Limpiar
            </Button>
          </div>
        </StatCard>
      </div>

      <Card
        padding="none"
        className="min-w-0 self-start overflow-hidden @4xl/main:col-span-8"
      >
        <DenominationCounter
          denominations={currency.denominations}
          quantities={quantities}
          onQtyChange={setQty}
          currency={currency}
        />
      </Card>
    </div>
  );
}

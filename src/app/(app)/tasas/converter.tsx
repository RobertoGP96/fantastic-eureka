"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { convertMinor, parseAmountToMinor } from "@/lib/money";
import {
  buildPairMap,
  resolveRateScaled,
  type PairRateLite,
} from "@/lib/rate-resolve";
import { fmtMinor, fmtRate } from "@/lib/format";

interface ConverterCurrency {
  id: string;
  code: string;
  decimalPlaces: number;
}

// Conversor sin marco: la tarjeta y el título «Conversor rápido» los pone la
// página. El monto va en su propia fila: junto a los dos selectores y el
// botón de intercambio se quedaba sin sitio en la columna lateral.
export function Converter({
  currencies,
  pairs,
  baseId,
}: {
  currencies: ConverterCurrency[];
  pairs: PairRateLite[];
  baseId: string | null;
}) {
  const [amount, setAmount] = useState("100");
  const [fromId, setFromId] = useState(
    currencies[1]?.id ?? currencies[0]?.id ?? ""
  );
  const [toId, setToId] = useState(currencies[0]?.id ?? "");

  const pairMap = useMemo(() => buildPairMap(pairs), [pairs]);
  const from = currencies.find((c) => c.id === fromId);
  const to = currencies.find((c) => c.id === toId);

  let result: string | null = null;
  let rateInfo: string | null = null;
  let warning: string | null = null;

  if (from && to && amount.trim()) {
    const rate = resolveRateScaled(pairMap, from.id, to.id, baseId);
    if (rate === null) {
      warning = `No hay tasa registrada que conecte ${from.code} con ${to.code}.`;
    } else {
      try {
        const minor = parseAmountToMinor(amount, from);
        result = fmtMinor(convertMinor(minor, from, to, rate), to);
        rateInfo = `1 ${from.code} = ${fmtRate(rate)} ${to.code}`;
      } catch {
        warning = "Monto inválido";
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        placeholder="0"
        aria-label="Monto a convertir"
        className="money"
      />
      <div className="flex items-center gap-2">
        <Select value={fromId} onValueChange={setFromId}>
          <SelectTrigger
            variant="form"
            className="min-w-0 flex-1"
            aria-label="Moneda de origen"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((currency) => (
              <SelectItem key={currency.id} value={currency.id}>
                {currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Misma altura que los selectores: 44 px táctil, 36 px escritorio. */}
        <Button
          variant="outline"
          size="icon"
          className="size-11 flex-none dense:size-9"
          onClick={() => {
            setFromId(toId);
            setToId(fromId);
          }}
          aria-label="Intercambiar monedas"
        >
          <ArrowLeftRight />
        </Button>
        <Select value={toId} onValueChange={setToId}>
          <SelectTrigger
            variant="form"
            className="min-w-0 flex-1"
            aria-label="Moneda de destino"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((currency) => (
              <SelectItem key={currency.id} value={currency.id}>
                {currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border-t border-line-2 pt-3" aria-live="polite">
        {warning ? (
          <div className="text-sm text-muted">{warning}</div>
        ) : result ? (
          <>
            <div className="money text-[22px] font-semibold tracking-tight break-words text-heading">
              {result}
            </div>
            {rateInfo && (
              <div className="money mt-0.5 text-xs text-muted">{rateInfo}</div>
            )}
          </>
        ) : (
          <div className="text-sm text-muted">
            Escribe un monto para convertir.
          </div>
        )}
      </div>
    </div>
  );
}

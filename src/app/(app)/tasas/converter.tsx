"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { FIELD_SELECT } from "@/components/form-field";
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
    <div className="rounded-2xl border border-line bg-card p-4">
      {/* Dos filas (monto arriba, par abajo): cabe igual en el móvil que en
          la columna lateral estrecha de escritorio. */}
      <div className="flex flex-col gap-2.5">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0"
          aria-label="Monto a convertir"
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <Select value={fromId} onValueChange={setFromId}>
            <SelectTrigger className={FIELD_SELECT} aria-label="Moneda de origen">
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
          <button
            type="button"
            onClick={() => {
              setFromId(toId);
              setToId(fromId);
            }}
            aria-label="Intercambiar monedas"
            className="flex size-11 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-90"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger className={FIELD_SELECT} aria-label="Moneda de destino">
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
      </div>

      <div className="mt-3.5 border-t border-line-2 pt-3" aria-live="polite">
        {warning ? (
          <div className="text-sm text-muted">{warning}</div>
        ) : result ? (
          <>
            <div className="money text-[22px] font-bold tracking-[-0.5px] text-brand-ink">
              {result}
            </div>
            {rateInfo && (
              <div className="mt-0.5 text-xs text-muted">{rateInfo}</div>
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

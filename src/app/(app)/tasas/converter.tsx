"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
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
    <div className="rounded-[18px] border border-line bg-white p-4">
      <div className="flex items-center gap-2.5">
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0"
          aria-label="Monto a convertir"
        />
        <Select value={fromId} onValueChange={setFromId}>
          <SelectTrigger className="h-10 flex-none rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
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
          className="flex h-10 w-12 flex-none items-center justify-center rounded-[13px] bg-chip text-brand transition-transform active:scale-90"
        >
          <ArrowUpDown className="h-4 w-4" />
        </button>
        <Select value={toId} onValueChange={setToId}>
          <SelectTrigger className="h-10 flex-none rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
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

      <div className="mt-3.5 border-t border-line-2 pt-3">
        {warning ? (
          <div className="text-[12.5px] text-muted">{warning}</div>
        ) : result ? (
          <>
            <div className="money text-[22px] font-bold tracking-[-0.5px] text-brand">
              {result}
            </div>
            {rateInfo && (
              <div className="mt-0.5 text-[11.5px] text-muted">{rateInfo}</div>
            )}
          </>
        ) : (
          <div className="text-[12.5px] text-muted">
            Escribe un monto para convertir.
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExchangeRate } from "@/app/actions/rate-actions";
import { useUI } from "@/lib/ui-store";

interface CurrencyOption {
  id: string;
  code: string;
}

export function RateForm({ currencies }: { currencies: CurrencyOption[] }) {
  const router = useRouter();
  const { showToast } = useUI();
  const [fromCurrencyId, setFromCurrencyId] = useState(
    currencies[1]?.id ?? currencies[0]?.id ?? ""
  );
  const [toCurrencyId, setToCurrencyId] = useState(currencies[0]?.id ?? "");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const from = currencies.find((c) => c.id === fromCurrencyId);
  const to = currencies.find((c) => c.id === toCurrencyId);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await createExchangeRate({
      fromCurrencyId,
      toCurrencyId,
      rate,
    });
    setSaving(false);
    if (result.success) {
      showToast("Tasa guardada");
      setRate("");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <form
      className="rounded-[18px] border border-line bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {/* flex-wrap: en pantallas estrechas el grupo input+botón baja a una
          segunda línea en vez de desbordar la tarjeta */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-none items-center gap-2">
          <Select value={fromCurrencyId} onValueChange={setFromCurrencyId}>
            <SelectTrigger className="h-10 flex-none rounded-[13px] border border-line bg-white px-3 text-sm text-ink">
              <SelectValue placeholder="De" />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.id} value={currency.id}>
                  {currency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ArrowRight className="h-4 w-4 flex-none text-muted-2" />
          <Select value={toCurrencyId} onValueChange={setToCurrencyId}>
            <SelectTrigger className="h-10 flex-none rounded-[13px] border border-line bg-white px-3 text-sm text-ink">
              <SelectValue placeholder="A" />
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
        <div className="flex min-w-0 flex-1 basis-44 items-center gap-2">
          <Input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            inputMode="decimal"
            placeholder="435.5"
            required
          />
          <Button
            type="submit"
            className="flex-none"
            disabled={
              saving ||
              !rate.trim() ||
              !fromCurrencyId ||
              !toCurrencyId ||
              fromCurrencyId === toCurrencyId
            }
          >
            {saving ? "…" : "Guardar"}
          </Button>
        </div>
      </div>
      {from && to && (
        <p className="mt-2 text-[11.5px] text-muted">
          {from.id === to.id
            ? "Elige dos monedas distintas"
            : `Cuántos ${to.code} vale 1 ${from.code} (hasta 4 decimales). El par inverso ${to.code} → ${from.code} se calcula solo.`}
        </p>
      )}
      {error && (
        <div className="mt-2.5 rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}
    </form>
  );
}

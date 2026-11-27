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

// Formulario sin marco: la tarjeta y el título «Registrar tasa» los pone la
// página. Dos filas (par de monedas / tasa + guardar) para que quepa tanto en
// la columna lateral de escritorio como en móvil.
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
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-center gap-2">
        <Select value={fromCurrencyId} onValueChange={setFromCurrencyId}>
          <SelectTrigger
            variant="form"
            className="min-w-0 flex-1"
            aria-label="Moneda de origen"
          >
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
        <ArrowRight className="size-4 flex-none text-muted" />
        <Select value={toCurrencyId} onValueChange={setToCurrencyId}>
          <SelectTrigger
            variant="form"
            className="min-w-0 flex-1"
            aria-label="Moneda de destino"
          >
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
      <div className="flex items-center gap-2">
        <Input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          inputMode="decimal"
          placeholder="435.5"
          aria-label="Tasa"
          className="money"
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
      {from && to && (
        <p className="text-xs text-muted">
          {from.id === to.id
            ? "Elige dos monedas distintas"
            : `Cuántos ${to.code} vale 1 ${from.code} (hasta 4 decimales). El par inverso ${to.code} → ${from.code} se calcula solo.`}
        </p>
      )}
      {error && (
        <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}
    </form>
  );
}

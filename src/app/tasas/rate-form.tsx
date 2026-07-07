"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  name: string;
}

export function RateForm({
  currencies,
  baseCode,
}: {
  currencies: CurrencyOption[];
  baseCode: string;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [currencyId, setCurrencyId] = useState(currencies[0]?.id ?? "");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selected = currencies.find((c) => c.id === currencyId);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await createExchangeRate({ currencyId, rate });
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
      <div className="flex gap-2.5">
        <Select value={currencyId} onValueChange={setCurrencyId}>
          <SelectTrigger className="h-10 flex-none rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
            <SelectValue placeholder="Moneda" />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((currency) => (
              <SelectItem key={currency.id} value={currency.id}>
                {currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          inputMode="decimal"
          placeholder="435.5"
          required
        />
        <Button type="submit" disabled={saving || !rate.trim() || !currencyId}>
          {saving ? "…" : "Guardar"}
        </Button>
      </div>
      {selected && (
        <p className="mt-2 text-[11.5px] text-muted">
          {baseCode} por 1 {selected.code} (hasta 4 decimales)
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

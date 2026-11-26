"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  FORM_DRAWER_FORM,
  FormDrawerBody,
  FormDrawerFooter,
  useFormDrawer,
} from "@/components/form-drawer";
import { Field, FIELD_SELECT, FormError } from "@/components/form-field";
import { createExchangeRate } from "@/app/actions/rate-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

interface CurrencyOption {
  id: string;
  code: string;
}

/**
 * Registro de una tasa por PAR (vive en un drawer). `defaultFromId` /
 * `defaultToId` preseleccionan el par: los pasa el detalle de un par; sin
 * ellos se propone «segunda moneda → primera» (la primera es la base).
 */
export function RateForm({
  currencies,
  defaultFromId,
  defaultToId,
}: {
  currencies: CurrencyOption[];
  defaultFromId?: string;
  defaultToId?: string;
}) {
  const { showToast } = useUI();
  const { setBusy, close } = useFormDrawer();
  const [fromCurrencyId, setFromCurrencyId] = useState(
    defaultFromId ?? currencies[1]?.id ?? currencies[0]?.id ?? ""
  );
  const [toCurrencyId, setToCurrencyId] = useState(
    defaultToId ?? currencies[0]?.id ?? ""
  );
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (currencies.length < 2) {
    return (
      <FormDrawerBody>
        <p className="rounded-xl border border-line bg-card px-3.5 py-3 text-sm text-muted">
          Hacen falta al menos dos monedas activas para registrar una tasa.
          Añade o activa otra en{" "}
          <Link
            href="/monedas"
            className="font-semibold text-brand-ink hover:underline"
          >
            Monedas
          </Link>
          .
        </p>
      </FormDrawerBody>
    );
  }

  const from = currencies.find((c) => c.id === fromCurrencyId);
  const to = currencies.find((c) => c.id === toCurrencyId);
  const samePair = fromCurrencyId === toCurrencyId;

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);
    const result = await runAction(() =>
      createExchangeRate({ fromCurrencyId, toCurrencyId, rate })
    );
    if (result.success) {
      // `saving` sigue en true mientras se cierra (anti doble envío).
      showToast("Tasa guardada");
      close();
    } else {
      setSaving(false);
      setBusy(false);
      setError(result.error);
    }
  };

  return (
    <form
      className={FORM_DRAWER_FORM}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <FormDrawerBody>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2">
          <Field label="De">
            <Select value={fromCurrencyId} onValueChange={setFromCurrencyId}>
              <SelectTrigger className={FIELD_SELECT}>
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
          </Field>
          <button
            type="button"
            aria-label="Invertir el par"
            onClick={() => {
              setFromCurrencyId(toCurrencyId);
              setToCurrencyId(fromCurrencyId);
            }}
            className="flex size-11 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none active:scale-90"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <Field label="A">
            <Select value={toCurrencyId} onValueChange={setToCurrencyId}>
              <SelectTrigger className={FIELD_SELECT}>
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
          </Field>
        </div>

        <Field
          label="Tasa"
          hint={
            from && to
              ? samePair
                ? "Elige dos monedas distintas"
                : `Cuántos ${to.code} vale 1 ${from.code} (hasta 4 decimales). El par inverso ${to.code} → ${from.code} se calcula solo.`
              : undefined
          }
        >
          <Input
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            inputMode="decimal"
            placeholder="435.5"
            autoComplete="off"
            required
          />
        </Field>

        <FormError>{error}</FormError>
      </FormDrawerBody>

      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={
            saving ||
            !rate.trim() ||
            !fromCurrencyId ||
            !toCurrencyId ||
            samePair
          }
        >
          {saving ? "Guardando…" : "Guardar"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

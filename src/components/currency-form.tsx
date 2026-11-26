"use client";

import { useState } from "react";
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
import { createCurrency } from "@/app/actions/currency-actions";
import { type CurrencyKind } from "@/lib/domain";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

const DECIMAL_OPTIONS = ["0", "2", "3", "4"];

const KIND_OPTIONS: { key: CurrencyKind; label: string; hint: string }[] = [
  { key: "CASH", label: "Efectivo", hint: "con billetes y monedas" },
  { key: "DIGITAL", label: "Digital", hint: "solo saldo, sin denominaciones" },
];

/** Alta de moneda (vive en el drawer de `/monedas`). */
export function CurrencyForm() {
  const { showToast } = useUI();
  const { setBusy, close } = useFormDrawer();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("$");
  const [decimals, setDecimals] = useState("2");
  const [kind, setKind] = useState<CurrencyKind>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);
    const result = await runAction(() =>
      createCurrency({
        code,
        name,
        symbol,
        decimalPlaces: Number(decimals),
        kind,
      })
    );
    if (result.success) {
      // `saving` sigue en true mientras se cierra (anti doble envío).
      showToast("Moneda creada");
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
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-3">
          <Field label="Código">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MXN"
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              required
            />
          </Field>
          <Field label="Símbolo">
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="$"
              maxLength={4}
              autoComplete="off"
              required
            />
          </Field>
        </div>

        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Peso mexicano"
            maxLength={60}
            autoComplete="off"
            required
          />
        </Field>

        {/* Dos opciones con explicación: por eso no usa ChoiceGroup. */}
        <div
          role="radiogroup"
          aria-label="Clasificación"
          className="grid grid-cols-2 gap-2"
        >
          {KIND_OPTIONS.map((option) => {
            const active = kind === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setKind(option.key)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                  active
                    ? "border-brand-ink bg-chip"
                    : "border-line bg-card hover:border-brand-soft"
                )}
              >
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    active ? "text-brand-ink" : "text-ink-soft"
                  )}
                >
                  {option.label}
                </span>
                <span className="block text-[11px] text-muted">
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>

        <Field
          label="Decimales"
          hint="Cuántas cifras lleva tras la coma (los céntimos son 2)."
        >
          <Select value={decimals} onValueChange={setDecimals}>
            <SelectTrigger className={FIELD_SELECT}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DECIMAL_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option} decimales
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <FormError>{error}</FormError>
      </FormDrawerBody>

      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={saving || !code.trim() || !name.trim() || !symbol.trim()}
        >
          {saving ? "Creando…" : "Crear moneda"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

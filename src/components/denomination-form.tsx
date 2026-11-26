"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FORM_DRAWER_FORM,
  FormDrawerBody,
  FormDrawerFooter,
  useFormDrawer,
} from "@/components/form-drawer";
import { ChoiceGroup, Field, FormError } from "@/components/form-field";
import {
  createDenomination,
  updateDenomination,
} from "@/app/actions/currency-actions";
import {
  DENOMINATION_KINDS,
  DENOMINATION_KIND_LABELS,
  type DenominationKind,
} from "@/lib/domain";
import { type DisplayCurrency } from "@/lib/format";
import { minorToAmountInput } from "@/lib/money";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

const KIND_OPTIONS = DENOMINATION_KINDS.map((kind) => ({
  value: kind,
  label: DENOMINATION_KIND_LABELS[kind],
}));

/**
 * Alta o edición de una denominación (vive en un drawer). Con
 * `denomination` edita y cierra al guardar. Sin ella crea y el drawer se
 * QUEDA abierto con el valor vacío: las denominaciones se dan de alta en
 * serie (1, 5, 10, 20…) y cerrar tras cada una obligaría a reabrirlo.
 */
export function DenominationForm({
  currency,
  denomination,
}: {
  currency: DisplayCurrency & { id: string };
  denomination?: { id: string; valueMinor: number; kind: string };
}) {
  const { showToast } = useUI();
  const { setBusy, close } = useFormDrawer();
  const valueRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(
    denomination ? minorToAmountInput(denomination.valueMinor, currency) : ""
  );
  const [kind, setKind] = useState<DenominationKind>(
    (denomination?.kind as DenominationKind | undefined) ?? "BILL"
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);

    if (denomination) {
      const result = await runAction(() =>
        updateDenomination({ id: denomination.id, value, kind })
      );
      if (result.success) {
        // `saving` sigue en true mientras se cierra (anti doble envío).
        showToast("Denominación actualizada");
        close();
      } else {
        setSaving(false);
        setBusy(false);
        setError(result.error);
      }
      return;
    }

    const result = await runAction(() =>
      createDenomination({ currencyId: currency.id, value, kind })
    );
    // En el alta el formulario sigue abierto. No hay riesgo de doble envío:
    // tras un éxito el valor queda vacío y el botón, deshabilitado.
    setSaving(false);
    setBusy(false);
    if (result.success) {
      showToast("Denominación añadida");
      setValue("");
      valueRef.current?.focus();
    } else {
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
        <ChoiceGroup
          label="Tipo de denominación"
          options={KIND_OPTIONS}
          value={kind}
          onChange={setKind}
        />
        <Field
          label={`Valor en ${currency.code}`}
          hint={
            denomination
              ? undefined
              : "Puedes añadir varias seguidas: el formulario no se cierra."
          }
        >
          <Input
            ref={valueRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder={currency.decimalPlaces > 0 ? "0.25" : "1000"}
            autoComplete="off"
            required
          />
        </Field>
        <FormError>{error}</FormError>
      </FormDrawerBody>
      <FormDrawerFooter>
        {!denomination && (
          <Button
            variant="ghost"
            size="lg"
            className="flex-none"
            disabled={saving}
            onClick={close}
          >
            Listo
          </Button>
        )}
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={saving || !value.trim()}
        >
          {saving
            ? "Guardando…"
            : denomination
              ? "Guardar cambios"
              : "Añadir"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

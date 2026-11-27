"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { setCurrencyKind } from "@/app/actions/currency-actions";
import { type CurrencyKind } from "@/lib/domain";
import { useUI } from "@/lib/ui-store";

// Rótulos cortos para el control segmentado (CURRENCY_KIND_LABELS trae
// «Digital (sin efectivo)», que no cabe en media tarjeta); el detalle lo da
// la línea de ayuda de debajo.
const KIND_OPTIONS: { value: CurrencyKind; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "DIGITAL", label: "Digital" },
];

const KIND_HELP: Record<CurrencyKind, string> = {
  CASH: "Admite denominaciones, arqueos y cuentas de caja.",
  DIGITAL: "Solo saldo: sin denominaciones ni cuentas de caja.",
};

// Cambia la clasificación de la moneda (efectivo ↔ digital). Elegir la otra
// opción NO aplica nada: la deja marcada como pendiente y pide confirmación
// inline. Pasar a digital lo valida la action: sin denominaciones ni cuentas
// de efectivo/caja en esta moneda.
export function CurrencyKindEditor({
  currencyId,
  kind,
}: {
  currencyId: string;
  kind: string;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDigital = kind === "DIGITAL";
  const currentKind: CurrencyKind = isDigital ? "DIGITAL" : "CASH";
  const nextKind: CurrencyKind = isDigital ? "CASH" : "DIGITAL";
  // Mientras se confirma, el control muestra la opción pendiente.
  const shownKind = confirming ? nextKind : currentKind;

  const apply = async () => {
    setSaving(true);
    setError(null);
    const result = await setCurrencyKind({ id: currencyId, kind: nextKind });
    setSaving(false);
    setConfirming(false);
    if (result.success) {
      showToast(
        nextKind === "DIGITAL"
          ? "Moneda marcada como digital"
          : "Moneda marcada como efectivo"
      );
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <CardTitle>Clasificación</CardTitle>
        <div className="flex flex-col gap-1.5">
          <Segmented
            layout="fill"
            ariaLabel="Clasificación de la moneda"
            options={KIND_OPTIONS.map((option) => ({
              ...option,
              disabled: saving,
            }))}
            value={shownKind}
            onValueChange={(value) => {
              setError(null);
              setConfirming(value !== currentKind);
            }}
          />
          <p className="text-xs text-muted">{KIND_HELP[shownKind]}</p>
        </div>
        {confirming && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={() => void apply()} disabled={saving}>
              {saving
                ? "Guardando…"
                : nextKind === "DIGITAL"
                  ? "Convertir a digital"
                  : "Convertir a efectivo"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => setConfirming(false)}
            >
              Cancelar
            </Button>
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {error}
          </div>
        )}
      </section>
    </Card>
  );
}

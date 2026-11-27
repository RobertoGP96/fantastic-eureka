"use client";

import { useState } from "react";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { Card, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { setCurrencyKind } from "@/app/actions/currency-actions";
import { type CurrencyKind } from "@/lib/domain";
import { runAction } from "@/lib/run-action";
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
// opción NO aplica nada: abre la confirmación en drawer. Pasar a digital lo
// valida la action (sin denominaciones ni cuentas de efectivo/caja en esta
// moneda): si no procede, el motivo se muestra en el propio drawer.
export function CurrencyKindEditor({
  currencyId,
  kind,
}: {
  currencyId: string;
  kind: string;
}) {
  const { showToast } = useUI();
  const [confirming, setConfirming] = useState(false);
  // Destino fijado AL ABRIR la confirmación: tras guardar, `kind` ya llega
  // cambiado y, sin esto, el drawer preguntaría lo contrario mientras se
  // cierra.
  const [target, setTarget] = useState<CurrencyKind>("DIGITAL");

  const currentKind: CurrencyKind = kind === "DIGITAL" ? "DIGITAL" : "CASH";

  const apply = async () => {
    const result = await runAction(() =>
      setCurrencyKind({ id: currencyId, kind: target })
    );
    if (!result.success) return result.error;
    showToast(
      target === "DIGITAL"
        ? "Moneda marcada como digital"
        : "Moneda marcada como efectivo"
    );
    setConfirming(false);
    return null;
  };

  return (
    <Card asChild>
      <section className="flex flex-col gap-3">
        <CardTitle>Clasificación</CardTitle>
        <div className="flex flex-col gap-1.5">
          <Segmented
            layout="fill"
            ariaLabel="Clasificación de la moneda"
            options={KIND_OPTIONS}
            value={currentKind}
            onValueChange={(value) => {
              if (value === currentKind) return;
              setTarget(value);
              setConfirming(true);
            }}
          />
          <p className="text-xs text-muted">{KIND_HELP[currentKind]}</p>
        </div>

        <ConfirmDrawer
          open={confirming}
          onClose={() => setConfirming(false)}
          title={
            target === "CASH"
              ? "¿Convertir a efectivo?"
              : "¿Convertir a digital?"
          }
          description={
            target === "CASH"
              ? "La moneda pasará a admitir billetes y monedas, arqueos y cuentas de efectivo o caja."
              : "La moneda dejará de admitir denominaciones y cuentas de efectivo o caja. Solo es posible si hoy no tiene ninguna."
          }
          confirmLabel="Confirmar"
          busyLabel="Guardando…"
          tone="default"
          onConfirm={apply}
        />
      </section>
    </Card>
  );
}

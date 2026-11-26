"use client";

import { useState } from "react";
import { Banknote, CreditCard } from "lucide-react";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { Button } from "@/components/ui/button";
import { setCurrencyKind } from "@/app/actions/currency-actions";
import {
  CURRENCY_KIND_LABELS,
  type CurrencyKind,
} from "@/lib/domain";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

// Cambia la clasificación de la moneda (efectivo ↔ digital) con confirmación
// en drawer. Pasar a digital lo valida la action (sin denominaciones ni
// cuentas de efectivo/caja en esta moneda): si no procede, el motivo se
// muestra en el propio drawer.
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

  const isDigital = kind === "DIGITAL";
  const Icon = isDigital ? CreditCard : Banknote;

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
    <section className="rounded-2xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <div className="text-sm font-bold text-heading">
            {CURRENCY_KIND_LABELS[kind as CurrencyKind] ?? kind}
          </div>
          <div className="text-xs text-muted">
            {isDigital
              ? "Solo saldo: sin denominaciones ni cuentas de caja."
              : "Admite denominaciones, arqueos y cuentas de caja."}
          </div>
        </div>
        <Button
          size="sm"
          variant="chip"
          className="flex-none"
          onClick={() => {
            setTarget(isDigital ? "CASH" : "DIGITAL");
            setConfirming(true);
          }}
        >
          {isDigital ? "Convertir a efectivo" : "Convertir a digital"}
        </Button>
      </div>

      <ConfirmDrawer
        open={confirming}
        onClose={() => setConfirming(false)}
        title={
          target === "CASH" ? "¿Convertir a efectivo?" : "¿Convertir a digital?"
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
  );
}

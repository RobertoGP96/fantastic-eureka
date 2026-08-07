"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setCurrencyKind } from "@/app/actions/currency-actions";
import {
  CURRENCY_KIND_LABELS,
  type CurrencyKind,
} from "@/lib/domain";
import { useUI } from "@/lib/ui-store";

// Cambia la clasificación de la moneda (efectivo ↔ digital) con confirmación
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
  const nextKind: CurrencyKind = isDigital ? "CASH" : "DIGITAL";
  const Icon = isDigital ? CreditCard : Banknote;

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
    <section className="rounded-[18px] border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-chip text-brand">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-navy">
            {CURRENCY_KIND_LABELS[kind as CurrencyKind] ?? kind}
          </div>
          <div className="text-[11.5px] text-muted">
            {isDigital
              ? "Solo saldo: sin denominaciones ni cuentas de caja."
              : "Admite denominaciones, arqueos y cuentas de caja."}
          </div>
        </div>
        {confirming ? (
          <div className="flex flex-none items-center gap-2">
            <Button size="sm" onClick={() => void apply()} disabled={saving}>
              {saving ? "Guardando…" : "Confirmar"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="chip"
            className="flex-none"
            onClick={() => setConfirming(true)}
          >
            {isDigital ? "Convertir a efectivo" : "Convertir a digital"}
          </Button>
        )}
      </div>
      {error && (
        <div className="mt-2.5 rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}
    </section>
  );
}

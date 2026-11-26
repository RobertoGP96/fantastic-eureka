"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createCashCount } from "@/app/actions/cash-count-actions";
import {
  DenominationCounter,
  type CounterDenomination,
} from "@/components/denomination-counter";
import { FormError } from "@/components/form-field";
import { SplitLayout } from "@/components/page-body";
import { countedTotalMinor } from "@/lib/counting";
import { useUI } from "@/lib/ui-store";
import { runAction } from "@/lib/run-action";
import { fmtMinor, fmtSignedMinor, type DisplayCurrency } from "@/lib/format";

export function CountForm({
  account,
  currency,
  denominations,
  expectedMinor,
}: {
  account: { id: string; name: string };
  currency: DisplayCurrency;
  denominations: CounterDenomination[];
  expectedMinor: number;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [createAdjustment, setCreateAdjustment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setQty = (id: string, qty: number) => {
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const totalMinor = useMemo(
    () => countedTotalMinor(denominations, quantities),
    [denominations, quantities]
  );
  const differenceMinor = totalMinor - expectedMinor;

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await runAction(() =>
      createCashCount({
        accountId: account.id,
        note: note.trim() || undefined,
        createAdjustment,
        lines: denominations.map((d) => ({
          denominationId: d.id,
          quantity: quantities[d.id] ?? 0,
        })),
      })
    );
    if (result.success) {
      // `saving` sigue en true mientras navega: evita un arqueo duplicado.
      showToast("Arqueo guardado");
      // Diferido: navegar en el mismo tick en que resuelve la action hace
      // que Next descarte su resultado y vuelva a pedir la página. Sin
      // `router.refresh()`: la action ya revalida la cuenta y /conteo.
      setTimeout(() => router.push(`/cuentas/${account.id}`), 0);
    } else {
      setSaving(false);
      setError(result.error);
    }
  };

  return (
    <form
      // Mientras no cabe en dos columnas, una sola de ancho de lectura; al
      // partirse (SplitLayout) ocupa todo el panel.
      className="max-w-xl @4xl:max-w-none"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {/* Escritorio: contadores a la izquierda y, fijo a la derecha, el
          resumen (total, diferencia, ajuste, nota y Guardar) siempre a la
          vista mientras se cuenta. En móvil el resumen cae al final, como
          siempre. El total vive en UN solo sitio del DOM. */}
      <SplitLayout
        main={
          <DenominationCounter
            denominations={denominations}
            quantities={quantities}
            onQtyChange={setQty}
            currency={currency}
          />
        }
        aside={
          <>
            <div className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink-soft">
                  Total contado
                </span>
                <span className="money text-[22px] font-bold tracking-[-0.5px] text-heading">
                  {fmtMinor(totalMinor, currency)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 border-t border-line-2 pt-2.5">
                <span className="text-sm text-muted">
                  Teórico: {fmtMinor(expectedMinor, currency)}
                </span>
                {differenceMinor === 0 ? (
                  <Badge variant="ok">Cuadra</Badge>
                ) : (
                  <Badge variant={differenceMinor > 0 ? "warn" : "danger"}>
                    {differenceMinor > 0 ? "Sobra " : "Falta "}
                    {fmtMinor(Math.abs(differenceMinor), currency)}
                  </Badge>
                )}
              </div>
            </div>

            <label className="flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-3">
              <input
                type="checkbox"
                checked={createAdjustment}
                onChange={(e) => setCreateAdjustment(e.target.checked)}
                className="size-4 flex-none accent-primary"
              />
              <span className="text-sm font-medium text-ink-soft">
                Registrar ajuste por la diferencia
                {differenceMinor !== 0 &&
                  ` (${fmtSignedMinor(differenceMinor, currency)})`}
              </span>
            </label>

            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Nota (opcional)"
              aria-label="Nota (opcional)"
            />

            <FormError>{error}</FormError>

            <Button type="submit" size="lg" disabled={saving}>
              {saving ? "Guardando…" : "Guardar arqueo"}
            </Button>
          </>
        }
      />
    </form>
  );
}

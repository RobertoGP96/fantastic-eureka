"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { createCashCount } from "@/app/actions/cash-count-actions";
import {
  DenominationCounter,
  type CounterDenomination,
} from "@/components/denomination-counter";
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
      router.push(`/cuentas/${account.id}`);
      router.refresh();
    } else {
      setSaving(false);
      setError(result.error);
    }
  };

  // El propio <form> es la rejilla: denominaciones a la izquierda y, en
  // escritorio, el resumen fijo a la derecha mientras se recorre la lista.
  return (
    <form
      className="grid gap-5 @4xl/main:grid-cols-12"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <Card
        padding="none"
        className="min-w-0 self-start overflow-hidden @4xl/main:col-span-8"
      >
        <DenominationCounter
          denominations={denominations}
          quantities={quantities}
          onQtyChange={setQty}
          currency={currency}
        />
      </Card>

      <div className="flex min-w-0 flex-col gap-4 self-start @4xl/main:sticky @4xl/main:top-4 @4xl/main:col-span-4">
        {/* OJO, fijado por el test de arqueo: el total contado es UN solo
            nodo de texto («1 750 CUP») y es el único elemento de la pantalla
            con ese texto exacto. Por eso no se usa StatCard (parte cifra y
            unidad) y el teórico vive dentro de la frase «Teórico: …». */}
        <Card>
          <div className="text-xs font-medium text-muted">Total contado</div>
          <div className="money mt-1.5 text-[22px] font-semibold tracking-tight break-words text-heading">
            {fmtMinor(totalMinor, currency)}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-2 pt-3">
            <span className="money text-sm text-muted">
              {`Teórico: ${fmtMinor(expectedMinor, currency)}`}
            </span>
            {differenceMinor === 0 ? (
              <Badge variant="ok">Cuadra</Badge>
            ) : (
              <Badge
                variant={differenceMinor > 0 ? "warn" : "danger"}
                className="money"
              >
                {differenceMinor > 0 ? "Sobra " : "Falta "}
                {fmtMinor(Math.abs(differenceMinor), currency)}
              </Badge>
            )}
          </div>
        </Card>

        <label className="flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-2.5">
          <input
            type="checkbox"
            checked={createAdjustment}
            onChange={(e) => setCreateAdjustment(e.target.checked)}
            className="size-4 flex-none accent-brand"
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

        {error && (
          <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={saving}>
          {saving ? "Guardando…" : "Guardar arqueo"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createCashCount } from "@/app/actions/cash-count-actions";
import { useUI } from "@/lib/ui-store";
import { fmtMinor, fmtSignedMinor, type DisplayCurrency } from "@/lib/format";
import {
  DENOMINATION_KIND_LABELS,
  type DenominationKind,
} from "@/lib/domain";

interface DenominationInfo {
  id: string;
  valueMinor: number;
  kind: string;
}

const MAX_QTY = 1_000_000;

export function CountForm({
  account,
  currency,
  denominations,
  expectedMinor,
}: {
  account: { id: string; name: string };
  currency: DisplayCurrency;
  denominations: DenominationInfo[];
  expectedMinor: number;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [createAdjustment, setCreateAdjustment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setQty = (id: string, value: number) => {
    const qty = Math.max(0, Math.min(MAX_QTY, Math.trunc(value) || 0));
    setQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const totalMinor = useMemo(
    () =>
      denominations.reduce(
        (acc, d) => acc + d.valueMinor * (quantities[d.id] ?? 0),
        0
      ),
    [denominations, quantities]
  );
  const differenceMinor = totalMinor - expectedMinor;

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await createCashCount({
      accountId: account.id,
      note: note.trim() || undefined,
      createAdjustment,
      lines: denominations.map((d) => ({
        denominationId: d.id,
        quantity: quantities[d.id] ?? 0,
      })),
    });
    setSaving(false);
    if (result.success) {
      showToast("Arqueo guardado");
      router.push(`/cuentas/${account.id}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-col gap-2">
        {denominations.map((d) => {
          const qty = quantities[d.id] ?? 0;
          const subtotal = d.valueMinor * qty;
          return (
            <div
              key={d.id}
              className="flex items-center gap-3 rounded-[16px] border border-line bg-white px-3.5 py-2.5"
            >
              <div className="w-[76px] flex-none">
                <div className="text-[13.5px] font-bold text-navy">
                  {fmtMinor(d.valueMinor, currency)}
                </div>
                <div className="text-[10.5px] text-muted">
                  {DENOMINATION_KIND_LABELS[d.kind as DenominationKind] ??
                    d.kind}
                </div>
              </div>
              <div className="flex flex-1 items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setQty(d.id, qty - 1)}
                  aria-label={`Quitar ${fmtMinor(d.valueMinor, currency)}`}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-app text-brand-mid transition-[color,transform] hover:text-brand active:scale-90"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  value={qty === 0 ? "" : String(qty)}
                  onChange={(e) => setQty(d.id, Number(e.target.value))}
                  inputMode="numeric"
                  placeholder="0"
                  className="h-9 w-16 rounded-[10px] px-1 text-center font-semibold"
                  aria-label={`Cantidad de ${fmtMinor(d.valueMinor, currency)}`}
                />
                <button
                  type="button"
                  onClick={() => setQty(d.id, qty + 1)}
                  aria-label={`Añadir ${fmtMinor(d.valueMinor, currency)}`}
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-app text-brand-mid transition-[color,transform] hover:text-brand active:scale-90"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="w-[92px] flex-none text-right text-[12.5px] font-semibold text-ink-soft">
                {subtotal > 0 ? fmtMinor(subtotal, currency) : "—"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[18px] border border-line bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Total contado
          </span>
          <span className="text-[22px] font-bold tracking-[-0.5px] text-navy">
            {fmtMinor(totalMinor, currency)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-line-2 pt-2.5">
          <span className="text-[12.5px] text-muted">
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

      <label className="flex items-center gap-2.5 rounded-[13px] border border-line bg-white px-3.5 py-3">
        <input
          type="checkbox"
          checked={createAdjustment}
          onChange={(e) => setCreateAdjustment(e.target.checked)}
          className="h-4 w-4 accent-[#14417f]"
        />
        <span className="text-[12.5px] font-medium text-ink-soft">
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
      />

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={saving}>
        {saving ? "Guardando…" : "Guardar arqueo"}
      </Button>
    </form>
  );
}

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
import { countedTotalMinor } from "@/lib/counting";
import { useUI } from "@/lib/ui-store";
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
      <DenominationCounter
        denominations={denominations}
        quantities={quantities}
        onQtyChange={setQty}
        currency={currency}
      />

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
          className="h-4 w-4 accent-[#0c6b70]"
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

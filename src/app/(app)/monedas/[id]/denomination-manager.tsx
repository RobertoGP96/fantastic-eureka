"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createDenomination,
  toggleDenomination,
} from "@/app/actions/currency-actions";
import { useUI } from "@/lib/ui-store";
import { fmtMinor, type DisplayCurrency } from "@/lib/format";
import {
  DENOMINATION_KINDS,
  DENOMINATION_KIND_LABELS,
  type DenominationKind,
} from "@/lib/domain";

export interface DenominationItem {
  id: string;
  valueMinor: number;
  kind: string;
  active: boolean;
  usageCount: number;
}

export function DenominationManager({
  currency,
  denominations,
}: {
  currency: DisplayCurrency & { id: string };
  denominations: DenominationItem[];
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [value, setValue] = useState("");
  const [kind, setKind] = useState<string>("BILL");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const add = async () => {
    setSaving(true);
    setError(null);
    const result = await createDenomination({
      currencyId: currency.id,
      value,
      kind,
    });
    setSaving(false);
    if (result.success) {
      showToast("Denominación añadida");
      setValue("");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const toggle = async (id: string) => {
    const result = await toggleDenomination(id);
    if (result.success) {
      showToast(
        result.data.active ? "Denominación activada" : "Denominación oculta"
      );
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const groups = DENOMINATION_KINDS.map((groupKind) => ({
    kind: groupKind,
    items: denominations.filter((d) => d.kind === groupKind),
  }));

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <div className="text-[13px] font-bold text-navy">
          Nueva denominación
        </div>
        <div className="flex gap-2.5">
          <div className="grid flex-none grid-cols-2 gap-1.5">
            {DENOMINATION_KINDS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setKind(option)}
                className={`rounded-[10px] border px-3 py-2 text-[11.5px] font-semibold transition-colors ${
                  kind === option
                    ? "border-brand bg-chip text-brand"
                    : "border-line bg-white text-ink-soft hover:border-brand-soft"
                }`}
              >
                {DENOMINATION_KIND_LABELS[option]}
              </button>
            ))}
          </div>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder={currency.decimalPlaces > 0 ? "0.25" : "1000"}
            aria-label={`Valor en ${currency.code}`}
            required
          />
          <Button type="submit" disabled={saving || !value.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {error && (
          <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
            {error}
          </div>
        )}
      </form>

      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.kind}>
              <h2 className="mb-2 text-[13.5px] font-bold text-navy">
                {DENOMINATION_KIND_LABELS[group.kind as DenominationKind]}s
              </h2>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {group.items.map((denomination) => (
                  <div
                    key={denomination.id}
                    className={`flex items-center justify-between gap-1.5 rounded-[13px] border border-line bg-white py-2 pr-1.5 pl-3 ${
                      denomination.active ? "" : "opacity-55"
                    }`}
                  >
                    <span className="truncate text-[12.5px] font-bold text-navy">
                      {fmtMinor(denomination.valueMinor, currency)}
                    </span>
                    <div className="flex flex-none items-center gap-1">
                      {denomination.usageCount > 0 && (
                        <Badge variant="neutral">
                          {denomination.usageCount}
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void toggle(denomination.id)}
                      >
                        {denomination.active ? "Ocultar" : "Activar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
      )}

      <p className="text-[11.5px] text-muted">
        Las denominaciones ocultas dejan de aparecer en los arqueos nuevos;
        las ya usadas en arqueos guardados no se pierden.
      </p>
    </div>
  );
}

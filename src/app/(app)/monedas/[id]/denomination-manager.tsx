"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EllipsisVertical,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  createDenomination,
  deleteDenomination,
  toggleDenomination,
  updateDenomination,
} from "@/app/actions/currency-actions";
import { useUI } from "@/lib/ui-store";
import { minorToAmountInput } from "@/lib/money";
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

/** Botonera BILL/COIN compartida por el alta y la edición. */
function KindPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (kind: string) => void;
}) {
  return (
    <div className="grid flex-none grid-cols-2 gap-1.5">
      {DENOMINATION_KINDS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`rounded-[10px] border px-3 py-2 text-[11.5px] font-semibold transition-colors ${
            value === option
              ? "border-brand bg-chip text-brand"
              : "border-line bg-white text-ink-soft hover:border-brand-soft"
          }`}
        >
          {DENOMINATION_KIND_LABELS[option]}
        </button>
      ))}
    </div>
  );
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editKind, setEditKind] = useState<string>("BILL");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  const update = async (id: string) => {
    setSaving(true);
    const result = await updateDenomination({
      id,
      value: editValue,
      kind: editKind,
    });
    setSaving(false);
    if (result.success) {
      showToast("Denominación actualizada");
      setEditingId(null);
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const remove = async (id: string) => {
    setSaving(true);
    const result = await deleteDenomination(id);
    setSaving(false);
    setConfirmDeleteId(null);
    if (result.success) {
      showToast("Denominación eliminada");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  // Las usadas en arqueos no se editan ni borran: alteraría el historial.
  const requestEdit = (denomination: DenominationItem) => {
    if (denomination.usageCount > 0) {
      showToast("Ya se usó en arqueos; ocúltala y crea una nueva");
      return;
    }
    setConfirmDeleteId(null);
    setEditingId(denomination.id);
    setEditValue(minorToAmountInput(denomination.valueMinor, currency));
    setEditKind(denomination.kind);
  };

  const requestDelete = (denomination: DenominationItem) => {
    if (denomination.usageCount > 0) {
      showToast("Se usó en arqueos guardados; ocúltala en su lugar");
      return;
    }
    setEditingId(null);
    setConfirmDeleteId(denomination.id);
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
          <KindPicker value={kind} onChange={setKind} />
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
                {group.items.map((denomination) =>
                  editingId === denomination.id ? (
                    <form
                      key={denomination.id}
                      className="col-span-full flex items-center gap-2 rounded-[13px] border border-brand-soft bg-white p-2.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void update(denomination.id);
                      }}
                    >
                      <KindPicker value={editKind} onChange={setEditKind} />
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        inputMode="decimal"
                        aria-label={`Nuevo valor en ${currency.code}`}
                        className="h-9 min-w-0"
                        autoFocus
                        required
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={saving || !editValue.trim()}
                      >
                        Guardar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </Button>
                    </form>
                  ) : confirmDeleteId === denomination.id ? (
                    <div
                      key={denomination.id}
                      className="col-span-full flex items-center gap-2 rounded-[13px] border border-line bg-white p-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-[12px] text-muted">
                        ¿Eliminar{" "}
                        {fmtMinor(denomination.valueMinor, currency)}?
                      </span>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={saving}
                        onClick={() => void remove(denomination.id)}
                      >
                        Eliminar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={saving}
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div
                      key={denomination.id}
                      className={`flex items-center justify-between gap-1.5 rounded-[13px] border border-line bg-white py-1.5 pr-1.5 pl-3 ${
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Opciones de ${fmtMinor(
                                denomination.valueMinor,
                                currency
                              )}`}
                            >
                              <EllipsisVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-40">
                            <DropdownMenuItem
                              onSelect={() => requestEdit(denomination)}
                            >
                              <Pencil />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => void toggle(denomination.id)}
                            >
                              {denomination.active ? <EyeOff /> : <Eye />}
                              {denomination.active ? "Ocultar" : "Activar"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => requestDelete(denomination)}
                            >
                              <Trash2 />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          )
      )}

      <p className="text-[11.5px] text-muted">
        Las denominaciones usadas en arqueos guardados no se pueden editar ni
        eliminar; ocúltalas y dejarán de aparecer en los arqueos nuevos.
      </p>
    </div>
  );
}

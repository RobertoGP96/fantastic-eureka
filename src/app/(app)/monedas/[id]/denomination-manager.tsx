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
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
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
} from "@/lib/domain";

// El alta y la rejilla son dos componentes porque en escritorio viven en
// columnas distintas (formulario en la lateral, teselas en la principal) y
// la página es quien arma la rejilla. No comparten estado.

export interface DenominationItem {
  id: string;
  valueMinor: number;
  kind: string;
  active: boolean;
  usageCount: number;
}

type ManagedCurrency = DisplayCurrency & { id: string };

const KIND_OPTIONS = DENOMINATION_KINDS.map((kind) => ({
  value: kind as string,
  label: DENOMINATION_KIND_LABELS[kind],
}));

/** Selector Billete/Moneda compartido por el alta y la edición. */
function KindPicker({
  value,
  onChange,
  layout,
}: {
  value: string;
  onChange: (kind: string) => void;
  layout: "fill" | "inline";
}) {
  return (
    <Segmented
      layout={layout}
      ariaLabel="Tipo de denominación"
      className={layout === "inline" ? "flex-none" : undefined}
      options={KIND_OPTIONS}
      value={value}
      onValueChange={onChange}
    />
  );
}

/** Tarjeta «Nueva denominación» (columna lateral del detalle de moneda). */
export function DenominationForm({ currency }: { currency: ManagedCurrency }) {
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

  return (
    <Card asChild>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <CardTitle>Nueva denominación</CardTitle>
        <KindPicker layout="fill" value={kind} onChange={setKind} />
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode="decimal"
            placeholder={currency.decimalPlaces > 0 ? "0.25" : "1000"}
            aria-label={`Valor en ${currency.code}`}
            className="money"
            required
          />
          <Button
            type="submit"
            className="flex-none"
            disabled={saving || !value.trim()}
            aria-label="Añadir denominación"
          >
            <Plus className="size-4" />
            Añadir
          </Button>
        </div>
        {error && (
          <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
            {error}
          </div>
        )}
      </form>
    </Card>
  );
}

/** Teselas de denominaciones por tipo, con edición y borrado en línea. */
export function DenominationGrid({
  currency,
  denominations,
}: {
  currency: ManagedCurrency;
  denominations: DenominationItem[];
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editKind, setEditKind] = useState<string>("BILL");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    <div className="flex flex-col gap-5">
      {denominations.length === 0 && (
        <Card dashed className="py-6 text-center text-sm text-muted">
          Sin denominaciones todavía. Añade la primera con «Nueva
          denominación».
        </Card>
      )}

      {groups.map(
        (group) =>
          group.items.length > 0 && (
            <section key={group.kind}>
              <SectionHeader
                title={`${DENOMINATION_KIND_LABELS[group.kind]}s`}
              />
              <div className="grid grid-cols-2 gap-3 @2xl/main:grid-cols-3 @4xl/main:grid-cols-4">
                {group.items.map((denomination) => {
                  const label = fmtMinor(denomination.valueMinor, currency);
                  // Editar y confirmar borrado ocupan la fila entera de la
                  // rejilla: en una tesela no caben sus controles.
                  if (editingId === denomination.id) {
                    return (
                      <form
                        key={denomination.id}
                        className="col-span-full flex flex-wrap items-center gap-2 rounded-2xl border border-brand-soft bg-card p-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void update(denomination.id);
                        }}
                      >
                        <KindPicker
                          layout="inline"
                          value={editKind}
                          onChange={setEditKind}
                        />
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          inputMode="decimal"
                          aria-label={`Nuevo valor en ${currency.code}`}
                          className="money min-w-24 flex-1"
                          autoFocus
                          required
                        />
                        <div className="ml-auto flex items-center gap-2">
                          <Button
                            type="submit"
                            disabled={saving || !editValue.trim()}
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="ghost"
                            disabled={saving}
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    );
                  }
                  if (confirmDeleteId === denomination.id) {
                    return (
                      <div
                        key={denomination.id}
                        className="col-span-full flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card p-3"
                      >
                        <span className="money min-w-0 flex-1 basis-40 text-sm text-ink-soft">
                          ¿Eliminar {label}?
                        </span>
                        <div className="ml-auto flex items-center gap-2">
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
                      </div>
                    );
                  }
                  return (
                    <div
                      key={denomination.id}
                      className="flex items-start gap-1 rounded-2xl border border-line bg-card py-1 pr-1 pl-3.5"
                    >
                      {/* El valor y sus insignias comparten línea si caben y,
                          si no, las insignias bajan: el valor nunca se
                          recorta por ellas. `py-2.5` centra la primera línea
                          con el botón de 40 px. */}
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 py-2.5">
                        <span className="money min-w-0 truncate text-sm font-semibold text-heading">
                          {label}
                        </span>
                        {denomination.usageCount > 0 && (
                          <Badge variant="neutral" className="money">
                            {denomination.usageCount}
                          </Badge>
                        )}
                        {/* Oculta: insignia y contraste normal, no opacidad. */}
                        {!denomination.active && (
                          <Badge variant="neutral">Oculta</Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="flex-none"
                            aria-label={`Opciones de ${label}`}
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
                  );
                })}
              </div>
            </section>
          )
      )}

      <p className="text-xs text-muted">
        Las denominaciones usadas en arqueos guardados no se pueden editar ni
        eliminar; ocúltalas y dejarán de aparecer en los arqueos nuevos.
      </p>
    </div>
  );
}

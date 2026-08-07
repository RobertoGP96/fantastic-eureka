"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { saveDashboardPrefs } from "@/app/actions/dashboard-actions";
import {
  DASHBOARD_SECTIONS,
  MAX_WIDGETS,
  WIDGET_TYPE_LABELS,
  defaultDashboardPrefs,
  widgetIdFromKey,
  widgetSectionKey,
  type DashboardPrefs,
  type DashboardSectionPref,
  type DashboardWidget,
  type WidgetType,
} from "@/lib/dashboard-prefs";
import { useUI } from "@/lib/ui-store";

export interface CustomizerAccount {
  id: string;
  name: string;
  type: string;
  currencyCode: string;
}

export interface CustomizerCurrency {
  id: string;
  code: string;
}

const FIXED_LABELS = new Map<string, string>(
  DASHBOARD_SECTIONS.map((s) => [s.key, s.label])
);

const newWidgetId = () =>
  `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function CheckRow({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 rounded-[12px] px-1 py-1.5 text-left"
    >
      <span
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-colors ${
          checked
            ? "border-brand bg-brand text-white"
            : "border-line bg-white text-transparent"
        }`}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-soft">
        {label}
      </span>
    </button>
  );
}

// Personalización de Inicio: secciones y gadgets (orden/visibilidad),
// gadgets nuevos con su configuración y qué cuentas lista la sección
// Cuentas. Se guarda en User.dashboardPrefs vía saveDashboardPrefs.
export function DashboardCustomizer({
  prefs,
  accounts,
  currencies,
}: {
  prefs: DashboardPrefs;
  accounts: CustomizerAccount[];
  currencies: CustomizerCurrency[];
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState<DashboardSectionPref[]>(
    prefs.sections
  );
  const [widgets, setWidgets] = useState<DashboardWidget[]>(prefs.widgets);
  const [accountIds, setAccountIds] = useState<string[] | null>(
    prefs.accountIds
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Alta de gadget en curso
  const [addType, setAddType] = useState<WidgetType | null>(null);
  const [addAccountId, setAddAccountId] = useState("");
  const [addShowMovements, setAddShowMovements] = useState(false);
  const [addShowDenominations, setAddShowDenominations] = useState(false);
  const [addFromId, setAddFromId] = useState("");
  const [addToId, setAddToId] = useState("");

  const widgetById = useMemo(
    () => new Map(widgets.map((w) => [w.id, w])),
    [widgets]
  );
  const accountById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts]
  );
  const currencyById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies]
  );

  const openSheet = (next: boolean) => {
    // Al abrir se parte SIEMPRE del estado guardado (props del servidor).
    if (next) {
      setSections(prefs.sections);
      setWidgets(prefs.widgets);
      setAccountIds(prefs.accountIds);
      setAddType(null);
      setError(null);
    }
    setOpen(next);
  };

  const labelFor = (key: string): string => {
    const widgetId = widgetIdFromKey(key);
    if (!widgetId) return FIXED_LABELS.get(key) ?? key;
    const widget = widgetById.get(widgetId);
    if (!widget) return key;
    if (widget.type === "accountCard") {
      const account = widget.accountId
        ? accountById.get(widget.accountId)
        : undefined;
      return `Cuenta · ${account?.name ?? "no disponible"}`;
    }
    if (widget.type === "ratePair") {
      const from = currencyById.get(widget.fromCurrencyId ?? "")?.code ?? "?";
      const to = currencyById.get(widget.toCurrencyId ?? "")?.code ?? "?";
      return `Tasa ${from} → ${to}`;
    }
    return WIDGET_TYPE_LABELS[widget.type];
  };

  const toggle = (key: string) => {
    setSections((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const move = (index: number, delta: -1 | 1) => {
    setSections((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeWidget = (key: string) => {
    const widgetId = widgetIdFromKey(key);
    if (!widgetId) return;
    setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
    setSections((prev) => prev.filter((s) => s.key !== key));
  };

  const startAdd = (type: WidgetType) => {
    setAddType(type);
    setAddAccountId(accounts[0]?.id ?? "");
    setAddShowMovements(false);
    setAddShowDenominations(false);
    setAddFromId(currencies[0]?.id ?? "");
    setAddToId(currencies[1]?.id ?? "");
  };

  const confirmAdd = () => {
    if (!addType || widgets.length >= MAX_WIDGETS) return;
    let widget: DashboardWidget | null = null;
    if (addType === "accountCard") {
      if (!addAccountId) return;
      widget = {
        id: newWidgetId(),
        type: addType,
        accountId: addAccountId,
        showMovements: addShowMovements,
        showDenominations: addShowDenominations,
      };
    } else if (addType === "ratePair") {
      if (!addFromId || !addToId || addFromId === addToId) return;
      widget = {
        id: newWidgetId(),
        type: addType,
        fromCurrencyId: addFromId,
        toCurrencyId: addToId,
      };
    } else {
      widget = { id: newWidgetId(), type: addType };
    }
    setWidgets((prev) => [...prev, widget]);
    setSections((prev) => [
      ...prev,
      { key: widgetSectionKey(widget.id), visible: true },
    ]);
    setAddType(null);
  };

  const toggleAccount = (id: string) => {
    setAccountIds((prev) => {
      const current = prev ?? accounts.map((a) => a.id);
      return current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
    });
  };

  const reset = () => {
    const defaults = defaultDashboardPrefs();
    setSections(defaults.sections);
    setWidgets(defaults.widgets);
    setAccountIds(defaults.accountIds);
    setAddType(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    const result = await saveDashboardPrefs({ sections, widgets, accountIds });
    setSaving(false);
    if (result.success) {
      setOpen(false);
      showToast("Inicio actualizado");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const addAccount = addAccountId ? accountById.get(addAccountId) : undefined;

  return (
    <Sheet open={open} onOpenChange={openSheet}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Personalizar Inicio"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[88vh] w-full overflow-y-auto rounded-t-[22px] border-line sm:max-w-md"
      >
        <SheetHeader className="pb-0">
          <SheetTitle className="text-[15px] text-navy">
            Personalizar Inicio
          </SheetTitle>
          <SheetDescription className="text-[12.5px] text-muted">
            Ordena, oculta y añade gadgets a tu vista de Inicio.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 px-4">
          {sections.map((item, index) => {
            const isWidget = widgetIdFromKey(item.key) !== null;
            return (
              <div
                key={item.key}
                className={`flex items-center gap-2 rounded-[14px] border px-3 py-2.5 transition-colors ${
                  item.visible
                    ? "border-line bg-white"
                    : "border-line-2 bg-app opacity-70"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggle(item.key)}
                  aria-label={
                    item.visible
                      ? `Ocultar ${labelFor(item.key)}`
                      : `Mostrar ${labelFor(item.key)}`
                  }
                  className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] transition-colors ${
                    item.visible ? "bg-chip text-brand" : "bg-white text-muted"
                  }`}
                >
                  {item.visible ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink-soft">
                  {labelFor(item.key)}
                </span>
                {isWidget && (
                  <button
                    type="button"
                    onClick={() => removeWidget(item.key)}
                    aria-label={`Eliminar ${labelFor(item.key)}`}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-muted transition-colors hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Subir ${labelFor(item.key)}`}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-brand-mid transition-colors hover:text-brand disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === sections.length - 1}
                  aria-label={`Bajar ${labelFor(item.key)}`}
                  className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-brand-mid transition-colors hover:text-brand disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Alta de gadgets */}
        <div className="mx-4 rounded-[16px] border border-line bg-white p-3.5">
          <div className="mb-2 text-[12.5px] font-bold text-navy">
            Añadir gadget
          </div>
          {widgets.length >= MAX_WIDGETS ? (
            <p className="text-[12px] text-muted">
              Límite de {MAX_WIDGETS} gadgets alcanzado: elimina alguno para
              añadir otro.
            </p>
          ) : addType === null ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(Object.keys(WIDGET_TYPE_LABELS) as WidgetType[]).map((type) => {
                const disabled =
                  (type === "accountCard" && accounts.length === 0) ||
                  (type === "ratePair" && currencies.length < 2);
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={disabled}
                    onClick={() => startAdd(type)}
                    className="flex items-center gap-1.5 rounded-[12px] border border-line px-3 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {WIDGET_TYPE_LABELS[type]}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <div className="text-[12px] font-semibold text-ink-soft">
                {WIDGET_TYPE_LABELS[addType]}
              </div>
              {addType === "accountCard" && (
                <>
                  <Select value={addAccountId} onValueChange={setAddAccountId}>
                    <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
                      <SelectValue placeholder="Elige cuenta" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} · {account.currencyCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <CheckRow
                    checked={addShowMovements}
                    label="Mostrar los últimos movimientos"
                    onToggle={() => setAddShowMovements((v) => !v)}
                  />
                  {addAccount?.type === "CASH_BOX" && (
                    <CheckRow
                      checked={addShowDenominations}
                      label="Mostrar denominaciones en caja"
                      onToggle={() => setAddShowDenominations((v) => !v)}
                    />
                  )}
                </>
              )}
              {addType === "ratePair" && (
                <div className="flex items-center gap-2">
                  <Select value={addFromId} onValueChange={setAddFromId}>
                    <SelectTrigger className="h-10 flex-1 rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
                      <SelectValue placeholder="Origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.id} value={currency.id}>
                          {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[12px] text-muted">→</span>
                  <Select value={addToId} onValueChange={setAddToId}>
                    <SelectTrigger className="h-10 flex-1 rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
                      <SelectValue placeholder="Destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies
                        .filter((currency) => currency.id !== addFromId)
                        .map((currency) => (
                          <SelectItem key={currency.id} value={currency.id}>
                            {currency.code}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {addType === "currencyTotals" && (
                <p className="text-[12px] text-muted">
                  Muestra la suma de saldos por cada divisa, sin conversión.
                </p>
              )}
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setAddType(null)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={confirmAdd}
                  disabled={
                    (addType === "accountCard" && !addAccountId) ||
                    (addType === "ratePair" &&
                      (!addFromId || !addToId || addFromId === addToId))
                  }
                >
                  Añadir
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Cuentas visibles en la sección Cuentas */}
        {accounts.length > 0 && (
          <div className="mx-4 rounded-[16px] border border-line bg-white p-3.5">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[12.5px] font-bold text-navy">
                Cuentas visibles
              </div>
              <button
                type="button"
                onClick={() => setAccountIds(null)}
                disabled={accountIds === null}
                className="text-[11.5px] font-semibold text-brand-mid transition-colors hover:text-brand disabled:opacity-40"
              >
                Todas
              </button>
            </div>
            <p className="mb-1.5 text-[11px] text-muted">
              Qué cuentas lista la sección «Cuentas» de Inicio.
            </p>
            <div className="flex flex-col">
              {accounts.map((account) => (
                <CheckRow
                  key={account.id}
                  checked={accountIds === null || accountIds.includes(account.id)}
                  label={`${account.name} · ${account.currencyCode}`}
                  onToggle={() => toggleAccount(account.id)}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mx-4 rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
            {error}
          </div>
        )}

        <SheetFooter className="flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={reset}
            className="flex-none gap-1.5"
          >
            <RotateCcw className="h-4 w-4" />
            Restablecer
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex-1"
          >
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

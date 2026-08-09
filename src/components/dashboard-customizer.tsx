"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  PencilLine,
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
  DEFAULT_WIDGET_SIZE,
  MAX_WIDGETS,
  WIDGET_SIZES,
  WIDGET_SIZE_LABELS,
  WIDGET_TYPE_LABELS,
  defaultDashboardPrefs,
  type DashboardPrefs,
  type DashboardSectionPref,
  type DashboardWidget,
  type IncomeCardMetric,
  type IncomeCardPeriod,
  type IncomeCardVariant,
  type WidgetSize,
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

const selectTriggerCls =
  "h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink";

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

// Personalización de Inicio: orden/visibilidad de secciones, gadgets del
// panel bento (alta con configuración, tamaño y orden) y qué cuentas lista
// la sección Cuentas. Se guarda en User.dashboardPrefs vía saveDashboardPrefs.
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

  // Alta o edición de gadget en curso (editingId = null → alta)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addType, setAddType] = useState<WidgetType | null>(null);
  const [addSize, setAddSize] = useState<WidgetSize>("md");
  const [addAccountId, setAddAccountId] = useState("");
  const [addShowMovements, setAddShowMovements] = useState(false);
  const [addShowDenominations, setAddShowDenominations] = useState(false);
  const [addFromId, setAddFromId] = useState("");
  const [addToId, setAddToId] = useState("");
  // Configuración del «Resumen de ingresos»
  const [addVariant, setAddVariant] = useState<IncomeCardVariant>("soft");
  const [addMetric, setAddMetric] = useState<IncomeCardMetric>("income");
  const [addPeriod, setAddPeriod] = useState<IncomeCardPeriod>("month");
  const [addTitle, setAddTitle] = useState("");
  const [addShowTabs, setAddShowTabs] = useState(true);
  const [addShowDelta, setAddShowDelta] = useState(true);
  const [addShowIncome, setAddShowIncome] = useState(true);
  const [addShowExpense, setAddShowExpense] = useState(true);
  const [addShowNet, setAddShowNet] = useState(true);

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
      setEditingId(null);
      setError(null);
    }
    setOpen(next);
  };

  const widgetLabel = (widget: DashboardWidget): string => {
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
    if (widget.type === "incomeCard") {
      if (widget.title) return widget.title;
      const account = widget.accountId
        ? accountById.get(widget.accountId)
        : undefined;
      return account ? `Resumen · ${account.name}` : "Resumen de ingresos";
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

  const moveWidget = (index: number, delta: -1 | 1) => {
    setWidgets((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = prev.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeWidget = (id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    // Si se borra el gadget en edición, la edición se cancela.
    if (id === editingId) {
      setEditingId(null);
      setAddType(null);
    }
  };

  const startAdd = (type: WidgetType) => {
    setEditingId(null);
    setAddType(type);
    setAddSize(DEFAULT_WIDGET_SIZE[type]);
    setAddAccountId(type === "incomeCard" ? "all" : (accounts[0]?.id ?? ""));
    setAddShowMovements(false);
    setAddShowDenominations(false);
    setAddFromId(currencies[0]?.id ?? "");
    setAddToId(currencies[1]?.id ?? "");
    setAddVariant("soft");
    setAddMetric("income");
    setAddPeriod("month");
    setAddTitle("");
    setAddShowTabs(true);
    setAddShowDelta(true);
    setAddShowIncome(true);
    setAddShowExpense(true);
    setAddShowNet(true);
  };

  /** Prellena el formulario con la configuración del gadget. */
  const startEdit = (widget: DashboardWidget) => {
    setEditingId(widget.id);
    setAddType(widget.type);
    setAddSize(widget.size ?? DEFAULT_WIDGET_SIZE[widget.type]);
    setAddAccountId(
      widget.type === "incomeCard"
        ? (widget.accountId ?? "all")
        : (widget.accountId ?? accounts[0]?.id ?? "")
    );
    setAddShowMovements(widget.showMovements === true);
    setAddShowDenominations(widget.showDenominations === true);
    setAddFromId(widget.fromCurrencyId ?? currencies[0]?.id ?? "");
    setAddToId(widget.toCurrencyId ?? currencies[1]?.id ?? "");
    setAddVariant(widget.variant ?? "soft");
    setAddMetric(widget.metric ?? "income");
    setAddPeriod(widget.defaultPeriod ?? "month");
    setAddTitle(widget.title ?? "");
    setAddShowTabs(widget.showTabs !== false);
    setAddShowDelta(widget.showDelta !== false);
    setAddShowIncome(widget.showIncome !== false);
    setAddShowExpense(widget.showExpense !== false);
    setAddShowNet(widget.showNet !== false);
  };

  const confirmAdd = () => {
    if (!addType) return;
    if (!editingId && widgets.length >= MAX_WIDGETS) return;
    const id = editingId ?? newWidgetId();
    let widget: DashboardWidget | null = null;
    if (addType === "accountCard") {
      if (!addAccountId || addAccountId === "all") return;
      widget = {
        id,
        type: addType,
        size: addSize,
        accountId: addAccountId,
        showMovements: addShowMovements,
        showDenominations: addShowDenominations,
      };
    } else if (addType === "ratePair") {
      if (!addFromId || !addToId || addFromId === addToId) return;
      widget = {
        id,
        type: addType,
        size: addSize,
        fromCurrencyId: addFromId,
        toCurrencyId: addToId,
      };
    } else if (addType === "incomeCard") {
      const title = addTitle.trim();
      widget = {
        id,
        type: addType,
        size: addSize,
        accountId: addAccountId === "all" ? undefined : addAccountId,
        variant: addVariant,
        metric: addMetric,
        defaultPeriod: addPeriod,
        title: title.length > 0 ? title.slice(0, 40) : undefined,
        showTabs: addShowTabs,
        showDelta: addShowDelta,
        showIncome: addShowIncome,
        showExpense: addShowExpense,
        showNet: addShowNet,
      };
    } else {
      widget = { id, type: addType, size: addSize };
    }
    const next = widget;
    if (editingId) {
      setWidgets((prev) => prev.map((w) => (w.id === editingId ? next : w)));
    } else {
      setWidgets((prev) => [...prev, next]);
    }
    setAddType(null);
    setEditingId(null);
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
    setEditingId(null);
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

  const addAccount =
    addAccountId && addAccountId !== "all"
      ? accountById.get(addAccountId)
      : undefined;

  const sizeSelect = (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-muted">Tamaño</span>
      <Select
        value={addSize}
        onValueChange={(v) => setAddSize(v as WidgetSize)}
      >
        <SelectTrigger className="h-10 flex-1 rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {WIDGET_SIZES.map((size) => (
            <SelectItem key={size} value={size}>
              {WIDGET_SIZE_LABELS[size]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

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
            Ordena y oculta secciones, y arma tu panel de gadgets.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-2 px-4">
          {sections.map((item, index) => (
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
                    ? `Ocultar ${FIXED_LABELS.get(item.key) ?? item.key}`
                    : `Mostrar ${FIXED_LABELS.get(item.key) ?? item.key}`
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
                {FIXED_LABELS.get(item.key) ?? item.key}
              </span>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Subir ${FIXED_LABELS.get(item.key) ?? item.key}`}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-brand-mid transition-colors hover:text-brand disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === sections.length - 1}
                aria-label={`Bajar ${FIXED_LABELS.get(item.key) ?? item.key}`}
                className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-brand-mid transition-colors hover:text-brand disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Gadgets del panel bento: tamaño, orden y baja */}
        {widgets.length > 0 && (
          <div className="mx-4 rounded-[16px] border border-line bg-white p-3.5">
            <div className="mb-1 text-[12.5px] font-bold text-navy">
              Gadgets del panel
            </div>
            <p className="mb-2 text-[11px] text-muted">
              En escritorio también puedes reordenarlos arrastrándolos.
            </p>
            <div className="flex flex-col gap-2">
              {widgets.map((widget, index) => (
                <div
                  key={widget.id}
                  className="flex items-center gap-2 rounded-[14px] border border-line bg-white px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink-soft">
                    {widgetLabel(widget)}
                    <span className="ml-1.5 text-[11px] font-medium text-muted">
                      {
                        WIDGET_SIZE_LABELS[
                          widget.size ?? DEFAULT_WIDGET_SIZE[widget.type]
                        ]
                      }
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(widget)}
                    aria-label={`Editar ${widgetLabel(widget)}`}
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-[10px] transition-colors ${
                      editingId === widget.id
                        ? "bg-chip text-brand"
                        : "bg-app text-brand-mid hover:text-brand"
                    }`}
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(index, -1)}
                    disabled={index === 0}
                    aria-label={`Subir ${widgetLabel(widget)}`}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-brand-mid transition-colors hover:text-brand disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(index, 1)}
                    disabled={index === widgets.length - 1}
                    aria-label={`Bajar ${widgetLabel(widget)}`}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-brand-mid transition-colors hover:text-brand disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeWidget(widget.id)}
                    aria-label={`Eliminar ${widgetLabel(widget)}`}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-app text-muted transition-colors hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alta y edición de gadgets */}
        <div className="mx-4 rounded-[16px] border border-line bg-white p-3.5">
          <div className="mb-2 text-[12.5px] font-bold text-navy">
            {editingId ? "Editar gadget" : "Añadir gadget"}
          </div>
          {widgets.length >= MAX_WIDGETS && !editingId ? (
            <p className="text-[12px] text-muted">
              Límite de {MAX_WIDGETS} gadgets alcanzado: elimina alguno para
              añadir otro.
            </p>
          ) : addType === null ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
                    <SelectTrigger className={selectTriggerCls}>
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
              {addType === "incomeCard" && (
                <>
                  <Select value={addAccountId} onValueChange={setAddAccountId}>
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue placeholder="Cuentas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        Todas las cuentas (moneda base)
                      </SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} · {account.currencyCode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={addVariant}
                      onValueChange={(v) =>
                        setAddVariant(v as IncomeCardVariant)
                      }
                    >
                      <SelectTrigger className={selectTriggerCls}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="soft">Estilo claro</SelectItem>
                        <SelectItem value="dark">Estilo oscuro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={addMetric}
                      onValueChange={(v) => setAddMetric(v as IncomeCardMetric)}
                    >
                      <SelectTrigger className={selectTriggerCls}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Gráfico: ingresos</SelectItem>
                        <SelectItem value="expense">Gráfico: gastos</SelectItem>
                        <SelectItem value="net">Gráfico: neto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Select
                    value={addPeriod}
                    onValueChange={(v) => setAddPeriod(v as IncomeCardPeriod)}
                  >
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Empieza en: Día</SelectItem>
                      <SelectItem value="week">Empieza en: Semana</SelectItem>
                      <SelectItem value="month">Empieza en: Mes</SelectItem>
                    </SelectContent>
                  </Select>
                  <input
                    type="text"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    maxLength={40}
                    placeholder="Título propio (opcional)"
                    className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink outline-none placeholder:text-muted-2 focus:border-brand-soft"
                  />
                  <CheckRow
                    checked={addShowTabs}
                    label="Tabs de periodo (Día / Semana / Mes)"
                    onToggle={() => setAddShowTabs((v) => !v)}
                  />
                  <CheckRow
                    checked={addShowDelta}
                    label="Variación vs el periodo anterior"
                    onToggle={() => setAddShowDelta((v) => !v)}
                  />
                  <CheckRow
                    checked={addShowIncome}
                    label="Pie: total de ingresos"
                    onToggle={() => setAddShowIncome((v) => !v)}
                  />
                  <CheckRow
                    checked={addShowExpense}
                    label="Pie: total de gastos"
                    onToggle={() => setAddShowExpense((v) => !v)}
                  />
                  <CheckRow
                    checked={addShowNet}
                    label="Pie: neto"
                    onToggle={() => setAddShowNet((v) => !v)}
                  />
                </>
              )}
              {sizeSelect}
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setAddType(null);
                    setEditingId(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={confirmAdd}
                  disabled={
                    (addType === "accountCard" &&
                      (!addAccountId || addAccountId === "all")) ||
                    (addType === "ratePair" &&
                      (!addFromId || !addToId || addFromId === addToId))
                  }
                >
                  {editingId ? "Guardar cambios" : "Añadir"}
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

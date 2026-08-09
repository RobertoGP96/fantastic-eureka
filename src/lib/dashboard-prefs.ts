// Preferencias de la vista de Inicio: qué secciones se muestran, en qué
// orden, qué cuentas lista la sección Cuentas y qué gadgets añadió el
// usuario. Lógica pura sin React ni Prisma para poder testearla; se
// persisten serializadas en `User.dashboardPrefs` (null = defaults).

/** Secciones fijas del dashboard en su orden por defecto. */
export const DASHBOARD_SECTIONS = [
  { key: "quickActions", label: "Accesos rápidos" },
  { key: "widgetPanel", label: "Panel de gadgets" },
  { key: "monthlyChart", label: "Ingresos vs gastos" },
  { key: "topCategories", label: "Top gastos del mes" },
  { key: "upcomingInstallments", label: "Próximas cuotas" },
  { key: "accounts", label: "Cuentas" },
] as const;

export type DashboardSectionKey = (typeof DASHBOARD_SECTIONS)[number]["key"];

/** Tipos de gadget instanciables (varios por tipo, cada uno con su config). */
export const WIDGET_TYPES = [
  "accountCard",
  "currencyTotals",
  "ratePair",
  "incomeCard",
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  accountCard: "Tarjeta de cuenta",
  currencyTotals: "Totales por moneda",
  ratePair: "Tasa de cambio",
  incomeCard: "Resumen de ingresos",
};

/** Tamaño del gadget dentro del panel bento (columnas que ocupa). */
export const WIDGET_SIZES = ["sm", "md", "lg"] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];

export const WIDGET_SIZE_LABELS: Record<WidgetSize, string> = {
  sm: "Pequeño",
  md: "Mediano",
  lg: "Grande",
};

export const DEFAULT_WIDGET_SIZE: Record<WidgetType, WidgetSize> = {
  accountCard: "sm",
  currencyTotals: "md",
  ratePair: "sm",
  incomeCard: "md",
};

// Configuración del gadget «Resumen de ingresos» (tarjeta con gráfico).
export const INCOME_CARD_VARIANTS = ["soft", "dark"] as const;
export type IncomeCardVariant = (typeof INCOME_CARD_VARIANTS)[number];

export const INCOME_CARD_METRICS = ["income", "expense", "net"] as const;
export type IncomeCardMetric = (typeof INCOME_CARD_METRICS)[number];

export const INCOME_CARD_PERIODS = ["day", "week", "month"] as const;
export type IncomeCardPeriod = (typeof INCOME_CARD_PERIODS)[number];

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  /** Columnas que ocupa en el panel bento. */
  size?: WidgetSize;
  /** accountCard: cuenta de la tarjeta. incomeCard: filtro (sin valor = todas). */
  accountId?: string;
  /** accountCard: incluir los últimos movimientos. */
  showMovements?: boolean;
  /** accountCard: incluir denominaciones disponibles (solo cajas). */
  showDenominations?: boolean;
  /** ratePair: par origen→destino. */
  fromCurrencyId?: string;
  toCurrencyId?: string;
  /** incomeCard: variante visual. */
  variant?: IncomeCardVariant;
  /** incomeCard: serie que dibuja el gráfico. */
  metric?: IncomeCardMetric;
  /** incomeCard: periodo inicial de los tabs. */
  defaultPeriod?: IncomeCardPeriod;
  /** incomeCard: título propio (sin valor = automático). */
  title?: string;
  /** incomeCard: mostrar los tabs Día/Semana/Mes. */
  showTabs?: boolean;
  /** incomeCard: variación vs el periodo anterior. */
  showDelta?: boolean;
  /** incomeCard: métricas del pie de la tarjeta. */
  showIncome?: boolean;
  showExpense?: boolean;
  showNet?: boolean;
}

export interface DashboardSectionPref {
  /** Clave fija o "widget:<id>" para gadgets. */
  key: string;
  visible: boolean;
}

export interface DashboardPrefs {
  sections: DashboardSectionPref[];
  widgets: DashboardWidget[];
  /** Cuentas visibles en la sección Cuentas; null = todas. */
  accountIds: string[] | null;
}

export const MAX_WIDGETS = 12;

const FIXED_KEYS = new Set<string>(DASHBOARD_SECTIONS.map((s) => s.key));
const WIDGET_TYPE_SET = new Set<string>(WIDGET_TYPES);

/** Todas las secciones visibles, sin gadgets, en el orden canónico. */
export function defaultDashboardPrefs(): DashboardPrefs {
  return {
    sections: DASHBOARD_SECTIONS.map((s) => ({ key: s.key, visible: true })),
    widgets: [],
    accountIds: null,
  };
}

/** Valor si pertenece a la lista de opciones; undefined si no. */
function pick<T extends string>(list: readonly T[], v: unknown): T | undefined {
  return typeof v === "string" && (list as readonly string[]).includes(v)
    ? (v as T)
    : undefined;
}

function normalizeWidget(item: unknown): DashboardWidget | null {
  if (!item || typeof item !== "object") return null;
  const raw = item as Record<string, unknown>;
  if (typeof raw.id !== "string" || raw.id.length === 0 || raw.id.length > 40) {
    return null;
  }
  if (typeof raw.type !== "string" || !WIDGET_TYPE_SET.has(raw.type)) {
    return null;
  }
  const type = raw.type as WidgetType;
  const str = (v: unknown) =>
    typeof v === "string" && v.length > 0 && v.length <= 40 ? v : undefined;
  const size = pick(WIDGET_SIZES, raw.size) ?? DEFAULT_WIDGET_SIZE[type];

  if (type === "accountCard") {
    const accountId = str(raw.accountId);
    if (!accountId) return null;
    return {
      id: raw.id,
      type,
      size,
      accountId,
      showMovements: raw.showMovements === true,
      showDenominations: raw.showDenominations === true,
    };
  }
  if (type === "ratePair") {
    const fromCurrencyId = str(raw.fromCurrencyId);
    const toCurrencyId = str(raw.toCurrencyId);
    if (!fromCurrencyId || !toCurrencyId || fromCurrencyId === toCurrencyId) {
      return null;
    }
    return { id: raw.id, type, size, fromCurrencyId, toCurrencyId };
  }
  if (type === "incomeCard") {
    return {
      id: raw.id,
      type,
      size,
      accountId: str(raw.accountId),
      variant: pick(INCOME_CARD_VARIANTS, raw.variant) ?? "soft",
      metric: pick(INCOME_CARD_METRICS, raw.metric) ?? "income",
      defaultPeriod: pick(INCOME_CARD_PERIODS, raw.defaultPeriod) ?? "month",
      title: str(raw.title),
      showTabs: raw.showTabs !== false,
      showDelta: raw.showDelta !== false,
      showIncome: raw.showIncome !== false,
      showExpense: raw.showExpense !== false,
      showNet: raw.showNet !== false,
    };
  }
  return { id: raw.id, type, size };
}

/**
 * Normaliza preferencias de origen no confiable: descarta claves y gadgets
 * inválidos o duplicados, y añade al final (visibles) las secciones fijas
 * que falten — así unas preferencias de una versión vieja no ocultan
 * secciones nuevas. Los gadgets viven en el panel bento y su orden es el
 * del array `widgets`; las claves "widget:<id>" de versiones anteriores
 * (gadgets como secciones sueltas) se descartan sin perder los gadgets.
 */
export function normalizeDashboardPrefs(raw: unknown): DashboardPrefs {
  const source = (raw ?? {}) as {
    sections?: unknown;
    widgets?: unknown;
    accountIds?: unknown;
  };

  const widgets: DashboardWidget[] = [];
  const widgetIds = new Set<string>();
  if (Array.isArray(source.widgets)) {
    for (const item of source.widgets) {
      if (widgets.length >= MAX_WIDGETS) break;
      const widget = normalizeWidget(item);
      if (!widget || widgetIds.has(widget.id)) continue;
      widgetIds.add(widget.id);
      widgets.push(widget);
    }
  }

  const sections: DashboardSectionPref[] = [];
  const seen = new Set<string>();
  if (Array.isArray(source.sections)) {
    for (const item of source.sections) {
      if (!item || typeof item !== "object") continue;
      const { key, visible } = item as { key?: unknown; visible?: unknown };
      if (typeof key !== "string" || seen.has(key)) continue;
      if (!FIXED_KEYS.has(key)) continue;
      seen.add(key);
      sections.push({ key, visible: visible !== false });
    }
  }
  for (const section of DASHBOARD_SECTIONS) {
    if (!seen.has(section.key)) {
      sections.push({ key: section.key, visible: true });
    }
  }

  let accountIds: string[] | null = null;
  if (Array.isArray(source.accountIds)) {
    const ids: string[] = [];
    for (const id of source.accountIds as unknown[]) {
      if (ids.length >= 100) break;
      if (
        typeof id === "string" &&
        id.length > 0 &&
        id.length <= 40 &&
        !ids.includes(id)
      ) {
        ids.push(id);
      }
    }
    accountIds = ids;
  }

  return { sections, widgets, accountIds };
}

/** Lee las preferencias desde el JSON guardado en User.dashboardPrefs. */
export function parseDashboardPrefs(
  stored: string | null | undefined
): DashboardPrefs {
  if (!stored) return defaultDashboardPrefs();
  try {
    return normalizeDashboardPrefs(JSON.parse(stored));
  } catch {
    return defaultDashboardPrefs();
  }
}

/** Serializa preferencias (ya normalizadas) para guardarlas en la BD. */
export function serializeDashboardPrefs(prefs: DashboardPrefs): string {
  return JSON.stringify(prefs);
}

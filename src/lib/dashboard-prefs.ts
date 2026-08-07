// Preferencias de la vista de Inicio: qué secciones se muestran, en qué
// orden, qué cuentas lista la sección Cuentas y qué gadgets añadió el
// usuario. Lógica pura sin React ni Prisma para poder testearla; se
// persisten serializadas en `User.dashboardPrefs` (null = defaults).

/** Secciones fijas del dashboard en su orden por defecto. */
export const DASHBOARD_SECTIONS = [
  { key: "quickActions", label: "Accesos rápidos" },
  { key: "monthMetrics", label: "Métricas del mes" },
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
] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const WIDGET_TYPE_LABELS: Record<WidgetType, string> = {
  accountCard: "Tarjeta de cuenta",
  currencyTotals: "Totales por moneda",
  ratePair: "Tasa de cambio",
};

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  /** accountCard: cuenta que muestra la tarjeta. */
  accountId?: string;
  /** accountCard: incluir los últimos movimientos. */
  showMovements?: boolean;
  /** accountCard: incluir denominaciones disponibles (solo cajas). */
  showDenominations?: boolean;
  /** ratePair: par origen→destino. */
  fromCurrencyId?: string;
  toCurrencyId?: string;
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

export const widgetSectionKey = (id: string) => `widget:${id}`;

/** Id del gadget si la clave es "widget:<id>"; null para secciones fijas. */
export function widgetIdFromKey(key: string): string | null {
  return key.startsWith("widget:") ? key.slice("widget:".length) : null;
}

/** Todas las secciones visibles, sin gadgets, en el orden canónico. */
export function defaultDashboardPrefs(): DashboardPrefs {
  return {
    sections: DASHBOARD_SECTIONS.map((s) => ({ key: s.key, visible: true })),
    widgets: [],
    accountIds: null,
  };
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

  if (type === "accountCard") {
    const accountId = str(raw.accountId);
    if (!accountId) return null;
    return {
      id: raw.id,
      type,
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
    return { id: raw.id, type, fromCurrencyId, toCurrencyId };
  }
  return { id: raw.id, type };
}

/**
 * Normaliza preferencias de origen no confiable: descarta claves y gadgets
 * inválidos o duplicados, y añade al final (visibles) las secciones fijas
 * que falten — así unas preferencias de una versión vieja no ocultan
 * secciones nuevas. Acepta el formato v1 (solo sections) sin perder nada.
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
      const widgetId = widgetIdFromKey(key);
      if (widgetId ? !widgetIds.has(widgetId) : !FIXED_KEYS.has(key)) {
        continue;
      }
      seen.add(key);
      sections.push({ key, visible: visible !== false });
    }
  }
  for (const section of DASHBOARD_SECTIONS) {
    if (!seen.has(section.key)) {
      sections.push({ key: section.key, visible: true });
    }
  }
  for (const widget of widgets) {
    const key = widgetSectionKey(widget.id);
    if (!seen.has(key)) {
      sections.push({ key, visible: true });
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

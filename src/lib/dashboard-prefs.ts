// Preferencias de la vista de Inicio (qué secciones se muestran y en qué
// orden). Lógica pura sin React ni Prisma para poder testearla; se persisten
// en la cookie `caja_dashboard` (por navegador, validada por usuario).

export const DASHBOARD_COOKIE = "caja_dashboard";

/** Secciones del dashboard en su orden por defecto. */
export const DASHBOARD_SECTIONS = [
  { key: "quickActions", label: "Accesos rápidos" },
  { key: "monthMetrics", label: "Métricas del mes" },
  { key: "monthlyChart", label: "Ingresos vs gastos" },
  { key: "topCategories", label: "Top gastos del mes" },
  { key: "upcomingInstallments", label: "Próximas cuotas" },
  { key: "accounts", label: "Cuentas" },
] as const;

export type DashboardSectionKey = (typeof DASHBOARD_SECTIONS)[number]["key"];

export interface DashboardSectionPref {
  key: DashboardSectionKey;
  visible: boolean;
}

export interface DashboardPrefs {
  sections: DashboardSectionPref[];
}

const VALID_KEYS = new Set<string>(DASHBOARD_SECTIONS.map((s) => s.key));

/** Todas las secciones visibles, en el orden canónico. */
export function defaultDashboardPrefs(): DashboardPrefs {
  return {
    sections: DASHBOARD_SECTIONS.map((s) => ({ key: s.key, visible: true })),
  };
}

/**
 * Normaliza preferencias de origen no confiable: descarta claves desconocidas
 * y duplicados, y añade al final (visibles) las secciones que falten — así una
 * versión vieja de la cookie no oculta secciones nuevas.
 */
export function normalizeDashboardPrefs(raw: unknown): DashboardPrefs {
  const sections: DashboardSectionPref[] = [];
  const seen = new Set<string>();

  if (raw && typeof raw === "object" && Array.isArray((raw as { sections?: unknown }).sections)) {
    for (const item of (raw as { sections: unknown[] }).sections) {
      if (!item || typeof item !== "object") continue;
      const { key, visible } = item as { key?: unknown; visible?: unknown };
      if (typeof key !== "string" || !VALID_KEYS.has(key) || seen.has(key)) {
        continue;
      }
      seen.add(key);
      sections.push({
        key: key as DashboardSectionKey,
        visible: visible !== false,
      });
    }
  }

  for (const section of DASHBOARD_SECTIONS) {
    if (!seen.has(section.key)) {
      sections.push({ key: section.key, visible: true });
    }
  }

  return { sections };
}

/**
 * Lee las preferencias desde el valor de la cookie. La cookie guarda el id
 * del usuario que la escribió: si no coincide (otro usuario en el mismo
 * navegador) se ignora y se devuelven los valores por defecto.
 */
export function parseDashboardCookie(
  value: string | undefined,
  userId: string
): DashboardPrefs {
  if (!value) return defaultDashboardPrefs();
  try {
    const parsed = JSON.parse(value) as { u?: unknown; sections?: unknown };
    if (parsed?.u !== userId) return defaultDashboardPrefs();
    return normalizeDashboardPrefs(parsed);
  } catch {
    return defaultDashboardPrefs();
  }
}

/** Serializa las preferencias (ya normalizadas) para la cookie. */
export function serializeDashboardPrefs(
  prefs: DashboardPrefs,
  userId: string
): string {
  return JSON.stringify({ u: userId, sections: prefs.sections });
}

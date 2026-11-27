// Empaquetado de las secciones de Inicio en filas de 12 columnas (escritorio).
// Lógica pura, sin React: respeta el orden que eligió el usuario y solo
// decide cuántas columnas ocupa cada sección. En móvil todo va en una columna.

import type { DashboardSectionKey } from "@/lib/dashboard-prefs";

/** full = fila propia; wide y narrow pueden compartir fila de dos en dos. */
export type SectionWidth = "full" | "wide" | "narrow";

export type RowSpan = 4 | 6 | 8 | 12;

export const SECTION_WIDTH: Record<DashboardSectionKey, SectionWidth> = {
  quickActions: "full",
  widgetPanel: "full",
  monthlyChart: "wide",
  topCategories: "narrow",
  upcomingInstallments: "narrow",
  accounts: "wide",
};

export interface PackedCell<K extends string> {
  key: K;
  span: RowSpan;
}

export interface PackedRow<K extends string> {
  cells: PackedCell<K>[];
}

/**
 * Agrupa las secciones, en su orden, en filas:
 *  - una sección `full` va sola (12) y corta la pareja que estuviera abierta;
 *  - dos no-full consecutivas comparten fila: ancha+estrecha = 8/4 (o 4/8 si
 *    la estrecha va primero) y dos iguales = 6/6;
 *  - una no-full que se queda sin pareja ocupa la fila entera (12).
 * Nunca reordena: el orden de las celdas es el de `keys`.
 */
export function packDashboardRows<K extends string>(
  keys: readonly K[],
  widthOf: (key: K) => SectionWidth
): PackedRow<K>[] {
  const rows: PackedRow<K>[] = [];
  let pending: { key: K; width: "wide" | "narrow" } | null = null;

  for (const key of keys) {
    const width = widthOf(key);

    if (width === "full") {
      if (pending) rows.push({ cells: [{ key: pending.key, span: 12 }] });
      pending = null;
      rows.push({ cells: [{ key, span: 12 }] });
      continue;
    }

    if (!pending) {
      pending = { key, width };
      continue;
    }

    const [first, second]: [RowSpan, RowSpan] =
      pending.width === width ? [6, 6] : pending.width === "wide" ? [8, 4] : [4, 8];
    rows.push({
      cells: [
        { key: pending.key, span: first },
        { key, span: second },
      ],
    });
    pending = null;
  }

  if (pending) rows.push({ cells: [{ key: pending.key, span: 12 }] });
  return rows;
}

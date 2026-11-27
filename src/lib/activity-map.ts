// Mapa de actividad del gadget de Inicio: cuántos movimientos se registraron
// cada día de las últimas semanas, en una rejilla semana × día de la semana
// (estilo «contribution graph»). Lógica pura, sin Prisma ni React; la
// consulta vive en src/lib/metrics.ts (activityMapData).
//
// Los días siguen al reloj local del servidor, que instrumentation.ts fija
// en la zona de la app: un movimiento de las 23:00 cae en su día real.

import { dayKey, weekStart } from "@/lib/income-series";

/** Semanas que cubre el mapa, incluida la actual (≈ un año). */
export const ACTIVITY_MAP_WEEKS = 53;

/** 0 = sin movimientos; 1–4 = intensidad relativa al día más activo. */
export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityDay {
  /** Clave local yyyy-mm-dd. */
  key: string;
  date: Date;
  count: number;
  level: ActivityLevel;
}

export interface ActivityWeek {
  /** Clave del lunes de la semana. */
  key: string;
  /** Mes abreviado si en esta columna empieza un mes distinto; null si no. */
  monthLabel: string | null;
  /** Lunes a domingo; null para los días que todavía no han llegado. */
  days: (ActivityDay | null)[];
}

export interface ActivityMap {
  /** De la semana más antigua a la actual. */
  weeks: ActivityWeek[];
  /** Movimientos dentro de la ventana. */
  total: number;
  /** Días con al menos un movimiento. */
  activeDays: number;
  /** Movimientos del día más activo (0 si no hay ninguno). */
  max: number;
}

const MONTH_LABEL = new Intl.DateTimeFormat("es", { month: "short" });

/** Lunes de la primera semana de la ventana (inicio del rango a consultar). */
export function activityMapRangeStart(
  now: Date = new Date(),
  weeks: number = ACTIVITY_MAP_WEEKS
): Date {
  const monday = weekStart(now);
  return new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() - (weeks - 1) * 7
  );
}

/**
 * Intensidad en cuartos del máximo: con max = 8, 1–2 → 1, 3–4 → 2, 5–6 → 3,
 * 7–8 → 4. Cualquier día con actividad vale al menos 1 para que se vea.
 */
export function activityLevel(count: number, max: number): ActivityLevel {
  if (count <= 0 || max <= 0) return 0;
  const level = Math.ceil((count / max) * 4);
  return Math.min(4, Math.max(1, level)) as ActivityLevel;
}

export function buildActivityMap(
  dates: readonly Date[],
  now: Date = new Date(),
  weeks: number = ACTIVITY_MAP_WEEKS
): ActivityMap {
  const start = activityMapRangeStart(now, weeks);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const counts = new Map<string, number>();
  for (const date of dates) {
    if (date < start || date > now) continue;
    const key = dayKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  let total = 0;
  let max = 0;
  for (const count of counts.values()) {
    total += count;
    if (count > max) max = count;
  }

  const result: ActivityWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    const monday = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + w * 7
    );
    const days: (ActivityDay | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(
        monday.getFullYear(),
        monday.getMonth(),
        monday.getDate() + d
      );
      if (date > today) {
        days.push(null);
        continue;
      }
      const key = dayKey(date);
      const count = counts.get(key) ?? 0;
      days.push({ key, date, count, level: activityLevel(count, max) });
    }
    result.push({ key: dayKey(monday), monthLabel: null, days });
  }

  // Etiqueta de mes en la primera columna de cada mes (según su lunes). La
  // de la primera columna se omite si el mes cambia enseguida: se pisarían.
  let previousMonth = -1;
  for (const week of result) {
    const monday = week.days[0]!.date;
    if (monday.getMonth() !== previousMonth) {
      week.monthLabel = MONTH_LABEL.format(monday).replace(".", "");
      previousMonth = monday.getMonth();
    }
  }
  if (result.length > 2 && (result[1].monthLabel || result[2].monthLabel)) {
    result[0].monthLabel = null;
  }

  return { weeks: result, total, activeDays: counts.size, max };
}

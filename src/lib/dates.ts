import type { Frequency } from "@/lib/domain";

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Próxima fecha de vencimiento a partir de la cuota actual.
 * MONTHLY respeta dayOfMonth con clamp al último día del mes (31 → 28/29 feb),
 * por eso el día objetivo se guarda en el plan y no se deriva de la cuota.
 * Devuelve null para frecuencia ONCE.
 */
export function nextDueDate(
  current: Date,
  frequency: Frequency,
  dayOfMonth?: number | null
): Date | null {
  switch (frequency) {
    case "ONCE":
      return null;
    case "WEEKLY": {
      const next = new Date(current);
      next.setDate(next.getDate() + 7);
      return next;
    }
    case "BIWEEKLY": {
      const next = new Date(current);
      next.setDate(next.getDate() + 14);
      return next;
    }
    case "MONTHLY": {
      const month = current.getMonth() + 1;
      const targetYear = current.getFullYear() + Math.floor(month / 12);
      const targetMonth = month % 12;
      const day = Math.min(
        dayOfMonth ?? current.getDate(),
        daysInMonth(targetYear, targetMonth)
      );
      const next = new Date(current);
      // setFullYear fija año/mes/día de una vez: sin desbordes intermedios.
      next.setFullYear(targetYear, targetMonth, day);
      return next;
    }
  }
}

/**
 * Fecha LOCAL en formato `YYYY-MM-DD` (el de `<input type="date">`).
 * NO usar `toISOString().slice(0, 10)`: eso da la fecha UTC y, de noche en
 * zonas al oeste de Greenwich, ya es «mañana».
 */
export function toLocalDateISO(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Último instante del día local de `date` (para límites inclusivos por día). */
export function endOfLocalDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Días (con signo) desde hoy hasta dueAt comparando fechas locales. */
export function daysUntil(dueAt: Date, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dueAt.getFullYear(), dueAt.getMonth(), dueAt.getDate());
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

export function isOverdue(dueAt: Date, now: Date = new Date()): boolean {
  return daysUntil(dueAt, now) < 0;
}

/** Etiqueta humana del vencimiento: "Vencida hace 3 días", "Hoy", "En 5 días". */
export function dueLabel(dueAt: Date, now: Date = new Date()): string {
  const days = daysUntil(dueAt, now);
  if (days < -1) return `Vencida hace ${-days} días`;
  if (days === -1) return "Vencida ayer";
  if (days === 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  return `En ${days} días`;
}

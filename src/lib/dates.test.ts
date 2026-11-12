import { describe, expect, it } from "vitest";
import {
  daysUntil,
  dueLabel,
  endOfLocalDay,
  isOverdue,
  nextDueDate,
  toLocalDateISO,
} from "@/lib/dates";

describe("toLocalDateISO", () => {
  it("usa la fecha LOCAL, no la UTC", () => {
    // 23:30 local: al oeste de Greenwich toISOString() ya da el día
    // siguiente; la fecha del formulario debe seguir siendo la de hoy.
    expect(toLocalDateISO(new Date(2026, 10, 12, 23, 30))).toBe("2026-11-12");
    expect(toLocalDateISO(new Date(2026, 0, 5, 0, 5))).toBe("2026-01-05");
  });
});

describe("endOfLocalDay", () => {
  it("lleva la fecha al último instante de su día sin mutarla", () => {
    const noon = new Date(2026, 5, 15, 12, 0, 0);
    expect(endOfLocalDay(noon)).toEqual(new Date(2026, 5, 15, 23, 59, 59, 999));
    expect(noon.getHours()).toBe(12);
  });
});

describe("nextDueDate", () => {
  it("ONCE no genera siguiente", () => {
    expect(nextDueDate(new Date(2026, 0, 15), "ONCE")).toBeNull();
  });

  it("WEEKLY suma 7 días", () => {
    expect(nextDueDate(new Date(2026, 0, 28), "WEEKLY")).toEqual(
      new Date(2026, 1, 4)
    );
  });

  it("BIWEEKLY suma 14 días", () => {
    expect(nextDueDate(new Date(2026, 11, 25), "BIWEEKLY")).toEqual(
      new Date(2027, 0, 8)
    );
  });

  it("MONTHLY mantiene el día del mes", () => {
    expect(nextDueDate(new Date(2026, 2, 15), "MONTHLY", 15)).toEqual(
      new Date(2026, 3, 15)
    );
  });

  it("MONTHLY con día 31 hace clamp en meses cortos", () => {
    // 31 ene → 28 feb (2026 no es bisiesto)
    expect(nextDueDate(new Date(2026, 0, 31), "MONTHLY", 31)).toEqual(
      new Date(2026, 1, 28)
    );
  });

  it("MONTHLY recupera el día 31 tras el clamp", () => {
    // 28 feb (plan con día 31) → 31 mar
    expect(nextDueDate(new Date(2026, 1, 28), "MONTHLY", 31)).toEqual(
      new Date(2026, 2, 31)
    );
  });

  it("MONTHLY cruza de diciembre a enero", () => {
    expect(nextDueDate(new Date(2026, 11, 10), "MONTHLY", 10)).toEqual(
      new Date(2027, 0, 10)
    );
  });
});

describe("daysUntil / isOverdue / dueLabel", () => {
  const now = new Date(2026, 6, 7, 15, 30);

  it("calcula días con fechas locales, ignorando la hora", () => {
    expect(daysUntil(new Date(2026, 6, 7, 1, 0), now)).toBe(0);
    expect(daysUntil(new Date(2026, 6, 8, 23, 0), now)).toBe(1);
    expect(daysUntil(new Date(2026, 6, 4), now)).toBe(-3);
  });

  it("marca vencidas solo las de días anteriores", () => {
    expect(isOverdue(new Date(2026, 6, 6), now)).toBe(true);
    expect(isOverdue(new Date(2026, 6, 7, 0, 0), now)).toBe(false);
  });

  it("genera etiquetas humanas", () => {
    expect(dueLabel(new Date(2026, 6, 4), now)).toBe("Vencida hace 3 días");
    expect(dueLabel(new Date(2026, 6, 6), now)).toBe("Vencida ayer");
    expect(dueLabel(new Date(2026, 6, 7), now)).toBe("Vence hoy");
    expect(dueLabel(new Date(2026, 6, 8), now)).toBe("Vence mañana");
    expect(dueLabel(new Date(2026, 6, 12), now)).toBe("En 5 días");
  });
});

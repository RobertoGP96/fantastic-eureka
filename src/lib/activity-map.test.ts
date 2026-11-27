import { describe, expect, it } from "vitest";
import {
  activityLevel,
  activityMapRangeStart,
  buildActivityMap,
} from "./activity-map";

// Jueves 26 de noviembre de 2026, a media tarde. Su semana empieza el lunes 23.
const NOW = new Date(2026, 10, 26, 15, 30);

describe("activityMapRangeStart", () => {
  it("es el lunes de hace (semanas − 1) semanas", () => {
    expect(activityMapRangeStart(NOW, 1)).toEqual(new Date(2026, 10, 23));
    expect(activityMapRangeStart(NOW, 4)).toEqual(new Date(2026, 10, 2));
  });
});

describe("activityLevel", () => {
  it("0 sin actividad o sin máximo", () => {
    expect(activityLevel(0, 8)).toBe(0);
    expect(activityLevel(3, 0)).toBe(0);
  });

  it("reparte en cuartos del máximo y nunca baja de 1 con actividad", () => {
    expect(activityLevel(1, 8)).toBe(1);
    expect(activityLevel(2, 8)).toBe(1);
    expect(activityLevel(3, 8)).toBe(2);
    expect(activityLevel(5, 8)).toBe(3);
    expect(activityLevel(8, 8)).toBe(4);
    expect(activityLevel(1, 100)).toBe(1);
  });
});

describe("buildActivityMap", () => {
  it("arma semanas de lunes a domingo, de la más antigua a la actual", () => {
    const map = buildActivityMap([], NOW, 3);
    expect(map.weeks.map((week) => week.key)).toEqual([
      "2026-11-09",
      "2026-11-16",
      "2026-11-23",
    ]);
    expect(map.weeks[0].days.map((day) => day?.key)).toEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
    ]);
  });

  it("deja en null los días que aún no han llegado", () => {
    const current = buildActivityMap([], NOW, 1).weeks[0];
    // lun 23, mar 24, mié 25, jue 26 (hoy) existen; vie–dom todavía no.
    expect(current.days.map((day) => day !== null)).toEqual([
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
  });

  it("cuenta por día local e ignora lo que cae fuera de la ventana", () => {
    const map = buildActivityMap(
      [
        new Date(2026, 10, 24, 9, 0),
        new Date(2026, 10, 24, 23, 59),
        new Date(2026, 10, 26, 8, 0),
        new Date(2026, 10, 1, 12, 0), // antes del lunes 9
        new Date(2026, 10, 26, 18, 0), // después de «ahora»
      ],
      NOW,
      3
    );
    expect(map.total).toBe(3);
    expect(map.activeDays).toBe(2);
    expect(map.max).toBe(2);

    const week = map.weeks[2];
    expect(week.days[1]).toMatchObject({
      key: "2026-11-24",
      count: 2,
      level: 4,
    });
    expect(week.days[3]).toMatchObject({
      key: "2026-11-26",
      count: 1,
      level: 2,
    });
    expect(week.days[0]).toMatchObject({ count: 0, level: 0 });
  });

  it("sin movimientos todo queda en nivel 0", () => {
    const map = buildActivityMap([], NOW, 2);
    expect(map).toMatchObject({ total: 0, activeDays: 0, max: 0 });
    expect(
      map.weeks.flatMap((week) => week.days).every((day) => !day || day.level === 0)
    ).toBe(true);
  });

  it("etiqueta el mes solo en la columna donde empieza", () => {
    // 8 semanas hasta el 23 nov: lunes 5, 12, 19 y 26 de oct; 2, 9, 16 y 23 de nov.
    const labels = buildActivityMap([], NOW, 8).weeks.map(
      (week) => week.monthLabel
    );
    expect(labels).toEqual(["oct", null, null, null, "nov", null, null, null]);
  });

  it("omite la etiqueta de la primera columna si el mes cambia enseguida", () => {
    // 5 semanas: lunes 26 oct, 2, 9, 16 y 23 nov → «oct» se pisaría con «nov».
    const labels = buildActivityMap([], NOW, 5).weeks.map(
      (week) => week.monthLabel
    );
    expect(labels).toEqual([null, "nov", null, null, null]);
  });
});

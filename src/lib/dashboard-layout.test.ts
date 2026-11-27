import { describe, expect, it } from "vitest";
import { DASHBOARD_SECTIONS } from "./dashboard-prefs";
import {
  packDashboardRows,
  SECTION_WIDTH,
  type SectionWidth,
} from "./dashboard-layout";

type Key = "f" | "f2" | "w" | "w2" | "n" | "n2";

const WIDTHS: Record<Key, SectionWidth> = {
  f: "full",
  f2: "full",
  w: "wide",
  w2: "wide",
  n: "narrow",
  n2: "narrow",
};

const pack = (keys: Key[]) =>
  packDashboardRows(keys, (key) => WIDTHS[key]).map((row) =>
    row.cells.map((cell) => `${cell.key}:${cell.span}`)
  );

describe("packDashboardRows", () => {
  it("sin secciones no hay filas", () => {
    expect(pack([])).toEqual([]);
  });

  it("una sección sola ocupa la fila entera, sea del ancho que sea", () => {
    expect(pack(["w"])).toEqual([["w:12"]]);
    expect(pack(["n"])).toEqual([["n:12"]]);
    expect(pack(["f"])).toEqual([["f:12"]]);
  });

  it("ancha + estrecha comparten fila 8/4 respetando el orden", () => {
    expect(pack(["w", "n"])).toEqual([["w:8", "n:4"]]);
    expect(pack(["n", "w"])).toEqual([["n:4", "w:8"]]);
  });

  it("dos del mismo ancho se reparten 6/6", () => {
    expect(pack(["n", "n2"])).toEqual([["n:6", "n2:6"]]);
    expect(pack(["w", "w2"])).toEqual([["w:6", "w2:6"]]);
  });

  it("una sección completa corta la pareja abierta", () => {
    expect(pack(["n", "f", "n2"])).toEqual([["n:12"], ["f:12"], ["n2:12"]]);
  });

  it("la tercera de una racha queda sola en su fila", () => {
    expect(pack(["w", "n", "n2"])).toEqual([["w:8", "n:4"], ["n2:12"]]);
  });

  it("nunca reordena: las celdas salen en el orden de entrada", () => {
    const keys: Key[] = ["n", "w", "f", "w2", "n2", "f2"];
    const flat = packDashboardRows(keys, (key) => WIDTHS[key]).flatMap((row) =>
      row.cells.map((cell) => cell.key)
    );
    expect(flat).toEqual(keys);
  });

  it("el orden por defecto de Inicio da dos filas 8/4", () => {
    const keys = DASHBOARD_SECTIONS.map((section) => section.key);
    const rows = packDashboardRows(keys, (key) => SECTION_WIDTH[key]).map(
      (row) => row.cells.map((cell) => `${cell.key}:${cell.span}`)
    );
    expect(rows).toEqual([
      ["quickActions:12"],
      ["widgetPanel:12"],
      ["monthlyChart:8", "topCategories:4"],
      ["upcomingInstallments:4", "accounts:8"],
    ]);
  });
});

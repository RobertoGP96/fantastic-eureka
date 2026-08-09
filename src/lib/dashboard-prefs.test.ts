import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SECTIONS,
  defaultDashboardPrefs,
  normalizeDashboardPrefs,
  parseDashboardPrefs,
  serializeDashboardPrefs,
} from "./dashboard-prefs";

describe("defaultDashboardPrefs", () => {
  it("incluye todas las secciones visibles en orden canónico, sin gadgets", () => {
    const prefs = defaultDashboardPrefs();
    expect(prefs.sections.map((s) => s.key)).toEqual(
      DASHBOARD_SECTIONS.map((s) => s.key)
    );
    expect(prefs.sections.every((s) => s.visible)).toBe(true);
    expect(prefs.widgets).toEqual([]);
    expect(prefs.accountIds).toBeNull();
  });

  it("incluye el panel de gadgets como sección fija", () => {
    expect(
      defaultDashboardPrefs().sections.some((s) => s.key === "widgetPanel")
    ).toBe(true);
  });
});

describe("normalizeDashboardPrefs", () => {
  it("respeta orden y visibilidad, y añade al final las secciones que falten", () => {
    const prefs = normalizeDashboardPrefs({
      sections: [
        { key: "accounts", visible: true },
        { key: "quickActions", visible: false },
      ],
    });
    expect(prefs.sections[0]).toEqual({ key: "accounts", visible: true });
    expect(prefs.sections[1]).toEqual({ key: "quickActions", visible: false });
    expect(prefs.sections).toHaveLength(DASHBOARD_SECTIONS.length);
    expect(prefs.sections.at(-1)?.visible).toBe(true);
  });

  it("acepta el formato v1 (solo sections) sin widgets ni accountIds", () => {
    const prefs = normalizeDashboardPrefs({
      sections: [{ key: "accounts", visible: false }],
    });
    expect(prefs.widgets).toEqual([]);
    expect(prefs.accountIds).toBeNull();
  });

  it("descarta claves desconocidas, duplicados y basura", () => {
    const prefs = normalizeDashboardPrefs({
      sections: [
        { key: "hacker", visible: false },
        { key: "accounts", visible: false },
        { key: "accounts", visible: true },
      ],
    });
    expect(prefs.sections.filter((s) => s.key === "accounts")).toEqual([
      { key: "accounts", visible: false },
    ]);
    expect(normalizeDashboardPrefs(null)).toEqual(defaultDashboardPrefs());
    expect(normalizeDashboardPrefs("x")).toEqual(defaultDashboardPrefs());
  });

  it("migra prefs v2: descarta claves widget:<id> sin perder los gadgets", () => {
    const prefs = normalizeDashboardPrefs({
      sections: [
        { key: "widget:w1", visible: false },
        { key: "accounts", visible: true },
      ],
      widgets: [{ id: "w1", type: "currencyTotals" }],
    });
    expect(prefs.sections.some((s) => s.key.startsWith("widget:"))).toBe(false);
    expect(prefs.widgets.map((w) => w.id)).toEqual(["w1"]);
  });

  it("normaliza gadgets con tamaño (default por tipo, inválido fuera)", () => {
    const prefs = normalizeDashboardPrefs({
      widgets: [
        { id: "w1", type: "accountCard", accountId: "a1", showMovements: true },
        { id: "w2", type: "currencyTotals", size: "lg" },
        { id: "w3", type: "ratePair", fromCurrencyId: "c1", toCurrencyId: "c2", size: "xxl" },
      ],
    });
    expect(prefs.widgets[0]).toEqual({
      id: "w1",
      type: "accountCard",
      size: "sm",
      accountId: "a1",
      showMovements: true,
      showDenominations: false,
    });
    expect(prefs.widgets[1].size).toBe("lg");
    expect(prefs.widgets[2].size).toBe("sm");
  });

  it("normaliza incomeCard: defaults, enums inválidos fuera y flags en false", () => {
    const prefs = normalizeDashboardPrefs({
      widgets: [
        { id: "w1", type: "incomeCard" },
        {
          id: "w2",
          type: "incomeCard",
          accountId: "a1",
          variant: "neon",
          metric: "net",
          defaultPeriod: "week",
          title: "Mi tarjeta",
          showTabs: false,
          showNet: false,
        },
      ],
    });
    expect(prefs.widgets[0]).toEqual({
      id: "w1",
      type: "incomeCard",
      size: "md",
      accountId: undefined,
      variant: "soft",
      metric: "income",
      defaultPeriod: "month",
      title: undefined,
      showTabs: true,
      showDelta: true,
      showIncome: true,
      showExpense: true,
      showNet: true,
    });
    expect(prefs.widgets[1]).toMatchObject({
      accountId: "a1",
      variant: "soft", // "neon" no existe → default
      metric: "net",
      defaultPeriod: "week",
      title: "Mi tarjeta",
      showTabs: false,
      showNet: false,
      showIncome: true,
    });
  });

  it("descarta gadgets inválidos", () => {
    const prefs = normalizeDashboardPrefs({
      widgets: [
        { id: "sin-cuenta", type: "accountCard" },
        { id: "mismo-par", type: "ratePair", fromCurrencyId: "c1", toCurrencyId: "c1" },
        { id: "tipo-raro", type: "hacker" },
        { id: "ok", type: "ratePair", fromCurrencyId: "c1", toCurrencyId: "c2" },
      ],
    });
    expect(prefs.widgets.map((w) => w.id)).toEqual(["ok"]);
  });

  it("normaliza accountIds: dedupe y null para 'todas'", () => {
    expect(
      normalizeDashboardPrefs({ accountIds: ["a", "b", "a"] }).accountIds
    ).toEqual(["a", "b"]);
    expect(normalizeDashboardPrefs({}).accountIds).toBeNull();
    expect(normalizeDashboardPrefs({ accountIds: [] }).accountIds).toEqual([]);
  });
});

describe("parseDashboardPrefs / serializeDashboardPrefs", () => {
  it("hace roundtrip", () => {
    const prefs = normalizeDashboardPrefs({
      sections: [{ key: "accounts", visible: false }],
      widgets: [
        { id: "w1", type: "currencyTotals" },
        { id: "w2", type: "incomeCard", variant: "dark", metric: "expense" },
      ],
      accountIds: ["a1"],
    });
    expect(parseDashboardPrefs(serializeDashboardPrefs(prefs))).toEqual(prefs);
  });

  it("null o JSON corrupto devuelven los valores por defecto", () => {
    expect(parseDashboardPrefs(null)).toEqual(defaultDashboardPrefs());
    expect(parseDashboardPrefs("{rota")).toEqual(defaultDashboardPrefs());
  });
});

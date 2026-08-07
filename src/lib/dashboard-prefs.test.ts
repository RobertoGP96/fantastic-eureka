import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SECTIONS,
  defaultDashboardPrefs,
  normalizeDashboardPrefs,
  parseDashboardPrefs,
  serializeDashboardPrefs,
  widgetIdFromKey,
  widgetSectionKey,
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
    expect(
      prefs.sections.filter((s) => s.key === "accounts")
    ).toEqual([{ key: "accounts", visible: false }]);
    expect(normalizeDashboardPrefs(null)).toEqual(defaultDashboardPrefs());
    expect(normalizeDashboardPrefs("x")).toEqual(defaultDashboardPrefs());
  });

  it("conserva gadgets válidos y les crea entrada de sección si falta", () => {
    const prefs = normalizeDashboardPrefs({
      widgets: [
        { id: "w1", type: "accountCard", accountId: "a1", showMovements: true },
        { id: "w2", type: "currencyTotals" },
      ],
      sections: [{ key: widgetSectionKey("w1"), visible: false }],
    });
    expect(prefs.widgets).toHaveLength(2);
    expect(prefs.widgets[0]).toEqual({
      id: "w1",
      type: "accountCard",
      accountId: "a1",
      showMovements: true,
      showDenominations: false,
    });
    const w1 = prefs.sections.find((s) => s.key === widgetSectionKey("w1"));
    const w2 = prefs.sections.find((s) => s.key === widgetSectionKey("w2"));
    expect(w1?.visible).toBe(false);
    expect(w2?.visible).toBe(true);
  });

  it("descarta gadgets inválidos y sus entradas de sección", () => {
    const prefs = normalizeDashboardPrefs({
      widgets: [
        { id: "sin-cuenta", type: "accountCard" },
        { id: "mismo-par", type: "ratePair", fromCurrencyId: "c1", toCurrencyId: "c1" },
        { id: "tipo-raro", type: "hacker" },
        { id: "ok", type: "ratePair", fromCurrencyId: "c1", toCurrencyId: "c2" },
      ],
      sections: [{ key: widgetSectionKey("sin-cuenta"), visible: true }],
    });
    expect(prefs.widgets.map((w) => w.id)).toEqual(["ok"]);
    expect(
      prefs.sections.some((s) => s.key === widgetSectionKey("sin-cuenta"))
    ).toBe(false);
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
      widgets: [{ id: "w1", type: "currencyTotals" }],
      accountIds: ["a1"],
    });
    expect(parseDashboardPrefs(serializeDashboardPrefs(prefs))).toEqual(prefs);
  });

  it("null o JSON corrupto devuelven los valores por defecto", () => {
    expect(parseDashboardPrefs(null)).toEqual(defaultDashboardPrefs());
    expect(parseDashboardPrefs("{rota")).toEqual(defaultDashboardPrefs());
  });
});

describe("widgetIdFromKey", () => {
  it("extrae el id solo de claves de gadget", () => {
    expect(widgetIdFromKey(widgetSectionKey("w9"))).toBe("w9");
    expect(widgetIdFromKey("accounts")).toBeNull();
  });
});

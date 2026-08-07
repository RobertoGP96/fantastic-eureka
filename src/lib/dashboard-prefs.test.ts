import { describe, expect, it } from "vitest";
import {
  DASHBOARD_SECTIONS,
  defaultDashboardPrefs,
  normalizeDashboardPrefs,
  parseDashboardCookie,
  serializeDashboardPrefs,
} from "./dashboard-prefs";

describe("defaultDashboardPrefs", () => {
  it("incluye todas las secciones visibles en orden canónico", () => {
    const prefs = defaultDashboardPrefs();
    expect(prefs.sections.map((s) => s.key)).toEqual(
      DASHBOARD_SECTIONS.map((s) => s.key)
    );
    expect(prefs.sections.every((s) => s.visible)).toBe(true);
  });
});

describe("normalizeDashboardPrefs", () => {
  it("respeta orden y visibilidad de la entrada", () => {
    const prefs = normalizeDashboardPrefs({
      sections: [
        { key: "accounts", visible: true },
        { key: "quickActions", visible: false },
      ],
    });
    expect(prefs.sections[0]).toEqual({ key: "accounts", visible: true });
    expect(prefs.sections[1]).toEqual({ key: "quickActions", visible: false });
  });

  it("añade al final (visibles) las secciones que falten", () => {
    const prefs = normalizeDashboardPrefs({
      sections: [{ key: "accounts", visible: false }],
    });
    expect(prefs.sections).toHaveLength(DASHBOARD_SECTIONS.length);
    expect(prefs.sections.at(-1)?.visible).toBe(true);
    expect(prefs.sections[0]).toEqual({ key: "accounts", visible: false });
  });

  it("descarta claves desconocidas y duplicados", () => {
    const prefs = normalizeDashboardPrefs({
      sections: [
        { key: "hacker", visible: false },
        { key: "accounts", visible: false },
        { key: "accounts", visible: true },
      ],
    });
    expect(prefs.sections).toHaveLength(DASHBOARD_SECTIONS.length);
    expect(
      prefs.sections.filter((s) => s.key === "accounts")
    ).toEqual([{ key: "accounts", visible: false }]);
  });

  it("con basura devuelve los valores por defecto", () => {
    expect(normalizeDashboardPrefs(null)).toEqual(defaultDashboardPrefs());
    expect(normalizeDashboardPrefs("x")).toEqual(defaultDashboardPrefs());
    expect(normalizeDashboardPrefs({ sections: "x" })).toEqual(
      defaultDashboardPrefs()
    );
  });
});

describe("parseDashboardCookie", () => {
  it("hace roundtrip con serializeDashboardPrefs", () => {
    const prefs = normalizeDashboardPrefs({
      sections: [
        { key: "accounts", visible: true },
        { key: "monthMetrics", visible: false },
      ],
    });
    const cookie = serializeDashboardPrefs(prefs, "user-1");
    expect(parseDashboardCookie(cookie, "user-1")).toEqual(prefs);
  });

  it("ignora la cookie de OTRO usuario", () => {
    const cookie = serializeDashboardPrefs(
      normalizeDashboardPrefs({
        sections: [{ key: "accounts", visible: false }],
      }),
      "user-1"
    );
    expect(parseDashboardCookie(cookie, "user-2")).toEqual(
      defaultDashboardPrefs()
    );
  });

  it("ignora cookies ausentes o corruptas", () => {
    expect(parseDashboardCookie(undefined, "u")).toEqual(
      defaultDashboardPrefs()
    );
    expect(parseDashboardCookie("{no-json", "u")).toEqual(
      defaultDashboardPrefs()
    );
  });
});

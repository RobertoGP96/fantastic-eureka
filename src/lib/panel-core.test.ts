import { describe, expect, it } from "vitest";
import { buildPanelHash, panelHref, parsePanelHash } from "./panel-core";

describe("parsePanelHash", () => {
  it("sin fragmento no hay panel", () => {
    expect(parsePanelHash("")).toEqual({ name: null, params: {} });
    expect(parsePanelHash("#")).toEqual({ name: null, params: {} });
  });

  it("lee el nombre con o sin almohadilla", () => {
    expect(parsePanelHash("#panel=nueva-deuda").name).toBe("nueva-deuda");
    expect(parsePanelHash("panel=nueva-deuda").name).toBe("nueva-deuda");
  });

  it("separa los parámetros del nombre", () => {
    expect(parsePanelHash("#panel=nueva-deuda&contacto=abc123")).toEqual({
      name: "nueva-deuda",
      params: { contacto: "abc123" },
    });
  });

  it("ignora un fragmento que no es de panel (ancla normal)", () => {
    expect(parsePanelHash("#historial")).toEqual({ name: null, params: {} });
    expect(parsePanelHash("#contacto=abc")).toEqual({ name: null, params: {} });
  });

  it("descarta parámetros vacíos", () => {
    expect(parsePanelHash("#panel=editar&contacto=").params).toEqual({});
  });
});

describe("buildPanelHash", () => {
  it("genera el fragmento del panel", () => {
    expect(buildPanelHash("nueva-deuda")).toBe("#panel=nueva-deuda");
  });

  it("añade parámetros y omite los indefinidos o vacíos", () => {
    expect(
      buildPanelHash("nueva-deuda", {
        contacto: "abc123",
        cuenta: undefined,
        nota: "",
      })
    ).toBe("#panel=nueva-deuda&contacto=abc123");
  });

  it("un parámetro no puede pisar el nombre del panel", () => {
    expect(buildPanelHash("editar", { panel: "otro" })).toBe("#panel=editar");
  });

  it("es el inverso de parsePanelHash, también con caracteres especiales", () => {
    const params = { contacto: "a b&c=d", q: "ñandú" };
    expect(parsePanelHash(buildPanelHash("fusionar", params))).toEqual({
      name: "fusionar",
      params,
    });
  });
});

describe("panelHref", () => {
  it("une la ruta con el fragmento", () => {
    expect(panelHref("/deudas", "nueva-deuda")).toBe(
      "/deudas#panel=nueva-deuda"
    );
    expect(panelHref("/deudas", "nueva-deuda", { contacto: "x1" })).toBe(
      "/deudas#panel=nueva-deuda&contacto=x1"
    );
  });
});

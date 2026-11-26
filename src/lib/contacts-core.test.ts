import { describe, expect, it } from "vitest";
import {
  contactBalances,
  filterContacts,
  isContactNameTaken,
  mergeNotes,
  normalizeContactName,
  resolveContactInput,
} from "./contacts-core";

const CONTACTS = [
  { id: "c1", name: "José Pérez", phone: "+53 5 123 4567" },
  { id: "c2", name: "Ana María", phone: null },
  { id: "c3", name: "Josefina Ruiz", phone: "52001122" },
];

describe("normalizeContactName", () => {
  it("quita acentos, mayúsculas y espacios sobrantes", () => {
    expect(normalizeContactName("  José   PÉREZ ")).toBe("jose perez");
    expect(normalizeContactName("Ñico")).toBe("nico");
  });
});

describe("isContactNameTaken", () => {
  it("detecta el mismo nombre aunque cambie la forma", () => {
    expect(isContactNameTaken(CONTACTS, "jose perez")).toBe(true);
    expect(isContactNameTaken(CONTACTS, "ANA  MARÍA")).toBe(true);
    expect(isContactNameTaken(CONTACTS, "Pedro")).toBe(false);
  });

  it("no cuenta al propio contacto que se está editando", () => {
    expect(isContactNameTaken(CONTACTS, "José Pérez", "c1")).toBe(false);
    expect(isContactNameTaken(CONTACTS, "José Pérez", "c2")).toBe(true);
  });

  it("un nombre vacío nunca está ocupado", () => {
    expect(isContactNameTaken(CONTACTS, "   ")).toBe(false);
  });
});

describe("filterContacts", () => {
  it("sin búsqueda devuelve todos", () => {
    expect(filterContacts(CONTACTS, "  ")).toHaveLength(3);
  });

  it("busca sin acentos ni mayúsculas", () => {
    expect(filterContacts(CONTACTS, "PEREZ").map((c) => c.id)).toEqual(["c1"]);
    expect(filterContacts(CONTACTS, "maria").map((c) => c.id)).toEqual(["c2"]);
  });

  it("exige todas las palabras", () => {
    expect(filterContacts(CONTACTS, "perez ruiz")).toHaveLength(0);
    // Sin importar el orden, y cada palabra puede ser un fragmento.
    expect(filterContacts(CONTACTS, "ruiz jose").map((c) => c.id)).toEqual([
      "c3",
    ]);
  });

  it("pone primero los que empiezan por la búsqueda", () => {
    const list = [
      { id: "a", name: "María José" },
      { id: "b", name: "José" },
    ];
    expect(filterContacts(list, "jose").map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("encuentra por teléfono ignorando sus espacios", () => {
    expect(filterContacts(CONTACTS, "1234567").map((c) => c.id)).toEqual([
      "c1",
    ]);
    expect(filterContacts(CONTACTS, "5200").map((c) => c.id)).toEqual(["c3"]);
  });
});

describe("resolveContactInput", () => {
  it("vacío es ningún contacto", () => {
    expect(resolveContactInput("   ", CONTACTS)).toEqual({ kind: "none" });
  });

  it("un nombre que ya existe resuelve al existente (no duplica)", () => {
    expect(resolveContactInput("jose  perez", CONTACTS)).toEqual({
      kind: "existing",
      id: "c1",
      name: "José Pérez",
    });
  });

  it("un prefijo NO basta: es un contacto nuevo", () => {
    expect(resolveContactInput("Jose", CONTACTS)).toEqual({
      kind: "new",
      name: "Jose",
    });
  });

  it("limpia los espacios del nombre nuevo", () => {
    expect(resolveContactInput("  Pedro   Luis ", CONTACTS)).toEqual({
      kind: "new",
      name: "Pedro Luis",
    });
  });
});

describe("contactBalances", () => {
  const debt = (
    direction: string,
    currencyId: string,
    totalMinor: number,
    paidMinor = 0,
    status = "OPEN"
  ) => ({ direction, status, currencyId, totalMinor, paidMinor });

  it("separa lo que me debe de lo que le debo, por moneda", () => {
    expect(
      contactBalances([
        debt("RECEIVABLE", "cup", 300_000, 100_000),
        debt("RECEIVABLE", "cup", 50_000),
        debt("PAYABLE", "cup", 20_000),
        debt("PAYABLE", "usd", 9_000, 4_000),
      ])
    ).toEqual([
      { currencyId: "cup", receivableMinor: 250_000, payableMinor: 20_000 },
      { currencyId: "usd", receivableMinor: 0, payableMinor: 5_000 },
    ]);
  });

  it("ignora deudas saldadas, canceladas o ya cubiertas", () => {
    expect(
      contactBalances([
        debt("RECEIVABLE", "cup", 1_000, 1_000, "PAID"),
        debt("RECEIVABLE", "cup", 5_000, 0, "CANCELLED"),
        debt("PAYABLE", "cup", 700, 700),
      ])
    ).toEqual([]);
  });

  it("un sobrepago no resta al resto de deudas", () => {
    expect(
      contactBalances([
        debt("RECEIVABLE", "cup", 1_000, 1_500),
        debt("RECEIVABLE", "cup", 2_000),
      ])
    ).toEqual([{ currencyId: "cup", receivableMinor: 2_000, payableMinor: 0 }]);
  });
});

describe("mergeNotes", () => {
  it("conserva la que haya", () => {
    expect(mergeNotes(null, null)).toBeNull();
    expect(mergeNotes("Vecino", null)).toBe("Vecino");
    expect(mergeNotes(null, " Primo ")).toBe("Primo");
  });

  it("une las dos, la del destino primero", () => {
    expect(mergeNotes("Vecino", "Paga los lunes")).toBe(
      "Vecino · Paga los lunes"
    );
  });

  it("no repite una nota ya contenida", () => {
    expect(mergeNotes("Vecino del 5to", "vecino")).toBe("Vecino del 5to");
  });

  it("recorta al máximo del campo", () => {
    expect(mergeNotes("a".repeat(150), "b".repeat(150))).toHaveLength(200);
  });
});

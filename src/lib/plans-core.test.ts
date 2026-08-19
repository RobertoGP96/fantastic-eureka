import { describe, it, expect } from "vitest";
import {
  comparePlansByUrgency,
  dueTone,
  monthlyCommitmentByCurrency,
  monthlyEquivalentMinor,
  nextPending,
} from "./plans-core";

describe("monthlyEquivalentMinor", () => {
  it("deja igual la mensual", () => {
    expect(monthlyEquivalentMinor(475_000, "MONTHLY")).toBe(475_000);
  });

  it("anualiza semanal y quincenal", () => {
    // 1 000 × 52 / 12 = 4 333,33 → 4 333
    expect(monthlyEquivalentMinor(1_000, "WEEKLY")).toBe(4_333);
    // 1 000 × 26 / 12 = 2 166,66 → 2 167
    expect(monthlyEquivalentMinor(1_000, "BIWEEKLY")).toBe(2_167);
  });

  it("no cuenta las de frecuencia única ni las desconocidas", () => {
    expect(monthlyEquivalentMinor(9_000, "ONCE")).toBe(0);
    expect(monthlyEquivalentMinor(9_000, "RANDOM")).toBe(0);
  });
});

describe("dueTone", () => {
  it("marca vencidas, inminentes y futuras", () => {
    expect(dueTone(-3)).toBe("danger");
    expect(dueTone(0)).toBe("warn");
    expect(dueTone(1)).toBe("warn");
    expect(dueTone(2)).toBe("neutral");
  });
});

describe("nextPending", () => {
  const inst = (day: number, status: string) => ({
    dueAt: new Date(2026, 0, day),
    status,
  });

  it("devuelve la pendiente más próxima ignorando el resto", () => {
    const rows = [inst(20, "PENDING"), inst(5, "PAID"), inst(10, "PENDING")];
    expect(nextPending(rows)?.dueAt).toEqual(new Date(2026, 0, 10));
  });

  it("devuelve null si no queda ninguna pendiente", () => {
    expect(nextPending([inst(5, "PAID"), inst(9, "SKIPPED")])).toBeNull();
  });
});

describe("monthlyCommitmentByCurrency", () => {
  const plan = (
    amountMinor: number,
    frequency: string,
    currencyId: string,
    active = true
  ) => ({ amountMinor, frequency, currencyId, active });

  it("agrupa por moneda y ordena de mayor a menor", () => {
    expect(
      monthlyCommitmentByCurrency([
        plan(100_000, "MONTHLY", "cup"),
        plan(50_000, "MONTHLY", "cup"),
        plan(2_000, "MONTHLY", "usd"),
      ])
    ).toEqual([
      { currencyId: "cup", amountMinor: 150_000 },
      { currencyId: "usd", amountMinor: 2_000 },
    ]);
  });

  it("ignora planes inactivos y de frecuencia única", () => {
    expect(
      monthlyCommitmentByCurrency([
        plan(100_000, "MONTHLY", "cup", false),
        plan(80_000, "ONCE", "cup"),
      ])
    ).toEqual([]);
  });
});

describe("comparePlansByUrgency", () => {
  it("pone primero el vencimiento más cercano y al final los que no tienen", () => {
    const rows = [
      { description: "Netflix", nextDueAt: new Date(2026, 1, 10) },
      { description: "Sin cuotas", nextDueAt: null },
      { description: "Renta", nextDueAt: new Date(2026, 0, 3) },
    ];
    expect(
      [...rows].sort(comparePlansByUrgency).map((r) => r.description)
    ).toEqual(["Renta", "Netflix", "Sin cuotas"]);
  });

  it("desempata por descripción", () => {
    const due = new Date(2026, 0, 3);
    const rows = [
      { description: "Zumba", nextDueAt: due },
      { description: "Agua", nextDueAt: due },
    ];
    expect(
      [...rows].sort(comparePlansByUrgency).map((r) => r.description)
    ).toEqual(["Agua", "Zumba"]);
  });
});

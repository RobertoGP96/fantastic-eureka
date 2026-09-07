import { describe, expect, it } from "vitest";
import {
  accountDeltaMinor,
  activityDeltas,
  addDays,
  addMonths,
  aggregateActivity,
  bucketRange,
  startOfDay,
  startOfMonth,
  startOfWeek,
  type AccountLedgerEntry,
} from "./account-activity";

const entry = (
  partial: Partial<AccountLedgerEntry> & { kind: string }
): AccountLedgerEntry => ({
  accountId: "propia",
  counterAccountId: null,
  amountMinor: 1000,
  counterAmountMinor: null,
  occurredAt: new Date(2026, 8, 7, 12, 0),
  ...partial,
});

describe("accountDeltaMinor", () => {
  it("lado propio: INCOME suma, EXPENSE y TRANSFER restan", () => {
    expect(accountDeltaMinor("propia", entry({ kind: "INCOME" }))).toBe(1000);
    expect(accountDeltaMinor("propia", entry({ kind: "EXPENSE" }))).toBe(-1000);
    expect(accountDeltaMinor("propia", entry({ kind: "TRANSFER" }))).toBe(-1000);
  });

  it("ADJUSTMENT conserva su signo", () => {
    expect(
      accountDeltaMinor("propia", entry({ kind: "ADJUSTMENT", amountMinor: -700 }))
    ).toBe(-700);
  });

  it("transferencia entrante suma counterAmountMinor (moneda de la destino)", () => {
    const transfer = entry({
      kind: "TRANSFER",
      accountId: "origen",
      counterAccountId: "destino",
      counterAmountMinor: 2500,
    });
    expect(accountDeltaMinor("destino", transfer)).toBe(2500);
  });

  it("como contraparte de un no-TRANSFER no aporta nada", () => {
    const multiCurrency = entry({
      kind: "INCOME",
      accountId: "origen",
      counterAccountId: "otra",
      counterAmountMinor: 999,
    });
    expect(accountDeltaMinor("otra", multiCurrency)).toBe(0);
  });

  it("un movimiento ajeno no aporta nada", () => {
    expect(accountDeltaMinor("ajena", entry({ kind: "INCOME" }))).toBe(0);
  });
});

describe("activityDeltas", () => {
  it("mapea a epoch ms y omite deltas nulos", () => {
    const when = new Date(2026, 8, 1, 9, 30);
    const deltas = activityDeltas("propia", [
      entry({ kind: "INCOME", occurredAt: when, amountMinor: 500 }),
      entry({ kind: "INCOME", accountId: "ajena" }),
      entry({ kind: "EXPENSE", occurredAt: when, amountMinor: 200 }),
    ]);
    expect(deltas).toEqual([
      { t: when.getTime(), deltaMinor: 500 },
      { t: when.getTime(), deltaMinor: -200 },
    ]);
  });
});

describe("aritmética de calendario", () => {
  it("startOfDay / startOfMonth truncan en local", () => {
    const t = new Date(2026, 8, 7, 23, 59).getTime();
    expect(new Date(startOfDay(t)).getHours()).toBe(0);
    expect(new Date(startOfMonth(t)).getDate()).toBe(1);
  });

  it("startOfWeek cae en lunes", () => {
    // 7 sep 2026 es lunes; el domingo 13 pertenece a esa misma semana.
    const monday = new Date(2026, 8, 7).getTime();
    expect(startOfWeek(new Date(2026, 8, 13, 20).getTime())).toBe(monday);
    expect(startOfWeek(monday)).toBe(monday);
  });

  it("addDays y addMonths usan calendario (fin de mes incluido)", () => {
    expect(new Date(addDays(new Date(2026, 0, 31).getTime(), 1)).getMonth()).toBe(1);
    const feb = addMonths(new Date(2026, 0, 15).getTime(), 1);
    expect(new Date(feb).getMonth()).toBe(1);
    expect(new Date(feb).getDate()).toBe(1);
  });
});

describe("bucketRange", () => {
  it("genera n+1 bordes diarios que cubren el rango", () => {
    const from = new Date(2026, 8, 1).getTime();
    const to = new Date(2026, 8, 7, 15).getTime();
    const edges = bucketRange(from, to, "day");
    expect(edges.length).toBe(8); // 7 días → 8 bordes
    expect(edges[0]).toBe(from);
    expect(edges[edges.length - 1]).toBeGreaterThan(to);
  });

  it("bordes mensuales caen en el día 1 de cada mes", () => {
    const from = new Date(2026, 0, 1).getTime();
    const to = new Date(2026, 3, 10).getTime();
    const edges = bucketRange(from, to, "month");
    expect(edges.map((e) => new Date(e).getDate())).toEqual([1, 1, 1, 1, 1]);
  });
});

describe("aggregateActivity", () => {
  const day = (d: number, hour = 10) => new Date(2026, 8, d, hour).getTime();

  it("suma entradas y salidas en su bucket e ignora lo de fuera", () => {
    const edges = bucketRange(day(1, 0), day(2, 23), "day");
    const buckets = aggregateActivity(
      [
        { t: day(1), deltaMinor: 500 },
        { t: day(1, 18), deltaMinor: -200 },
        { t: day(2), deltaMinor: 300 },
        { t: day(9), deltaMinor: 9999 }, // fuera del rango
      ],
      edges
    );
    expect(buckets.length).toBe(2);
    expect(buckets[0]).toMatchObject({ inMinor: 500, outMinor: 200 });
    expect(buckets[1]).toMatchObject({ inMinor: 300, outMinor: 0 });
  });

  it("un delta en el borde pertenece al bucket que empieza ahí", () => {
    const edges = bucketRange(day(1, 0), day(2, 23), "day");
    const buckets = aggregateActivity([{ t: day(2, 0), deltaMinor: 100 }], edges);
    expect(buckets[0].inMinor).toBe(0);
    expect(buckets[1].inMinor).toBe(100);
  });

  it("sin bordes suficientes devuelve lista vacía", () => {
    expect(aggregateActivity([{ t: day(1), deltaMinor: 1 }], [day(1)])).toEqual([]);
  });
});

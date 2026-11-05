import { describe, expect, it } from "vitest";
import { PULL_OVERLAP_MS, RESYNC_AFTER_MS, pullWindow } from "./window";

const now = new Date("2026-09-22T12:00:00.000Z");

describe("pullWindow", () => {
  it("sin cursor es un pull completo, sin resync", () => {
    expect(pullWindow(null, now)).toEqual({ since: null, resync: false });
  });

  it("resta el solape al cursor", () => {
    const cursor = "2026-09-22T11:00:00.000Z";
    const window = pullWindow(cursor, now);
    expect(window.resync).toBe(false);
    expect(window.since?.getTime()).toBe(
      new Date(cursor).getTime() - PULL_OVERLAP_MS
    );
  });

  it("un cursor inválido fuerza resync completo", () => {
    expect(pullWindow("no-es-fecha", now)).toEqual({ since: null, resync: true });
  });

  it("un cursor demasiado viejo fuerza resync", () => {
    const old = new Date(now.getTime() - RESYNC_AFTER_MS - 1).toISOString();
    expect(pullWindow(old, now)).toEqual({ since: null, resync: true });
  });

  it("un cursor en el futuro fuerza resync", () => {
    const future = new Date(now.getTime() + 5 * PULL_OVERLAP_MS).toISOString();
    expect(pullWindow(future, now)).toEqual({ since: null, resync: true });
  });
});

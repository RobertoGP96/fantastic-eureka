import { beforeEach, describe, expect, it, vi } from "vitest";

// Prisma de mentira con transacciones reales en miniatura: las escrituras de
// una transacción solo se confirman si su función termina sin lanzar. Eso
// permite comprobar la garantía central del push: una operación rechazada
// no deja NADA escrito aunque su servicio hubiera escrito antes de fallar.

type Row = { userId: string; opId: string; type: string; status: string; error?: string };

const state = vi.hoisted(() => ({
  ops: [] as Row[],
  writes: [] as string[],
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => {
  const syncOperation = (ops: Row[]) => ({
    findUnique: async ({ where }: { where: { userId_opId: { userId: string; opId: string } } }) =>
      ops.find(
        (r) => r.userId === where.userId_opId.userId && r.opId === where.userId_opId.opId
      ) ?? null,
    create: async ({ data }: { data: Row }) => {
      ops.push(data);
      return data;
    },
  });
  return {
    prisma: {
      syncOperation: syncOperation(state.ops),
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const stagedOps: Row[] = [];
        const stagedWrites: string[] = [];
        const tx = {
          syncOperation: syncOperation(stagedOps),
          write: (label: string) => stagedWrites.push(label),
        };
        const result = await fn(tx); // si lanza, nada se confirma
        state.ops.push(...stagedOps);
        state.writes.push(...stagedWrites);
        return result;
      },
    },
  };
});

vi.mock("./op-registry", () => ({
  OP_HANDLERS: {
    "ok.op": async (ctx: { db: { write: (l: string) => void } }) => {
      ctx.db.write("ok");
      return { success: true, data: { id: "fila-1" } };
    },
    // Escribe y DESPUÉS falla: la escritura no debe sobrevivir.
    "half.op": async (ctx: { db: { write: (l: string) => void } }) => {
      ctx.db.write("a-medias");
      return { success: false, error: "El abono supera el saldo pendiente" };
    },
    "boom.op": async () => {
      throw new Error("conexión perdida");
    },
  },
}));

import { applyOps } from "./push";

const op = (opId: string, type: string) => ({ opId, type, payload: {} });

beforeEach(() => {
  state.ops.length = 0;
  state.writes.length = 0;
});

describe("applyOps", () => {
  it("aplica la operación, confirma su escritura y registra el opId", async () => {
    const [result] = await applyOps("u1", [op("op-00001", "ok.op")]);
    expect(result).toEqual({ opId: "op-00001", status: "applied", data: { id: "fila-1" } });
    expect(state.writes).toEqual(["ok"]);
    expect(state.ops).toMatchObject([{ opId: "op-00001", status: "APPLIED" }]);
  });

  it("un opId ya visto devuelve duplicate sin volver a aplicarlo", async () => {
    await applyOps("u1", [op("op-00001", "ok.op")]);
    const [again] = await applyOps("u1", [op("op-00001", "ok.op")]);
    expect(again.status).toBe("duplicate");
    expect(state.writes).toEqual(["ok"]);
  });

  it("un rechazo de negocio revierte lo escrito y anota el motivo", async () => {
    const [result] = await applyOps("u1", [op("op-00002", "half.op")]);
    expect(result).toEqual({
      opId: "op-00002",
      status: "rejected",
      error: "El abono supera el saldo pendiente",
    });
    expect(state.writes).toEqual([]);
    expect(state.ops).toMatchObject([{ opId: "op-00002", status: "REJECTED" }]);
  });

  it("reintentar una operación rechazada devuelve duplicate con su error", async () => {
    await applyOps("u1", [op("op-00002", "half.op")]);
    const [again] = await applyOps("u1", [op("op-00002", "half.op")]);
    expect(again).toEqual({
      opId: "op-00002",
      status: "duplicate",
      error: "El abono supera el saldo pendiente",
    });
  });

  it("un tipo desconocido se rechaza", async () => {
    const [result] = await applyOps("u1", [op("op-00003", "nada.op")]);
    expect(result).toMatchObject({ status: "rejected", error: "Operación desconocida" });
  });

  it("un fallo de infraestructura NO registra el opId: se reintentará", async () => {
    const [result] = await applyOps("u1", [op("op-00004", "boom.op")]);
    expect(result.status).toBe("rejected");
    expect(state.ops).toEqual([]);
  });

  it("un rechazo no detiene el resto del lote", async () => {
    const results = await applyOps("u1", [
      op("op-00005", "half.op"),
      op("op-00006", "ok.op"),
    ]);
    expect(results.map((r) => r.status)).toEqual(["rejected", "applied"]);
    expect(state.writes).toEqual(["ok"]);
  });
});

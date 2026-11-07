import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "./db-url";

const POOLED = "postgresql://u:p@ep-x-pooler.c-2.us-east-2.aws.neon.tech/neondb";
const DIRECT = "postgresql://u:p@ep-x.c-2.us-east-2.aws.neon.tech/neondb";

function params(url: string | undefined) {
  return Object.fromEntries(new URL(url ?? "").searchParams.entries());
}

describe("normalizeDatabaseUrl", () => {
  it("añade schema, ssl, timeout y parámetros del pooler cuando faltan", () => {
    expect(params(normalizeDatabaseUrl(POOLED))).toEqual({
      schema: "caja",
      sslmode: "require",
      connect_timeout: "15",
      pgbouncer: "true",
      connection_limit: "10",
    });
  });

  it("no añade pgbouncer ni connection_limit a la conexión directa", () => {
    expect(params(normalizeDatabaseUrl(DIRECT))).toEqual({
      schema: "caja",
      sslmode: "require",
      connect_timeout: "15",
    });
  });

  it("respeta los parámetros ya presentes (p. ej. el schema de E2E)", () => {
    const url = `${POOLED}?schema=caja_e2e&connect_timeout=30&pgbouncer=true`;
    const p = params(normalizeDatabaseUrl(url));
    expect(p.schema).toBe("caja_e2e");
    expect(p.connect_timeout).toBe("30");
    expect(p.pgbouncer).toBe("true");
    expect(p.connection_limit).toBe("10");
  });

  it("conserva usuario, contraseña, host y base", () => {
    const out = normalizeDatabaseUrl(`${POOLED}?schema=caja`) ?? "";
    expect(out.startsWith(POOLED)).toBe(true);
  });

  it("devuelve tal cual lo que no es una URL de Postgres", () => {
    expect(normalizeDatabaseUrl(undefined)).toBeUndefined();
    expect(normalizeDatabaseUrl("")).toBe("");
    expect(normalizeDatabaseUrl("file:./dev.db")).toBe("file:./dev.db");
    expect(normalizeDatabaseUrl("no es url")).toBe("no es url");
  });
});

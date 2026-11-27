// URLs de la BD exclusiva para E2E: la MISMA base de Neon que usa la app pero
// en el schema `caja_e2e`, aislado del schema real (`caja`) y del schema
// `public` (otro proyecto). Se derivan de DATABASE_URL / DIRECT_URL del
// entorno cambiando SOLO el parámetro `schema`; `normalizeDatabaseUrl`
// (src/lib/db-url.ts) respeta un schema ya presente, así que el runtime de
// Next se queda en `caja_e2e`.
// Las comparten playwright.config.ts (webServer.env) y e2e/setup-db.ts.
//
// OJO: estas URLs llevan credenciales — no imprimirlas en logs ni errores.
import "dotenv/config";

export const TEST_SCHEMA = "caja_e2e";

// Schemas que la suite no puede tocar jamás, pase lo que pase con el entorno.
const PROTECTED_SCHEMAS = ["caja", "public"];

function parsePostgresUrl(name: string, raw: string | undefined): URL {
  if (!raw) {
    throw new Error(
      `E2E: falta ${name} en el entorno. Defínela en .env (ver .env.example): ` +
        "la suite deriva de ella la BD de test en el schema " +
        `"${TEST_SCHEMA}".`
    );
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`E2E: ${name} no es una URL válida.`);
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(
      `E2E: ${name} debe ser una URL postgresql:// (se recibió "${url.protocol}//…"). ` +
        "La suite ya no usa SQLite."
    );
  }
  return url;
}

function toTestUrl(name: "DATABASE_URL" | "DIRECT_URL"): string {
  const url = parsePostgresUrl(name, process.env[name]);
  url.searchParams.set("schema", TEST_SCHEMA);
  return url.toString();
}

/**
 * Guard duro: lanza si la URL no apunta EXACTAMENTE al schema de test. Se
 * llama antes de cualquier operación destructiva (DROP SCHEMA, migraciones).
 */
export function assertTestSchema(name: string, rawUrl: string): void {
  const schema = parsePostgresUrl(name, rawUrl).searchParams.get("schema");
  if (schema !== null && PROTECTED_SCHEMAS.includes(schema.toLowerCase())) {
    throw new Error(
      `E2E: ${name} apunta al schema protegido "${schema}". Abortado.`
    );
  }
  if (schema !== TEST_SCHEMA) {
    throw new Error(
      `E2E: ${name} debe apuntar al schema "${TEST_SCHEMA}" ` +
        `(resuelto: ${schema === null ? "ninguno" : `"${schema}"`}). Abortado.`
    );
  }
}

/** Endpoint con pooler: lo usa el runtime de Next durante la corrida. */
export const TEST_DATABASE_URL = toTestUrl("DATABASE_URL");
/** Endpoint directo: lo usan el DROP SCHEMA y `prisma migrate deploy`. */
export const TEST_DIRECT_URL = toTestUrl("DIRECT_URL");

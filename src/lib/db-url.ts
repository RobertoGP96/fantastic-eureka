// Normaliza la URL de conexión a Postgres (Neon) antes de crear el PrismaClient.
//
// Motivo: las variables de entorno (Vercel, plantillas viejas de Neon) a veces
// llegan sin los parámetros que la app necesita y el fallo aparece solo en
// producción: sin `connect_timeout` Prisma espera 5 s y el arranque en frío
// del cómputo de Neon (scale-to-zero) supera ese margen → P1001 «Can't reach
// database server»; sin `pgbouncer=true` el pooler agota conexiones (P2024);
// sin `schema=caja` apunta al schema `public` de otro proyecto.
//
// Solo AÑADE lo que falta: cualquier parámetro ya presente se respeta (así
// la BD de E2E conserva su `schema=caja_e2e`).

export const DB_SCHEMA = "caja";
export const DB_CONNECT_TIMEOUT_SECONDS = 15;
export const DB_POOL_CONNECTION_LIMIT = 10;

export function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return raw;

  const params = url.searchParams;
  const setDefault = (key: string, value: string) => {
    if (!params.has(key)) params.set(key, value);
  };

  setDefault("schema", DB_SCHEMA);
  setDefault("sslmode", "require");
  setDefault("connect_timeout", String(DB_CONNECT_TIMEOUT_SECONDS));
  if (url.hostname.includes("-pooler")) {
    setDefault("pgbouncer", "true");
    setDefault("connection_limit", String(DB_POOL_CONNECTION_LIMIT));
  }
  return url.toString();
}

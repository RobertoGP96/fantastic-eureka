// URL de la BD SQLite exclusiva para E2E. Relativa a prisma/schema.prisma
// (igual que dev.db en .env) → el archivo real es prisma/test.db.
// La comparten playwright.config.ts (webServer.env) y e2e/setup-db.ts.
export const TEST_DB_FILE = "test.db";
export const TEST_DATABASE_URL = `file:./${TEST_DB_FILE}`;

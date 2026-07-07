// Prepara la BD de test E2E desde cero: borra prisma/test.db, aplica las
// migraciones y ejecuta el seed. Se invoca desde el webServer de Playwright
// ANTES de levantar `pnpm dev` (el webServer arranca antes que globalSetup,
// por eso la preparación va encadenada al comando y no en globalSetup).
// DATABASE_URL se fuerza aquí SIEMPRE a la BD de test: este script no puede
// tocar dev.db ni aunque se ejecute suelto con otro entorno cargado.
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TEST_DATABASE_URL, TEST_DB_FILE } from "./test-db";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = { ...process.env, DATABASE_URL: TEST_DATABASE_URL };

for (const suffix of ["", "-journal"]) {
  const file = path.join(root, "prisma", `${TEST_DB_FILE}${suffix}`);
  if (existsSync(file)) rmSync(file);
}

execSync("pnpm exec prisma migrate deploy", {
  cwd: root,
  env,
  stdio: "inherit",
});
execSync("pnpm exec tsx prisma/seed.ts", { cwd: root, env, stdio: "inherit" });

console.log(`BD de test E2E lista (prisma/${TEST_DB_FILE}).`);

// Prepara la BD de test E2E desde cero: borra el schema `caja_e2e` de Neon,
// lo vuelve a crear y aplica las migraciones. Se invoca desde el webServer
// de Playwright ANTES de levantar `pnpm dev` (el webServer arranca antes que
// globalSetup, por eso la preparación va encadenada al comando y no en
// globalSetup).
//
// DATABASE_URL y DIRECT_URL se fuerzan aquí SIEMPRE a las de test (schema
// `caja_e2e`): este script no puede tocar el schema real (`caja`) ni el
// `public` aunque se ejecute suelto con otro entorno cargado.
//
// Sin seed: en una BD vacía no hace nada; las monedas, denominaciones y
// categorías de cada usuario se crean al registrarse (bootstrapUserDefaults).
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import {
  assertTestSchema,
  TEST_DATABASE_URL,
  TEST_DIRECT_URL,
  TEST_SCHEMA,
} from "./test-db";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  // Guard duro ANTES de cualquier operación destructiva.
  assertTestSchema("DATABASE_URL (test)", TEST_DATABASE_URL);
  assertTestSchema("DIRECT_URL (test)", TEST_DIRECT_URL);
  // El identificador del DROP es la constante, nunca algo leído del entorno;
  // la comprobación sobra hoy, pero impide que un cambio futuro la rompa.
  if (TEST_SCHEMA !== "caja_e2e") {
    throw new Error(`E2E: schema de test inesperado "${TEST_SCHEMA}". Abortado.`);
  }

  const prisma = new PrismaClient({ datasourceUrl: TEST_DIRECT_URL });
  try {
    await prisma.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`
    );
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${TEST_SCHEMA}"`);
  } finally {
    await prisma.$disconnect();
  }

  execSync("pnpm exec prisma migrate deploy", {
    cwd: root,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DIRECT_URL,
    },
    stdio: "inherit",
  });

  console.log(`BD de test E2E lista (schema "${TEST_SCHEMA}").`);
}

main().catch((error: unknown) => {
  // Solo el mensaje: un volcado del error de Prisma podría incluir la URL.
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

// Config del CLI de Prisma (sustituye al bloque "prisma" de package.json,
// deprecado en Prisma 7). OJO: con este archivo el CLI ya NO carga .env
// automáticamente — el import de dotenv lo repone. dotenv no pisa variables
// ya definidas, así que overrides explícitos (p.ej. DATABASE_URL de la BD de
// test en e2e/setup-db.ts) siguen teniendo prioridad.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});

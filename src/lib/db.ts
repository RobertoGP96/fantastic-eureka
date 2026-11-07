import { PrismaClient } from "@prisma/client";
import { normalizeDatabaseUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// La URL se normaliza en runtime (ver db-url.ts) para no depender de que la
// variable de entorno traiga schema/pgbouncer/connect_timeout.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: normalizeDatabaseUrl(process.env.DATABASE_URL) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

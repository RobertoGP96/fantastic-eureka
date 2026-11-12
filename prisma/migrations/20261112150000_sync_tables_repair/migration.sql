-- Repara las tablas de sincronización móvil en bases que arrastran la forma
-- VIEJA de la migración "mobile_sync_foundation" (aplicada fuera del repo).
--
-- Qué pasaba: `20260922120000_mobile_sync` crea SyncTombstone/SyncOperation
-- con CREATE TABLE IF NOT EXISTS. En Neon esas tablas YA existían con otras
-- columnas (SyncTombstone.model/entityId, SyncOperation.kind/result), así que
-- el CREATE se saltó y nunca llegaron las columnas que usa el código
-- (collection/rowId y type). Consecuencias en producción:
--   · cualquier borrado raíz de la web (cuenta, movimiento, deuda, plan,
--     categoría, grupo, denominación) fallaba: su transacción inserta la
--     lápida en SyncTombstone.collection, que no existía (P2022);
--   · el push y el pull incremental de la API móvil respondían 500.
--
-- ADITIVA e IDEMPOTENTE: añade lo que falta, rellena desde las columnas
-- viejas y las deja como opcionales (no las borra). En una base creada desde
-- cero con las migraciones del repo no hace nada. Las comprobaciones miran
-- current_schema(), así que sirve igual para el schema de E2E.
-- Aplicar con `pnpm db:deploy`.

-- ── SyncTombstone: collection + rowId ───────────────────────────────────────
ALTER TABLE "SyncTombstone" ADD COLUMN IF NOT EXISTS "collection" TEXT;
ALTER TABLE "SyncTombstone" ADD COLUMN IF NOT EXISTS "rowId" TEXT;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'SyncTombstone' AND column_name = 'model'
  ) THEN
    UPDATE "SyncTombstone" SET "collection" = "model" WHERE "collection" IS NULL;
    ALTER TABLE "SyncTombstone" ALTER COLUMN "model" DROP NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'SyncTombstone' AND column_name = 'entityId'
  ) THEN
    UPDATE "SyncTombstone" SET "rowId" = "entityId" WHERE "rowId" IS NULL;
    ALTER TABLE "SyncTombstone" ALTER COLUMN "entityId" DROP NOT NULL;
  END IF;
END $$;

-- Filas que no se pudieron rellenar (no debería haber ninguna).
UPDATE "SyncTombstone" SET "collection" = 'unknown' WHERE "collection" IS NULL;
UPDATE "SyncTombstone" SET "rowId" = "id" WHERE "rowId" IS NULL;
ALTER TABLE "SyncTombstone" ALTER COLUMN "collection" SET NOT NULL;
ALTER TABLE "SyncTombstone" ALTER COLUMN "rowId" SET NOT NULL;

-- ── SyncOperation: type ─────────────────────────────────────────────────────
ALTER TABLE "SyncOperation" ADD COLUMN IF NOT EXISTS "type" TEXT;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'SyncOperation' AND column_name = 'kind'
  ) THEN
    UPDATE "SyncOperation" SET "type" = "kind" WHERE "type" IS NULL;
    ALTER TABLE "SyncOperation" ALTER COLUMN "kind" DROP NOT NULL;
  END IF;
END $$;

UPDATE "SyncOperation" SET "type" = 'unknown' WHERE "type" IS NULL;
ALTER TABLE "SyncOperation" ALTER COLUMN "type" SET NOT NULL;

-- ── Claves foráneas con comprobación POR SCHEMA ─────────────────────────────
-- La migración anterior miraba pg_constraint solo por nombre: en una base
-- con dos schemas (p. ej. caja y caja_e2e) el segundo se quedaba sin estas
-- FK porque «ya existían» en el primero.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'SyncTombstone_userId_fkey' AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "SyncTombstone" ADD CONSTRAINT "SyncTombstone_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'SyncOperation_userId_fkey' AND n.nspname = current_schema()
  ) THEN
    ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

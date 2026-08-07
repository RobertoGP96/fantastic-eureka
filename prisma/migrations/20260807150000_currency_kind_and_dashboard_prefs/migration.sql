-- Clasificación de la moneda: CASH (efectivo, admite denominaciones) |
-- DIGITAL (solo saldo, ej. MLC — no existe en efectivo).
ALTER TABLE "Currency" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'CASH';

-- Backfill: MLC se sembró sin denominaciones porque es saldo de tarjeta.
UPDATE "Currency" SET "kind" = 'DIGITAL'
WHERE "code" = 'MLC'
  AND NOT EXISTS (
    SELECT 1 FROM "Denomination" d WHERE d."currencyId" = "Currency"."id"
  );

-- Preferencias de la vista de Inicio por usuario (JSON serializado;
-- null = valores por defecto). Ver src/lib/dashboard-prefs.ts.
ALTER TABLE "User" ADD COLUMN "dashboardPrefs" TEXT;

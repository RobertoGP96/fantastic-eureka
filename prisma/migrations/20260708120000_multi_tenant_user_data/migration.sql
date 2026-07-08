-- Multi-tenancy: cada usuario es dueño de sus monedas, cuentas, grupos,
-- categorías, movimientos, tasas, arqueos, contactos, deudas y planes.
-- Los datos EXISTENTES se asignan al usuario más antiguo (creador original).
-- Los modelos hijos (Denomination, CashCountLine, Installment, DebtPayment)
-- no llevan userId: heredan el dueño a través de su padre.

-- 1) Columnas nuevas (nullable para poder backfillear)
ALTER TABLE "Currency" ADD COLUMN "userId" TEXT;
ALTER TABLE "AccountGroup" ADD COLUMN "userId" TEXT;
ALTER TABLE "Account" ADD COLUMN "userId" TEXT;
ALTER TABLE "Category" ADD COLUMN "userId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "userId" TEXT;
ALTER TABLE "ExchangeRate" ADD COLUMN "userId" TEXT;
ALTER TABLE "CashCount" ADD COLUMN "userId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "userId" TEXT;
ALTER TABLE "Debt" ADD COLUMN "userId" TEXT;
ALTER TABLE "PaymentPlan" ADD COLUMN "userId" TEXT;

-- 2) Backfill: todo lo existente pasa a ser del usuario más antiguo.
--    (En una BD vacía —p.ej. la de tests E2E— esto no hace nada.)
UPDATE "Currency" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "AccountGroup" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Account" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Category" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Transaction" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "ExchangeRate" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "CashCount" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Contact" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "Debt" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;
UPDATE "PaymentPlan" SET "userId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1) WHERE "userId" IS NULL;

-- 3) Obligatorias: si quedaran filas sin dueño (datos sin ningún usuario),
--    esto falla a propósito antes que dejar datos huérfanos.
ALTER TABLE "Currency" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "AccountGroup" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Account" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Transaction" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "ExchangeRate" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "CashCount" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Debt" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "PaymentPlan" ALTER COLUMN "userId" SET NOT NULL;

-- 4) Unicidades globales → por usuario
DROP INDEX "Currency_code_key";
DROP INDEX "AccountGroup_name_key";
DROP INDEX "Category_name_kind_key";
CREATE UNIQUE INDEX "Currency_userId_code_key" ON "Currency"("userId", "code");
CREATE UNIQUE INDEX "AccountGroup_userId_name_key" ON "AccountGroup"("userId", "name");
CREATE UNIQUE INDEX "Category_userId_name_kind_key" ON "Category"("userId", "name", "kind");

-- 5) Índices de consulta por usuario
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Transaction_userId_occurredAt_idx" ON "Transaction"("userId", "occurredAt");
CREATE INDEX "ExchangeRate_userId_effectiveAt_idx" ON "ExchangeRate"("userId", "effectiveAt");
CREATE INDEX "CashCount_userId_idx" ON "CashCount"("userId");
CREATE INDEX "Contact_userId_idx" ON "Contact"("userId");
CREATE INDEX "Debt_userId_idx" ON "Debt"("userId");
CREATE INDEX "PaymentPlan_userId_idx" ON "PaymentPlan"("userId");

-- 6) Claves foráneas (borrar usuario ⇒ se borran sus datos)
ALTER TABLE "Currency" ADD CONSTRAINT "Currency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountGroup" ADD CONSTRAINT "AccountGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashCount" ADD CONSTRAINT "CashCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Fundación de la sincronización con la app móvil (Changebox Android).
-- ADITIVA: no cambia nada que la web use hoy.
--  · updatedAt en las tablas de datos (y User) para el pull incremental.
--  · SyncTombstone: borrados raíz que el móvil debe replicar.
--  · SyncOperation: idempotencia del push por opId.
-- Idempotente (IF NOT EXISTS): el CLAUDE.md de la web mencionaba una
-- migración "mobile_sync_foundation" aplicada fuera del repo; migrate status
-- no la ve, pero si alguna columna llegó por `db push` esto no choca.
-- Aplicar SOLO con `pnpm db:deploy` (nunca `migrate dev` contra Neon).

-- AlterTable
ALTER TABLE "Currency" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Denomination" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "AccountGroup" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "TransactionDenomination" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ExchangeRate" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CashCount" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "CashCountLine" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PaymentPlan" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Installment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "DebtPayment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SyncTombstone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncTombstone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SyncOperation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SyncTombstone_userId_deletedAt_idx" ON "SyncTombstone"("userId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SyncOperation_userId_opId_key" ON "SyncOperation"("userId", "opId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Currency_userId_updatedAt_idx" ON "Currency"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountGroup_userId_updatedAt_idx" ON "AccountGroup"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Account_userId_updatedAt_idx" ON "Account"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Category_userId_updatedAt_idx" ON "Category"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_userId_updatedAt_idx" ON "Transaction"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExchangeRate_userId_updatedAt_idx" ON "ExchangeRate"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CashCount_userId_updatedAt_idx" ON "CashCount"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Contact_userId_updatedAt_idx" ON "Contact"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Debt_userId_updatedAt_idx" ON "Debt"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PaymentPlan_userId_updatedAt_idx" ON "PaymentPlan"("userId", "updatedAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SyncTombstone_userId_fkey') THEN
    ALTER TABLE "SyncTombstone" ADD CONSTRAINT "SyncTombstone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SyncOperation_userId_fkey') THEN
    ALTER TABLE "SyncOperation" ADD CONSTRAINT "SyncOperation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;


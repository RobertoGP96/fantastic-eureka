-- Código de seguimiento de una cuenta: enlace de solo lectura (saldo y
-- movimientos) que caduca a las 24 h. Ver src/lib/account-share.ts.
CREATE TABLE "AccountShare" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountShare_token_key" ON "AccountShare"("token");

CREATE INDEX "AccountShare_accountId_idx" ON "AccountShare"("accountId");

ALTER TABLE "AccountShare" ADD CONSTRAINT "AccountShare_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountShare" ADD CONSTRAINT "AccountShare_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

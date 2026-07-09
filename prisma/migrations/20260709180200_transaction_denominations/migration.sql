-- CreateTable
CREATE TABLE "TransactionDenomination" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "denominationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "TransactionDenomination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionDenomination_accountId_idx" ON "TransactionDenomination"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionDenomination_transactionId_accountId_denominatio_key" ON "TransactionDenomination"("transactionId", "accountId", "denominationId");

-- AddForeignKey
ALTER TABLE "TransactionDenomination" ADD CONSTRAINT "TransactionDenomination_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionDenomination" ADD CONSTRAINT "TransactionDenomination_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionDenomination" ADD CONSTRAINT "TransactionDenomination_denominationId_fkey" FOREIGN KEY ("denominationId") REFERENCES "Denomination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

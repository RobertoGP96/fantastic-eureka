-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "counterCurrencyId" TEXT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_counterCurrencyId_fkey" FOREIGN KEY ("counterCurrencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

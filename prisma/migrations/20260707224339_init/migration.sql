-- CreateTable
CREATE TABLE "Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimalPlaces" INTEGER NOT NULL DEFAULT 2,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Denomination" (
    "id" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "valueMinor" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Denomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "groupId" TEXT,
    "icon" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "counterAccountId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currencyId" TEXT NOT NULL,
    "counterAmountMinor" INTEGER,
    "rateScaled" INTEGER,
    "categoryId" TEXT,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCurrencyId" TEXT NOT NULL,
    "toCurrencyId" TEXT NOT NULL,
    "rateScaled" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashCount" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "countedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalMinor" INTEGER NOT NULL,
    "expectedMinor" INTEGER NOT NULL,
    "differenceMinor" INTEGER NOT NULL,
    "note" TEXT,
    "adjustmentTxId" TEXT,

    CONSTRAINT "CashCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashCountLine" (
    "id" TEXT NOT NULL,
    "cashCountId" TEXT NOT NULL,
    "denominationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "CashCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "note" TEXT,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "currencyId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPlan" (
    "id" TEXT NOT NULL,
    "debtId" TEXT,
    "contactId" TEXT,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "currencyId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfMonth" INTEGER,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DebtPayment" (
    "id" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Denomination_currencyId_valueMinor_kind_key" ON "Denomination"("currencyId", "valueMinor", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "AccountGroup_name_key" ON "AccountGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_kind_key" ON "Category"("name", "kind");

-- CreateIndex
CREATE INDEX "Transaction_accountId_occurredAt_idx" ON "Transaction"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "Transaction_occurredAt_idx" ON "Transaction"("occurredAt");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrencyId_toCurrencyId_effectiveAt_idx" ON "ExchangeRate"("fromCurrencyId", "toCurrencyId", "effectiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashCount_adjustmentTxId_key" ON "CashCount"("adjustmentTxId");

-- CreateIndex
CREATE UNIQUE INDEX "CashCountLine_cashCountId_denominationId_key" ON "CashCountLine"("cashCountId", "denominationId");

-- CreateIndex
CREATE UNIQUE INDEX "Installment_transactionId_key" ON "Installment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Installment_planId_dueAt_key" ON "Installment"("planId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "DebtPayment_transactionId_key" ON "DebtPayment"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- AddForeignKey
ALTER TABLE "Denomination" ADD CONSTRAINT "Denomination_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AccountGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_counterAccountId_fkey" FOREIGN KEY ("counterAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExchangeRate" ADD CONSTRAINT "ExchangeRate_toCurrencyId_fkey" FOREIGN KEY ("toCurrencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCount" ADD CONSTRAINT "CashCount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCount" ADD CONSTRAINT "CashCount_adjustmentTxId_fkey" FOREIGN KEY ("adjustmentTxId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCountLine" ADD CONSTRAINT "CashCountLine_cashCountId_fkey" FOREIGN KEY ("cashCountId") REFERENCES "CashCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashCountLine" ADD CONSTRAINT "CashCountLine_denominationId_fkey" FOREIGN KEY ("denominationId") REFERENCES "Denomination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPlan" ADD CONSTRAINT "PaymentPlan_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PaymentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "Debt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DebtPayment" ADD CONSTRAINT "DebtPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

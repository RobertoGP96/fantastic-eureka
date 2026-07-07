// Borra los datos de trabajo conservando el seed (monedas, denominaciones,
// categorías). Útil para desarrollo: `pnpm tsx prisma/reset-data.ts`.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.cashCountLine.deleteMany();
  await prisma.cashCount.deleteMany();
  await prisma.debtPayment.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.paymentPlan.deleteMany();
  await prisma.debt.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.exchangeRate.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.account.deleteMany();
  console.log("Datos de trabajo eliminados (seed intacto).");
}

main()
  .catch((error) => {
    console.error("Error al limpiar datos:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

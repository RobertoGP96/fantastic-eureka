import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

type Db = PrismaClient | Prisma.TransactionClient;

// Acepta un TransactionClient para releer el pendiente dentro de la
// transacción que registra el abono (evita sobrepagos por doble envío).
export async function debtRemainingMinor(
  debtId: string,
  db: Db = prisma
): Promise<number> {
  const [debt, paid] = await Promise.all([
    db.debt.findUnique({ where: { id: debtId } }),
    db.debtPayment.aggregate({
      where: { debtId },
      _sum: { amountMinor: true },
    }),
  ]);
  if (!debt) return 0;
  return debt.totalMinor - (paid._sum.amountMinor ?? 0);
}

/** Cuotas pendientes vencidas o que vencen dentro de `withinDays` días. */
export async function upcomingInstallments(userId: string, withinDays = 7) {
  const limit = new Date();
  limit.setDate(limit.getDate() + withinDays);
  limit.setHours(23, 59, 59, 999);

  return prisma.installment.findMany({
    where: {
      status: "PENDING",
      dueAt: { lte: limit },
      plan: { active: true, userId },
    },
    include: {
      plan: {
        include: {
          currency: { select: { code: true, decimalPlaces: true } },
          contact: { select: { name: true } },
          debt: { include: { contact: { select: { name: true } } } },
        },
      },
    },
    orderBy: { dueAt: "asc" },
  });
}

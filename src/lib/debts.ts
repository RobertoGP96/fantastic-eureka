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

/**
 * Bloquea la fila de la deuda hasta el final de la transacción. Llamar ANTES
 * de `debtRemainingMinor`: releer el pendiente dentro de la transacción no
 * basta por sí solo, porque con el aislamiento por defecto de Postgres (READ
 * COMMITTED) dos abonos simultáneos leen el mismo pendiente y ambos pasan. Con
 * el bloqueo el segundo espera al primero y ya ve su abono.
 * Se hace con un UPDATE de Prisma (y no con SELECT … FOR UPDATE en SQL crudo)
 * para no depender del search_path bajo PgBouncer.
 */
export async function lockDebt(
  tx: Prisma.TransactionClient,
  debtId: string
): Promise<void> {
  await tx.debt.update({
    where: { id: debtId },
    data: { updatedAt: new Date() },
    select: { id: true },
  });
}

/**
 * Una deuda que queda SALDADA ya no necesita sus planes: las cuotas
 * pendientes pasan a SKIPPED y los planes se desactivan. Lo comparten el
 * abono directo y la edición de un movimiento de abono.
 */
export async function closeDebtPlans(
  tx: Prisma.TransactionClient,
  userId: string,
  debtId: string
): Promise<void> {
  await tx.installment.updateMany({
    where: { plan: { debtId, userId }, status: "PENDING" },
    data: { status: "SKIPPED" },
  });
  await tx.paymentPlan.updateMany({
    where: { debtId, userId },
    data: { active: false },
  });
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

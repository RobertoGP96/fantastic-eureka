"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as transactionService from "@/lib/services/transaction-service";
import type { MovementTouched } from "@/lib/services/transaction-service";

// La lógica vive en src/lib/services/transaction-service.ts (la comparte la
// API móvil); aquí solo sesión por cookie + revalidación de la UI web.

function revalidateMovementPaths(accountIds: string[]) {
  revalidatePath("/");
  revalidatePath("/cuentas");
  revalidatePath("/movimientos");
  for (const id of accountIds) revalidatePath(`/cuentas/${id}`);
}

/** Vistas de deudas/mensualidades si el movimiento venía de un abono/cuota. */
function revalidateDebtPaths({ debtIds, planIds }: MovementTouched) {
  if (debtIds.length === 0 && planIds.length === 0) return;
  revalidatePath("/deudas");
  for (const id of debtIds) revalidatePath(`/deudas/${id}`);
  if (planIds.length > 0) {
    revalidatePath("/mensualidades");
    for (const id of planIds) revalidatePath(`/mensualidades/${id}`);
  }
}

export async function registerIncomeExpense(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await transactionService.registerIncomeExpense(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  revalidateMovementPaths(result.data.touched.accountIds);
  return { success: true, data: { id: result.data.id } };
}

export async function registerTransfer(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await transactionService.registerTransfer(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  revalidateMovementPaths(result.data.touched.accountIds);
  return { success: true, data: { id: result.data.id } };
}

export async function updateTransaction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await transactionService.updateTransaction(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  const { id, touched } = result.data;
  revalidateMovementPaths(touched.accountIds);
  revalidatePath(`/movimientos/${id}`);
  revalidateDebtPaths(touched);
  return { success: true, data: { id } };
}

export async function deleteTransaction(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await transactionService.deleteTransaction(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  revalidateMovementPaths(result.data.touched.accountIds);
  revalidateDebtPaths(result.data.touched);
  return { success: true, data: undefined };
}

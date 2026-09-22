"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as debtService from "@/lib/services/debt-service";

// La lógica vive en src/lib/services/debt-service.ts (la comparte la API
// móvil); aquí solo sesión por cookie + revalidación de la UI web.

function revalidateDebtPaths(debtId: string, accountId?: string) {
  revalidatePath("/");
  revalidatePath("/deudas");
  revalidatePath(`/deudas/${debtId}`);
  // La lista de mensualidades incluye los planes ligados a deudas.
  revalidatePath("/mensualidades");
  if (accountId) {
    revalidatePath("/cuentas");
    revalidatePath(`/cuentas/${accountId}`);
    revalidatePath("/movimientos");
  }
}

export async function createDebt(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await debtService.createDebt(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateDebtPaths(result.data.id);
  return result;
}

export async function setDebtAccount(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await debtService.setDebtAccount(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateDebtPaths(result.data.id);
  return result;
}

export async function registerDebtPayment(
  input: unknown
): Promise<ActionResult<{ id: string; settled: boolean }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await debtService.registerDebtPayment(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  const { id, settled, debtId, accountId } = result.data;
  revalidateDebtPaths(debtId, accountId);
  return { success: true, data: { id, settled } };
}

// Elimina la deuda (abonos y planes incluidos; los movimientos se conservan).
// El UI confirma antes. Detalle en debtService.deleteDebt.
export async function deleteDebt(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await debtService.deleteDebt(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  revalidateDebtPaths(result.data.debtId);
  revalidatePath("/movimientos");
  return { success: true, data: undefined };
}

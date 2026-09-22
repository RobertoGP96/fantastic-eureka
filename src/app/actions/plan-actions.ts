"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as planService from "@/lib/services/plan-service";

// La lógica vive en src/lib/services/plan-service.ts (la comparte la API
// móvil); aquí solo sesión por cookie + revalidación de la UI web.

function revalidatePlanPaths(planId: string, debtId?: string | null) {
  revalidatePath("/");
  revalidatePath("/deudas");
  revalidatePath("/mensualidades");
  revalidatePath(`/mensualidades/${planId}`);
  if (debtId) revalidatePath(`/deudas/${debtId}`);
}

export async function createPlan(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await planService.createPlan(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidatePlanPaths(result.data.id);
  return result;
}

export async function setPlanAccount(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await planService.setPlanAccount(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  revalidatePlanPaths(result.data.id, result.data.debtId);
  return { success: true, data: { id: result.data.id } };
}

export async function settleInstallment(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await planService.settleInstallment(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  const { id, planId, debtId, accountId } = result.data;
  revalidatePlanPaths(planId, debtId);
  revalidatePath("/cuentas");
  revalidatePath(`/cuentas/${accountId}`);
  revalidatePath("/movimientos");
  return { success: true, data: { id } };
}

export async function skipInstallment(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await planService.skipInstallment(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  const { id, planId, debtId } = result.data;
  revalidatePlanPaths(planId, debtId);
  return { success: true, data: { id } };
}

export async function deactivatePlan(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await planService.deactivatePlan(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  revalidatePlanPaths(result.data.id, result.data.debtId);
  return { success: true, data: { id: result.data.id } };
}

// Elimina el plan y sus cuotas (los movimientos se conservan). El UI confirma
// antes. Detalle en planService.deletePlan.
export async function deletePlan(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await planService.deletePlan(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  revalidatePlanPaths(result.data.planId, result.data.debtId);
  revalidatePath("/movimientos");
  return { success: true, data: undefined };
}

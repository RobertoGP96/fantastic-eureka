"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as groupService from "@/lib/services/group-service";

// La lógica vive en src/lib/services/group-service.ts (la comparte la API
// móvil); aquí solo sesión por cookie + revalidación de la UI web.

function revalidateGroupPaths(accountId?: string) {
  revalidatePath("/");
  revalidatePath("/cuentas");
  revalidatePath("/cuentas/grupos");
  revalidatePath("/cuentas/nueva");
  if (accountId) revalidatePath(`/cuentas/${accountId}`);
}

export async function createAccountGroup(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await groupService.createAccountGroup(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateGroupPaths();
  return result;
}

export async function renameAccountGroup(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await groupService.renameAccountGroup(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateGroupPaths();
  return result;
}

export async function deleteAccountGroup(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await groupService.deleteAccountGroup(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateGroupPaths();
  return result;
}

export async function assignAccountGroup(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await groupService.assignAccountGroup(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateGroupPaths(result.data.id);
  return result;
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as accountService from "@/lib/services/account-service";

// La lógica vive en src/lib/services/account-service.ts (la comparte la API
// móvil); aquí solo sesión por cookie + revalidación de la UI web.

export async function createAccount(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await accountService.createAccount(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidatePath("/");
    revalidatePath("/cuentas");
  }
  return result;
}

export async function setAccountIcon(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await accountService.setAccountIcon(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidatePath("/");
    revalidatePath("/cuentas");
    revalidatePath(`/cuentas/${result.data.id}`);
    revalidatePath("/conteo");
  }
  return result;
}

export async function updateAccount(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await accountService.updateAccount(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidatePath("/");
    revalidatePath("/cuentas");
    revalidatePath(`/cuentas/${result.data.id}`);
  }
  return result;
}

// Borra la cuenta con todo su historial (ver deleteAccount en el servicio).
export async function deleteAccount(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await accountService.deleteAccount(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidatePath("/");
    revalidatePath("/cuentas");
    revalidatePath("/conteo");
    revalidatePath("/movimientos");
    revalidatePath("/deudas");
  }
  return result;
}

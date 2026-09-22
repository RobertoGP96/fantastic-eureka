"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as categoryService from "@/lib/services/category-service";

// La lógica vive en src/lib/services/category-service.ts (la comparte la API
// móvil); aquí solo sesión por cookie + revalidación de la UI web.

export async function createCategory(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await categoryService.createCategory(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidatePath("/categorias");
    revalidatePath("/registrar");
  }
  return result;
}

export async function renameCategory(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await categoryService.renameCategory(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidatePath("/categorias");
    revalidatePath("/registrar");
    revalidatePath("/movimientos");
  }
  return result;
}

export async function deleteCategory(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await categoryService.deleteCategory(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidatePath("/categorias");
    revalidatePath("/registrar");
  }
  return result;
}

export async function toggleCategory(
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await categoryService.toggleCategory(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidatePath("/categorias");
    revalidatePath("/registrar");
  }
  return result;
}

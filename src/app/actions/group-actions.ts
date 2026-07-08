"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import {
  assignGroupSchema,
  groupSchema,
  idSchema,
  renameGroupSchema,
  type ActionResult,
} from "@/lib/schemas";

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
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const group = await prisma.accountGroup.create({
      data: { name: parsed.data.name, userId: user.id },
    });
    revalidateGroupPaths();
    return { success: true, data: { id: group.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe un grupo con ese nombre" };
    }
    console.error("createAccountGroup:", error);
    return { success: false, error: "No se pudo crear el grupo" };
  }
}

export async function renameAccountGroup(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = renameGroupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const group = await prisma.accountGroup.update({
      where: { id: parsed.data.id, userId: user.id },
      data: { name: parsed.data.name },
    });
    revalidateGroupPaths();
    return { success: true, data: { id: group.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe un grupo con ese nombre" };
    }
    console.error("renameAccountGroup:", error);
    return { success: false, error: "No se pudo renombrar el grupo" };
  }
}

export async function deleteAccountGroup(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    // onDelete: SetNull deja las cuentas del grupo como "Sin grupo".
    const group = await prisma.accountGroup.delete({
      where: { id: parsed.data, userId: user.id },
    });
    revalidateGroupPaths();
    return { success: true, data: { id: group.id } };
  } catch (error) {
    console.error("deleteAccountGroup:", error);
    return { success: false, error: "No se pudo eliminar el grupo" };
  }
}

export async function assignAccountGroup(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = assignGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    if (parsed.data.groupId) {
      const group = await prisma.accountGroup.findFirst({
        where: { id: parsed.data.groupId, userId: user.id },
      });
      if (!group) return { success: false, error: "Grupo no válido" };
    }

    const account = await prisma.account.update({
      where: { id: parsed.data.accountId, userId: user.id },
      data: { groupId: parsed.data.groupId },
    });
    revalidateGroupPaths(account.id);
    return { success: true, data: { id: account.id } };
  } catch (error) {
    console.error("assignAccountGroup:", error);
    return { success: false, error: "No se pudo asignar el grupo" };
  }
}

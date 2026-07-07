"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser, invalidateOtherSessions } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  updatePasswordSchema,
  updateProfileSchema,
  type ActionResult,
} from "@/lib/schemas";

export async function updateProfile(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const user = await getSessionUser();
  if (!user) return { success: false, error: "Sesión no válida" };

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { name: parsed.data.name, email: parsed.data.email },
    });
    revalidatePath("/perfil");
    revalidatePath("/");
    return { success: true, data: { id: user.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe una cuenta con ese correo" };
    }
    console.error("updateProfile:", error);
    return { success: false, error: "No se pudo actualizar el perfil" };
  }
}

export async function updatePassword(
  input: unknown
): Promise<ActionResult<undefined>> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) return { success: false, error: "Sesión no válida" };

  try {
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
    });
    if (!user || !verifyPassword(parsed.data.current, user.passwordHash)) {
      return { success: false, error: "La contraseña actual no es correcta" };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(parsed.data.next) },
    });
    // Seguridad: al cambiar la contraseña se cierran las demás sesiones.
    await invalidateOtherSessions(user.id);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("updatePassword:", error);
    return { success: false, error: "No se pudo cambiar la contraseña" };
  }
}

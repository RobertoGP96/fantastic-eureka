// Servicio de perfil. Lógica extraída de src/app/actions/profile-actions.ts
// sin cambios de comportamiento: mismas validaciones y mismos mensajes.
//
// Lo que depende de cookies NO está aquí: al cambiar la contraseña la action
// web cierra las demás sesiones con invalidateOtherSessions (src/lib/auth.ts,
// que conserva la sesión de la cookie actual). Cada cliente invalida sus
// otras sesiones a su manera tras un `success`.

import { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  updatePasswordSchema,
  updateProfileSchema,
  type ActionResult,
} from "@/lib/schemas";
import { unexpectedFailure, type ServiceContext } from "./context";

export async function updateProfile(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { name: parsed.data.name, email: parsed.data.email },
    });
    return { success: true, data: { id: userId } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe una cuenta con ese correo" };
    }
    return unexpectedFailure("updateProfile", error, "No se pudo actualizar el perfil");
  }
}

/**
 * Verifica la contraseña actual y guarda la nueva. NO cierra otras sesiones:
 * eso lo hace el llamador tras un `success` (ver cabecera).
 */
export async function updatePassword(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<undefined>> {
  const parsed = updatePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !verifyPassword(parsed.data.current, user.passwordHash)) {
      return { success: false, error: "La contraseña actual no es correcta" };
    }

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(parsed.data.next) },
    });
    return { success: true, data: undefined };
  } catch (error) {
    return unexpectedFailure("updatePassword", error, "No se pudo cambiar la contraseña");
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser, invalidateOtherSessions } from "@/lib/auth";
import {
  updatePasswordSchema,
  updateProfileSchema,
  type ActionResult,
} from "@/lib/schemas";
import * as profileService from "@/lib/services/profile-service";

// La lógica vive en src/lib/services/profile-service.ts (la comparte la API
// móvil); aquí solo sesión por cookie + revalidación de la UI web y el
// cierre de las otras sesiones (depende de la cookie actual).
//
// Estas actions validan la entrada ANTES de mirar la sesión (orden
// histórico: un formulario inválido informa del campo aunque la sesión haya
// caducado); el servicio vuelve a validar, es barato e idempotente.

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

  const result = await profileService.updateProfile(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidatePath("/perfil");
    revalidatePath("/");
  }
  return result;
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

  const result = await profileService.updatePassword(
    { db: prisma, userId: sessionUser.id },
    input
  );
  if (!result.success) return result;

  try {
    // Seguridad: al cambiar la contraseña se cierran las demás sesiones.
    await invalidateOtherSessions(sessionUser.id);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updatePassword:", error);
    return { success: false, error: "No se pudo cambiar la contraseña" };
  }
}

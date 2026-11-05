"use server";

import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import * as authService from "@/lib/services/auth-service";

// La lógica (alta con datos por defecto, verificación de contraseña) vive en
// src/lib/services/auth-service.ts y la comparte la API móvil; aquí solo se
// crea o destruye la cookie de sesión.

export async function registerUser(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const result = await authService.registerUser(prisma, input);
  if (!result.success) return result;
  try {
    await createSession(result.data.id);
    return { success: true, data: { id: result.data.id } };
  } catch (error) {
    console.error("registerUser:", error);
    return { success: false, error: "No se pudo crear la cuenta" };
  }
}

export async function loginUser(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const result = await authService.verifyCredentials(prisma, input);
  if (!result.success) return result;
  try {
    await createSession(result.data.id);
    return { success: true, data: { id: result.data.id } };
  } catch (error) {
    console.error("loginUser:", error);
    return { success: false, error: "No se pudo iniciar sesión" };
  }
}

export async function logoutUser(): Promise<ActionResult<undefined>> {
  try {
    await destroySession();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("logoutUser:", error);
    return { success: false, error: "No se pudo cerrar la sesión" };
  }
}

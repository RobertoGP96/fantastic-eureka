"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  loginSchema,
  registerSchema,
  type ActionResult,
} from "@/lib/schemas";

export async function registerUser(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash: hashPassword(parsed.data.password),
      },
    });

    await createSession(user.id);
    return { success: true, data: { id: user.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe una cuenta con ese correo" };
    }
    console.error("registerUser:", error);
    return { success: false, error: "No se pudo crear la cuenta" };
  }
}

export async function loginUser(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    // Mensaje genérico: no revelar si el correo existe.
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      return { success: false, error: "Correo o contraseña incorrectos" };
    }

    await createSession(user.id);
    return { success: true, data: { id: user.id } };
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

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { idSchema, type ActionResult } from "@/lib/schemas";
import { issueShare } from "@/lib/shares";

// Código de seguimiento de una cuenta: enlace público de solo lectura
// (saldo + movimientos) que caduca a las 24 h. Ver src/lib/shares.ts.

export async function createAccountShare(
  input: unknown
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const account = await prisma.account.findFirst({
      where: { id: parsed.data, userId: user.id },
      select: { id: true },
    });
    if (!account) return { success: false, error: "Cuenta no encontrada" };

    const share = await issueShare(user.id, account.id);
    revalidatePath(`/cuentas/${account.id}`);
    return {
      success: true,
      data: { token: share.token, expiresAt: share.expiresAt.toISOString() },
    };
  } catch (error) {
    console.error("createAccountShare:", error);
    return { success: false, error: "No se pudo generar el código" };
  }
}

/** Revoca los códigos vigentes de la cuenta: el enlace deja de abrir. */
export async function revokeAccountShare(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const account = await prisma.account.findFirst({
      where: { id: parsed.data, userId: user.id },
      select: { id: true },
    });
    if (!account) return { success: false, error: "Cuenta no encontrada" };

    await prisma.accountShare.updateMany({
      where: { accountId: account.id, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    revalidatePath(`/cuentas/${account.id}`);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("revokeAccountShare:", error);
    return { success: false, error: "No se pudo revocar el código" };
  }
}

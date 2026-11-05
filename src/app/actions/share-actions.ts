"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as shareService from "@/lib/services/share-service";

// Código de seguimiento de una cuenta: enlace público de solo lectura
// (saldo + movimientos) que caduca a las 24 h. Ver src/lib/shares.ts.
// La lógica vive en src/lib/services/share-service.ts; aquí solo sesión por
// cookie + revalidación de la UI web.

export async function createAccountShare(
  input: unknown
): Promise<ActionResult<{ token: string; expiresAt: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await shareService.createAccountShare(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;
  revalidatePath(`/cuentas/${result.data.accountId}`);
  return {
    success: true,
    data: { token: result.data.token, expiresAt: result.data.expiresAt },
  };
}

/** Revoca los códigos vigentes de la cuenta: el enlace deja de abrir. */
export async function revokeAccountShare(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await shareService.revokeAccountShare(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;
  revalidatePath(`/cuentas/${result.data.accountId}`);
  return { success: true, data: undefined };
}

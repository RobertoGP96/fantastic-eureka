// Servicio del código de seguimiento de una cuenta (enlace público de solo
// lectura que caduca a las 24 h; ver src/lib/shares.ts). Lógica extraída de
// src/app/actions/share-actions.ts sin cambios de comportamiento.
//
// Ambas funciones devuelven además `accountId` (la action lo usa para
// revalidar /cuentas/[id] y lo quita de la respuesta pública).

import { idSchema, type ActionResult } from "@/lib/schemas";
import { issueShare } from "@/lib/shares";
import { unexpectedFailure, type ServiceContext } from "./context";

export async function createAccountShare(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<
  ActionResult<{ token: string; expiresAt: string; accountId: string }>
> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const account = await db.account.findFirst({
      where: { id: parsed.data, userId },
      select: { id: true },
    });
    if (!account) return { success: false, error: "Cuenta no encontrada" };

    const share = await issueShare(userId, account.id, db);
    return {
      success: true,
      data: {
        token: share.token,
        expiresAt: share.expiresAt.toISOString(),
        accountId: account.id,
      },
    };
  } catch (error) {
    return unexpectedFailure("createAccountShare", error, "No se pudo generar el código");
  }
}

/** Revoca los códigos vigentes de la cuenta: el enlace deja de abrir. */
export async function revokeAccountShare(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ accountId: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const account = await db.account.findFirst({
      where: { id: parsed.data, userId },
      select: { id: true },
    });
    if (!account) return { success: false, error: "Cuenta no encontrada" };

    await db.accountShare.updateMany({
      where: { accountId: account.id, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true, data: { accountId: account.id } };
  } catch (error) {
    return unexpectedFailure("revokeAccountShare", error, "No se pudo revocar el código");
  }
}

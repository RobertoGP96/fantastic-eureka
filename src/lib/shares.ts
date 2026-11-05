import "server-only";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { inTx, type Db } from "@/lib/services/context";
import {
  isShareActive,
  isWellFormedShareToken,
  shareExpiresAt,
} from "@/lib/account-share";

// Capa servidor del código de seguimiento (la lógica pura está en
// account-share.ts). Hay como mucho UN código vigente por cuenta: generar
// otro revoca el anterior.

export function newShareToken(): string {
  // 24 bytes → 32 caracteres base64url: imposible de adivinar y aún corto
  // para pegarlo a mano en /compartir.
  return randomBytes(24).toString("base64url");
}

export interface ActiveShare {
  id: string;
  token: string;
  expiresAt: Date;
}

/** Código vigente de la cuenta (o null). Para el panel del propietario. */
export async function activeShareForAccount(
  userId: string,
  accountId: string
): Promise<ActiveShare | null> {
  return prisma.accountShare.findFirst({
    where: {
      userId,
      accountId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, expiresAt: true },
  });
}

/**
 * Crea el código de 24 h de la cuenta revocando cualquier otro vigente y
 * limpiando los ya caducados de esa cuenta (no acumulan basura).
 * `db` opcional (por defecto el prisma global) para que share-service pueda
 * pasar su conexión o una transacción ya abierta.
 */
export async function issueShare(
  userId: string,
  accountId: string,
  db: Db = prisma
): Promise<ActiveShare> {
  const now = new Date();
  const token = newShareToken();
  return inTx(db, async (tx) => {
    await tx.accountShare.deleteMany({
      where: { accountId, expiresAt: { lte: now } },
    });
    await tx.accountShare.updateMany({
      where: { accountId, revokedAt: null },
      data: { revokedAt: now },
    });
    return tx.accountShare.create({
      data: { userId, accountId, token, expiresAt: shareExpiresAt(now) },
      select: { id: true, token: true, expiresAt: true },
    });
  });
}

/**
 * Resuelve un token de la URL pública: null si no existe, caducó o fue
 * revocado. Trae lo que necesita la vista (cuenta, moneda y propietario).
 */
export async function resolveShareToken(token: string) {
  if (!isWellFormedShareToken(token)) return null;
  const share = await prisma.accountShare.findUnique({
    where: { token },
    include: {
      account: { include: { currency: true } },
      user: { select: { name: true } },
    },
  });
  if (!share || !isShareActive(share)) return null;
  return share;
}

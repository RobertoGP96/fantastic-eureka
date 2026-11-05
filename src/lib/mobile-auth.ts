import "server-only";

// Sesión de la app móvil: token opaco en `Authorization: Bearer <token>`.
// Usa la MISMA tabla Session que la cookie web (se guarda el SHA-256 del
// token, nunca el token en claro), así que cerrar sesiones desde el perfil
// web también las cierra en el móvil.
//
// A diferencia de la cookie (30 días fijos), la sesión móvil se RENUEVA al
// usarse: si le quedan menos de 15 días, vuelve a 30. Un teléfono que
// sincroniza a menudo no pide contraseña nunca; uno abandonado caduca.

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { AuthUser } from "@/lib/services/auth-service";

const SESSION_DAYS = 30;
const RENEW_BELOW_DAYS = 15;
const DAY_MS = 86_400_000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match ? match[1] : null;
}

export interface MobileSession {
  token: string;
  expiresAt: Date;
}

export async function issueMobileSession(userId: string): Promise<MobileSession> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await prisma.session.create({
    data: { token: hashToken(token), userId, expiresAt },
  });
  return { token, expiresAt };
}

/** Usuario del token Bearer, o null si falta, no existe o caducó. */
export async function mobileUser(request: Request): Promise<AuthUser | null> {
  const token = bearerToken(request);
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() < now) {
    await prisma.session
      .delete({ where: { id: session.id } })
      .catch(() => undefined);
    return null;
  }
  if (session.expiresAt.getTime() - now < RENEW_BELOW_DAYS * DAY_MS) {
    await prisma.session
      .update({
        where: { id: session.id },
        data: { expiresAt: new Date(now + SESSION_DAYS * DAY_MS) },
      })
      .catch(() => undefined);
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}

export async function revokeMobileSession(request: Request): Promise<void> {
  const token = bearerToken(request);
  if (!token) return;
  await prisma.session.deleteMany({ where: { token: hashToken(token) } });
}

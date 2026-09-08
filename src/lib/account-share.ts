// Lógica pura del código de seguimiento de una cuenta (enlace de solo
// lectura que caduca a las 24 h). Sin dependencias de servidor: la usan la
// action que crea el código, la página pública que lo valida y el panel del
// propietario (cliente) para mostrar cuánto le queda.

/** Vigencia fija del código: 24 horas desde su creación. */
export const SHARE_TTL_MS = 24 * 60 * 60 * 1000;

export interface ShareLike {
  expiresAt: Date;
  revokedAt: Date | null;
}

export function shareExpiresAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + SHARE_TTL_MS);
}

/** Vigente = no revocado y con fecha de caducidad en el futuro. */
export function isShareActive(
  share: ShareLike,
  now: Date = new Date()
): boolean {
  return share.revokedAt === null && share.expiresAt.getTime() > now.getTime();
}

/** Ruta pública del enlace (sin origen; el cliente antepone su origin). */
export function sharePath(token: string): string {
  return `/compartir/${encodeURIComponent(token)}`;
}

// El token se genera con randomBytes → base64url; esta forma es la que la
// página pública acepta antes de consultar la BD (corta cualquier basura).
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{16,64}$/;

export function isWellFormedShareToken(token: string): boolean {
  return TOKEN_SHAPE.test(token);
}

/**
 * Texto del tiempo restante: "23 h 10 min", "45 min", "menos de 1 min" o
 * "Caducado". Redondea hacia abajo para no prometer más de lo que queda.
 */
export function shareRemainingLabel(
  expiresAt: Date,
  now: Date = new Date()
): string {
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "Caducado";
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return "menos de 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

// Hash de contraseñas con scrypt de node:crypto — sin dependencias externas.
// Formato almacenado: "scrypt:<salt hex>:<hash hex>".
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  return timingSafeEqual(candidate, expected);
}

// GET /api/mobile/v1/me  (Bearer) → { ok, data: { user } }
// Sirve para comprobar el token al abrir la app (y lo renueva si hace falta).
import { mobileUser } from "@/lib/mobile-auth";
import { ok, unauthorized } from "@/lib/mobile-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await mobileUser(request);
  if (!user) return unauthorized();
  return ok({ user });
}

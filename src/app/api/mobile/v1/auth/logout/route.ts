// POST /api/mobile/v1/auth/logout  (Bearer) → { ok, data: null }
// Idempotente: un token ya inválido también responde ok.
import { revokeMobileSession } from "@/lib/mobile-auth";
import { ok } from "@/lib/mobile-http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await revokeMobileSession(request);
  return ok(null);
}

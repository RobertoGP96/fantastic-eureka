// POST /api/mobile/v1/auth/register  { name, email, password, confirm }
//   → { ok, data: { token, expiresAt, user } }  (usuario con datos por defecto)
import { prisma } from "@/lib/db";
import { issueMobileSession } from "@/lib/mobile-auth";
import { fail, ok, readJson } from "@/lib/mobile-http";
import { registerUser } from "@/lib/services/auth-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await registerUser(prisma, await readJson(request));
  if (!result.success) return fail(result.error, 400);
  const session = await issueMobileSession(result.data.id);
  return ok(
    { token: session.token, expiresAt: session.expiresAt, user: result.data },
    201
  );
}

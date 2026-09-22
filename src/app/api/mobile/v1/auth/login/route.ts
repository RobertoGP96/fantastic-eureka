// POST /api/mobile/v1/auth/login  { email, password }
//   → { ok, data: { token, expiresAt, user } }
import { prisma } from "@/lib/db";
import { issueMobileSession } from "@/lib/mobile-auth";
import { fail, ok, readJson } from "@/lib/mobile-http";
import { verifyCredentials } from "@/lib/services/auth-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const result = await verifyCredentials(prisma, await readJson(request));
  if (!result.success) return fail(result.error, 401);
  const session = await issueMobileSession(result.data.id);
  return ok({ token: session.token, expiresAt: session.expiresAt, user: result.data });
}

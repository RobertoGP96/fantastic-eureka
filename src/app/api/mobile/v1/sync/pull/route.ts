// GET /api/mobile/v1/sync/pull?cursor=<ISO>  (Bearer)
//   → { ok, data: { nextCursor, full, resync, user, collections, tombstones } }
// Sin cursor = pull completo (bootstrap). Ver docs/mobile-api.md.
import { mobileUser } from "@/lib/mobile-auth";
import { fail, ok, unauthorized } from "@/lib/mobile-http";
import { pullChanges } from "@/lib/sync/pull";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await mobileUser(request);
  if (!user) return unauthorized();

  const cursor = new URL(request.url).searchParams.get("cursor");
  try {
    return ok(await pullChanges(user.id, cursor));
  } catch (error) {
    console.error("mobile pull:", error);
    return fail("No se pudo sincronizar", 500);
  }
}

// POST /api/mobile/v1/sync/push  (Bearer)  { ops: [{ opId, type, payload, ids? }] }
//   → { ok, data: { results: [{ opId, status, error?, data? }] } }
// Tras el push el cliente hace SIEMPRE un pull. Ver docs/mobile-api.md.
import { mobileUser } from "@/lib/mobile-auth";
import { fail, ok, readJson, unauthorized } from "@/lib/mobile-http";
import { applyOps, pushSchema } from "@/lib/sync/push";

export const dynamic = "force-dynamic";
// Un lote de 200 operaciones puede tardar; el límite por defecto es corto.
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await mobileUser(request);
  if (!user) return unauthorized();

  const parsed = pushSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos", 400);
  }
  return ok({ results: await applyOps(user.id, parsed.data.ops) });
}

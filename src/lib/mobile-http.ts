import "server-only";

// Respuestas JSON de la API móvil (/api/mobile/v1). Forma estable:
//   éxito → 200 { ok: true, data }
//   fallo → 4xx/5xx { ok: false, error }  (error = mensaje en español, el
//            mismo que muestra la web)
// 401 significa SIEMPRE "sesión no válida": la app lo usa para pasar a
// SessionExpired sin borrar sus datos locales.

import { NextResponse } from "next/server";
import { SESSION_EXPIRED } from "@/lib/services/context";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function unauthorized() {
  return fail(SESSION_EXPIRED, 401);
}

/** Cuerpo JSON o undefined si no es JSON válido. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

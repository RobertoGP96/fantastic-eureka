import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// Limpia la cookie de sesión (válida o huérfana) y manda al login.
// El layout de (app) redirige aquí cuando hay cookie pero la sesión no
// existe en la BD — p. ej. tras un cambio de base de datos.
export async function GET(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/auth/login", request.url));
}

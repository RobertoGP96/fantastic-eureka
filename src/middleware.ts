import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth-shared";

// Comprobación optimista: solo mira que exista la cookie (el middleware corre
// en edge y no puede usar Prisma). La validación real de la sesión la hace
// getSessionUser() en el layout del grupo (app).
export function middleware(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/auth");

  if (!hasSession && !isAuthPage) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }
  // /auth/salir debe poder ejecutarse CON cookie (la limpia y evita bucles
  // cuando la cookie quedó huérfana, p. ej. tras cambiar de base de datos).
  if (hasSession && isAuthPage && pathname !== "/auth/salir") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};

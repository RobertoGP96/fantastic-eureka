"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth";
import {
  DASHBOARD_COOKIE,
  normalizeDashboardPrefs,
  serializeDashboardPrefs,
} from "@/lib/dashboard-prefs";
import { dashboardPrefsSchema, type ActionResult } from "@/lib/schemas";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Guarda las preferencias del dashboard en la cookie `caja_dashboard`
 * (por navegador; lleva el id del usuario para no filtrarse entre cuentas
 * distintas en el mismo equipo).
 */
export async function saveDashboardPrefs(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = dashboardPrefsSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Preferencias inválidas" };
  }

  try {
    const prefs = normalizeDashboardPrefs(parsed.data);
    const store = await cookies();
    store.set(DASHBOARD_COOKIE, serializeDashboardPrefs(prefs, user.id), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
    });
    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("saveDashboardPrefs:", error);
    return { success: false, error: "No se pudieron guardar las preferencias" };
  }
}

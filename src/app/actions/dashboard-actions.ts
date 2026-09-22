"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as dashboardService from "@/lib/services/dashboard-service";

// La lógica vive en src/lib/services/dashboard-service.ts (la comparte la
// API móvil); aquí solo sesión por cookie + revalidación de la UI web.
export async function saveDashboardPrefs(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await dashboardService.saveDashboardPrefs(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidatePath("/");
  return result;
}

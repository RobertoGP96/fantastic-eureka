"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as cashCountService from "@/lib/services/cash-count-service";

// La lógica vive en src/lib/services/cash-count-service.ts (la comparte la
// API móvil); aquí solo sesión por cookie + revalidación de la UI web.
export async function createCashCount(
  input: unknown
): Promise<ActionResult<{ id: string; differenceMinor: number }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await cashCountService.createCashCount(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  const { id, differenceMinor, accountId } = result.data;
  revalidatePath("/");
  revalidatePath("/cuentas");
  revalidatePath(`/cuentas/${accountId}`);
  revalidatePath("/conteo");
  revalidatePath(`/conteo/${accountId}`);
  revalidatePath("/movimientos");
  return { success: true, data: { id, differenceMinor } };
}

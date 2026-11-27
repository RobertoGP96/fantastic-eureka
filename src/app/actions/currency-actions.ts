"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { revalidateDebtFormHosts } from "@/lib/revalidate-paths";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as currencyService from "@/lib/services/currency-service";

// La lógica vive en src/lib/services/currency-service.ts (la comparte la API
// móvil); aquí solo sesión por cookie + revalidación de la UI web. Los
// campos extra que devuelve el servicio para revalidar (currencyId,
// changed) no salen al cliente: la forma pública es la de siempre.

// Las monedas y denominaciones alimentan selects y arqueos en toda la app.
// Los formularios que las usan viven en drawers de estas páginas (ya no hay
// rutas `/x/nueva`), así que se revalida la página que hospeda cada uno.
function revalidateCurrencyPaths(currencyId?: string) {
  revalidatePath("/");
  revalidatePath("/monedas");
  if (currencyId) revalidatePath(`/monedas/${currencyId}`);
  revalidatePath("/tasas");
  // El detalle de un par hospeda «Registrar tasa» (lista de monedas).
  revalidatePath("/(app)/tasas/[from]/[to]", "page");
  // El alta de cuenta es un drawer de /cuentas.
  revalidatePath("/cuentas");
  revalidateDebtFormHosts();
}

export async function createCurrency(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await currencyService.createCurrency(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateCurrencyPaths(result.data.id);
  return result;
}

export async function toggleCurrency(
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await currencyService.toggleCurrency(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateCurrencyPaths(result.data.id);
  return result;
}

export async function setCurrencyKind(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await currencyService.setCurrencyKind(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;
  // Sin cambio de clasificación no se escribió nada: nada que revalidar.
  if (result.data.changed) revalidateCurrencyPaths(result.data.id);
  return { success: true, data: { id: result.data.id } };
}

export async function setBaseCurrency(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await currencyService.setBaseCurrency(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) {
    revalidateCurrencyPaths(result.data.id);
    revalidatePath("/movimientos");
  }
  return result;
}

export async function createDenomination(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await currencyService.createDenomination(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;
  revalidateCurrencyPaths(result.data.currencyId);
  return { success: true, data: { id: result.data.id } };
}

export async function updateDenomination(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await currencyService.updateDenomination(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;
  revalidateCurrencyPaths(result.data.currencyId);
  return { success: true, data: { id: result.data.id } };
}

export async function deleteDenomination(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await currencyService.deleteDenomination(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;
  revalidateCurrencyPaths(result.data.currencyId);
  return { success: true, data: { id: result.data.id } };
}

export async function toggleDenomination(
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await currencyService.toggleDenomination(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;
  revalidateCurrencyPaths(result.data.currencyId);
  return {
    success: true,
    data: { id: result.data.id, active: result.data.active },
  };
}

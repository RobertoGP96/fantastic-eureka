"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/schemas";
import { SESSION_EXPIRED } from "@/lib/services/context";
import * as contactService from "@/lib/services/contact-service";

// La lógica vive en src/lib/services/contact-service.ts (la comparte la API
// móvil); aquí solo sesión por cookie + revalidación de la UI web.

/**
 * El nombre del contacto se pinta en muchas vistas (deudas, mensualidades,
 * detalle de movimiento, campana y próximos vencimientos de Inicio) y los
 * contactos alimentan los formularios en drawer de esas listas.
 */
function revalidateContactPaths(contactId?: string) {
  revalidatePath("/");
  revalidatePath("/contactos");
  if (contactId) revalidatePath(`/contactos/${contactId}`);
  revalidatePath("/deudas");
  revalidatePath("/mensualidades");
  // Detalles: por patrón (la forma con [id] lleva el grupo de rutas).
  revalidatePath("/(app)/contactos/[id]", "page");
  revalidatePath("/(app)/deudas/[id]", "page");
  revalidatePath("/(app)/mensualidades/[id]", "page");
  revalidatePath("/(app)/movimientos/[id]", "page");
}

export async function createContact(
  input: unknown
): Promise<ActionResult<{ id: string; name: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await contactService.createContact(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateContactPaths(result.data.id);
  return result;
}

export async function updateContact(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await contactService.updateContact(
    { db: prisma, userId: user.id },
    input
  );
  if (result.success) revalidateContactPaths(result.data.id);
  return result;
}

// Solo sin deudas (el servicio lo bloquea); el UI confirma antes.
export async function deleteContact(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await contactService.deleteContact(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  revalidateContactPaths(result.data.id);
  return { success: true, data: undefined };
}

/** Fusiona `sourceId` en `targetId`; devuelve el id que sobrevive. */
export async function mergeContacts(
  input: unknown
): Promise<ActionResult<{ id: string; movedDebts: number; movedPlans: number }>> {
  const user = await getSessionUser();
  if (!user) return { success: false, error: SESSION_EXPIRED };

  const result = await contactService.mergeContacts(
    { db: prisma, userId: user.id },
    input
  );
  if (!result.success) return result;

  const { id, sourceId, movedDebts, movedPlans } = result.data;
  revalidateContactPaths(id);
  revalidatePath(`/contactos/${sourceId}`);
  return { success: true, data: { id, movedDebts, movedPlans } };
}

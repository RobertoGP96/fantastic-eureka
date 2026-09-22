// Servicio de categorías. Lógica extraída de
// src/app/actions/category-actions.ts sin cambios de comportamiento: mismas
// validaciones y mismos mensajes.

import { Prisma } from "@prisma/client";
import {
  categorySchema,
  idSchema,
  renameCategorySchema,
  type ActionResult,
} from "@/lib/schemas";
import { recordTombstone } from "@/lib/sync/tombstones";
import {
  clientIdOrUndefined,
  inTx,
  type CreateOptions,
  type ServiceContext,
} from "./context";

export async function createCategory(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateOptions = {}
): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const category = await db.category.create({
      data: {
        id: clientIdOrUndefined(options.id),
        name: parsed.data.name,
        kind: parsed.data.kind,
        userId,
      },
    });
    return { success: true, data: { id: category.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe una categoría con ese nombre" };
    }
    console.error("createCategory:", error);
    return { success: false, error: "No se pudo crear la categoría" };
  }
}

export async function renameCategory(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = renameCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const category = await db.category.findFirst({
      where: { id: parsed.data.id, userId },
    });
    if (!category) return { success: false, error: "Categoría no encontrada" };

    const updated = await db.category.update({
      where: { id: category.id, userId },
      data: { name: parsed.data.name },
    });
    return { success: true, data: { id: updated.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe una categoría con ese nombre" };
    }
    console.error("renameCategory:", error);
    return { success: false, error: "No se pudo renombrar la categoría" };
  }
}

export async function deleteCategory(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const category = await db.category.findFirst({
      where: { id: parsed.data, userId },
      include: { _count: { select: { transactions: true } } },
    });
    if (!category) return { success: false, error: "Categoría no encontrada" };
    // Con movimientos asociados no se borra: se perdería la clasificación
    // del historial. Ocultarla la saca de los formularios sin tocar datos.
    if (category._count.transactions > 0) {
      return {
        success: false,
        error: "Tiene movimientos asociados; ocúltala en su lugar",
      };
    }

    // Borrado y lápida en la misma transacción.
    await inTx(db, async (tx) => {
      await tx.category.delete({ where: { id: category.id, userId } });
      await recordTombstone(tx, userId, "category", category.id);
    });
    return { success: true, data: { id: category.id } };
  } catch (error) {
    console.error("deleteCategory:", error);
    return { success: false, error: "No se pudo eliminar la categoría" };
  }
}

export async function toggleCategory(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const category = await db.category.findFirst({
      where: { id: parsed.data, userId },
    });
    if (!category) return { success: false, error: "Categoría no encontrada" };

    const updated = await db.category.update({
      where: { id: category.id, userId },
      data: { active: !category.active },
    });
    return { success: true, data: { id: updated.id, active: updated.active } };
  } catch (error) {
    console.error("toggleCategory:", error);
    return { success: false, error: "No se pudo actualizar la categoría" };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { categorySchema, idSchema, type ActionResult } from "@/lib/schemas";

export async function createCategory(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const category = await prisma.category.create({
      data: { name: parsed.data.name, kind: parsed.data.kind },
    });
    revalidatePath("/categorias");
    revalidatePath("/registrar");
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

export async function toggleCategory(
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id: parsed.data },
    });
    if (!category) return { success: false, error: "Categoría no encontrada" };

    const updated = await prisma.category.update({
      where: { id: category.id },
      data: { active: !category.active },
    });
    revalidatePath("/categorias");
    revalidatePath("/registrar");
    return { success: true, data: { id: updated.id, active: updated.active } };
  } catch (error) {
    console.error("toggleCategory:", error);
    return { success: false, error: "No se pudo actualizar la categoría" };
  }
}

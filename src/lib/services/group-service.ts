// Servicio de grupos de cuentas. Lógica extraída de
// src/app/actions/group-actions.ts sin cambios de comportamiento: mismas
// validaciones y mismos mensajes.

import { Prisma } from "@prisma/client";
import {
  assignGroupSchema,
  groupSchema,
  idSchema,
  renameGroupSchema,
  type ActionResult,
} from "@/lib/schemas";
import { recordTombstone } from "@/lib/sync/tombstones";
import {
  clientIdOrUndefined,
  inTx,
  type CreateOptions,
  type ServiceContext,
  unexpectedFailure,
} from "./context";

export async function createAccountGroup(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateOptions = {}
): Promise<ActionResult<{ id: string }>> {
  const parsed = groupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const group = await db.accountGroup.create({
      data: {
        id: clientIdOrUndefined(options.id),
        name: parsed.data.name,
        userId,
      },
    });
    return { success: true, data: { id: group.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe un grupo con ese nombre" };
    }
    return unexpectedFailure("createAccountGroup", error, "No se pudo crear el grupo");
  }
}

export async function renameAccountGroup(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = renameGroupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const group = await db.accountGroup.update({
      where: { id: parsed.data.id, userId },
      data: { name: parsed.data.name },
    });
    return { success: true, data: { id: group.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe un grupo con ese nombre" };
    }
    return unexpectedFailure("renameAccountGroup", error, "No se pudo renombrar el grupo");
  }
}

export async function deleteAccountGroup(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    // onDelete: SetNull deja las cuentas del grupo como "Sin grupo".
    // Borrado y lápida en la misma transacción.
    const group = await inTx(db, async (tx) => {
      const deleted = await tx.accountGroup.delete({
        where: { id: parsed.data, userId },
      });
      await recordTombstone(tx, userId, "accountGroup", deleted.id);
      return deleted;
    });
    return { success: true, data: { id: group.id } };
  } catch (error) {
    return unexpectedFailure("deleteAccountGroup", error, "No se pudo eliminar el grupo");
  }
}

export async function assignAccountGroup(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = assignGroupSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    if (parsed.data.groupId) {
      const group = await db.accountGroup.findFirst({
        where: { id: parsed.data.groupId, userId },
      });
      if (!group) return { success: false, error: "Grupo no válido" };
    }

    const account = await db.account.update({
      where: { id: parsed.data.accountId, userId },
      data: { groupId: parsed.data.groupId },
    });
    return { success: true, data: { id: account.id } };
  } catch (error) {
    return unexpectedFailure("assignAccountGroup", error, "No se pudo asignar el grupo");
  }
}

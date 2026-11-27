// Servicio de contactos (las personas de las deudas y mensualidades).
//
// Reglas:
//   · El nombre no se repite al crear ni al renombrar, comparado SIN acentos
//     ni mayúsculas (`normalizeContactName`). Se compara en JS y no con
//     `mode: "insensitive"`: así también iguala acentos y no depende de cómo
//     escape Prisma los comodines. No hay unicidad en BD a propósito: ya
//     existen duplicados antiguos (cada deuda creaba su contacto).
//   · Un contacto con deudas NO se elimina (la FK Debt→Contact es RESTRICT):
//     se eliminan antes sus deudas o se fusiona con otro contacto.
//   · El pull móvil solo entrega filas con `updatedAt` nuevo. El SET NULL de
//     Postgres (planes de un contacto borrado) no lo toca, así que cada fila
//     que cambia de contacto se actualiza A MANO con `updatedAt` explícito.

import { Prisma } from "@prisma/client";
import {
  isContactNameTaken,
  mergeNotes,
  normalizeContactName,
} from "@/lib/contacts-core";
import {
  ActionError,
  contactSchema,
  idSchema,
  mergeContactsSchema,
  updateContactSchema,
  type ActionResult,
} from "@/lib/schemas";
import { recordTombstone } from "@/lib/sync/tombstones";
import {
  clientIdOrUndefined,
  inTx,
  type CreateOptions,
  type Db,
  type ServiceContext,
  unexpectedFailure,
} from "./context";

const NAME_TAKEN = "Ya existe un contacto con ese nombre";
const NOT_FOUND = "Contacto no encontrado";

function hasDebtsMessage(count: number): string {
  const what = count === 1 ? "1 deuda registrada" : `${count} deudas registradas`;
  return `Tiene ${what}; elimínalas o fusiona el contacto con otro`;
}

/** "" y null → null (sin dato). */
function orNull(value: string | null | undefined): string | null {
  return value ? value : null;
}

async function nameTaken(
  db: Db,
  userId: string,
  name: string,
  exceptId?: string
): Promise<boolean> {
  const contacts = await db.contact.findMany({
    where: { userId },
    select: { id: true, name: true },
  });
  return isContactNameTaken(contacts, name, exceptId);
}

/**
 * Bloquea las filas de los contactos hasta el final de la transacción (un
 * UPDATE de Prisma, como `lockDebt`): dos borrados o fusiones simultáneos
 * sobre el mismo contacto se ponen en fila. Ids ordenados para que dos
 * fusiones cruzadas (A→B y B→A) no se bloqueen entre sí. De paso deja un
 * `updatedAt` nuevo en la fila que sobrevive.
 */
async function lockContacts(
  tx: Prisma.TransactionClient,
  userId: string,
  ids: string[]
): Promise<void> {
  for (const id of [...ids].sort()) {
    const locked = await tx.contact.updateMany({
      where: { id, userId },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) throw new ActionError(NOT_FOUND);
  }
}

export async function createContact(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateOptions = {}
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    if (await nameTaken(db, userId, parsed.data.name)) {
      return { success: false, error: NAME_TAKEN };
    }
    const contact = await db.contact.create({
      data: {
        id: clientIdOrUndefined(options.id),
        userId,
        name: parsed.data.name,
        phone: orNull(parsed.data.phone),
        note: orNull(parsed.data.note),
      },
    });
    return { success: true, data: { id: contact.id, name: contact.name } };
  } catch (error) {
    return unexpectedFailure("createContact", error, "No se pudo crear el contacto");
  }
}

export async function updateContact(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateContactSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const data = parsed.data;

  try {
    const contact = await db.contact.findFirst({ where: { id: data.id, userId } });
    if (!contact) return { success: false, error: NOT_FOUND };

    // Solo se valida si el nombre CAMBIA de verdad: un contacto que ya es
    // duplicado antiguo debe poder editar su teléfono sin que se le exija
    // renombrarse.
    const renamed =
      normalizeContactName(data.name) !== normalizeContactName(contact.name);
    if (renamed && (await nameTaken(db, userId, data.name, contact.id))) {
      return { success: false, error: NAME_TAKEN };
    }

    await db.contact.update({
      where: { id: contact.id, userId },
      data: {
        name: data.name,
        // undefined = no tocar; "" o null = borrar el dato.
        ...(data.phone !== undefined ? { phone: orNull(data.phone) } : {}),
        ...(data.note !== undefined ? { note: orNull(data.note) } : {}),
      },
    });
    return { success: true, data: { id: contact.id } };
  } catch (error) {
    return unexpectedFailure(
      "updateContact",
      error,
      "No se pudo guardar el contacto"
    );
  }
}

export async function deleteContact(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };
  const id = parsed.data;

  try {
    const contact = await db.contact.findFirst({ where: { id, userId } });
    if (!contact) return { success: false, error: NOT_FOUND };

    await inTx(db, async (tx) => {
      await lockContacts(tx, userId, [id]);

      const debts = await tx.debt.count({ where: { contactId: id, userId } });
      if (debts > 0) throw new ActionError(hasDebtsMessage(debts));

      // Sus mensualidades sueltas quedan «Sin contacto». Se desvinculan a
      // mano (y no por el SET NULL de la FK) para que cambie su updatedAt.
      await tx.paymentPlan.updateMany({
        where: { contactId: id, userId },
        data: { contactId: null, updatedAt: new Date() },
      });
      await tx.contact.delete({ where: { id, userId } });
      await recordTombstone(tx, userId, "contact", id);
    });
    return { success: true, data: { id } };
  } catch (error) {
    if (error instanceof ActionError) {
      return { success: false, error: error.message };
    }
    // Una deuda creada en carrera (el bloqueo no frena inserciones con FK)
    // hace fallar el DELETE por la restricción: mismo aviso que arriba.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return {
        success: false,
        error: "Tiene deudas registradas; elimínalas o fusiona el contacto con otro",
      };
    }
    return unexpectedFailure(
      "deleteContact",
      error,
      "No se pudo eliminar el contacto"
    );
  }
}

/**
 * Fusiona `sourceId` EN `targetId`: sus deudas y mensualidades pasan al
 * destino, el destino hereda el teléfono/nota que le falten y el origen se
 * elimina. Pensado para limpiar duplicados.
 */
export async function mergeContacts(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<
  ActionResult<{
    id: string;
    sourceId: string;
    movedDebts: number;
    movedPlans: number;
  }>
> {
  const parsed = mergeContactsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const { sourceId, targetId } = parsed.data;

  try {
    const moved = await inTx(db, async (tx) => {
      await lockContacts(tx, userId, [sourceId, targetId]);

      // Releídos con el bloqueo ya tomado.
      const [source, target] = await Promise.all([
        tx.contact.findFirst({ where: { id: sourceId, userId } }),
        tx.contact.findFirst({ where: { id: targetId, userId } }),
      ]);
      if (!source || !target) throw new ActionError(NOT_FOUND);

      const now = new Date();
      const debts = await tx.debt.updateMany({
        where: { contactId: sourceId, userId },
        data: { contactId: targetId, updatedAt: now },
      });
      const plans = await tx.paymentPlan.updateMany({
        where: { contactId: sourceId, userId },
        data: { contactId: targetId, updatedAt: now },
      });
      await tx.contact.update({
        where: { id: targetId, userId },
        data: {
          phone: target.phone ?? source.phone,
          note: mergeNotes(target.note, source.note),
        },
      });
      await tx.contact.delete({ where: { id: sourceId, userId } });
      await recordTombstone(tx, userId, "contact", sourceId);

      return { movedDebts: debts.count, movedPlans: plans.count };
    });
    return { success: true, data: { id: targetId, sourceId, ...moved } };
  } catch (error) {
    if (error instanceof ActionError) {
      return { success: false, error: error.message };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      // Otra operación le añadió una deuda al origen mientras se fusionaba.
      return {
        success: false,
        error: "El contacto cambió mientras se fusionaba; inténtalo de nuevo",
      };
    }
    return unexpectedFailure(
      "mergeContacts",
      error,
      "No se pudieron fusionar los contactos"
    );
  }
}

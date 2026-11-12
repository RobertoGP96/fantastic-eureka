// Servicio de monedas y denominaciones. Lógica extraída de
// src/app/actions/currency-actions.ts sin cambios de comportamiento: mismas
// validaciones y mismos mensajes.
//
// Las funciones de denominaciones devuelven además `currencyId` (la action
// lo usa para revalidar /monedas/[id] y lo quita de la respuesta pública).

import { Prisma } from "@prisma/client";
import { parseAmountToMinor, PRISMA_INT_MAX } from "@/lib/money";
import { basicDenominations } from "@/lib/user-defaults";
import {
  currencySchema,
  denominationSchema,
  idSchema,
  setCurrencyKindSchema,
  updateDenominationSchema,
  type ActionResult,
} from "@/lib/schemas";
import { CASH_LIKE_TYPES, isDigitalCurrencyKind } from "@/lib/domain";
import { recordTombstone } from "@/lib/sync/tombstones";
import {
  clientIdOrUndefined,
  inTx,
  type CreateOptions,
  type ServiceContext,
  unexpectedFailure,
} from "./context";

/**
 * Crea la moneda. El id de cliente (`options.id`) se aplica SOLO a la fila
 * de la moneda: las denominaciones básicas sembradas conservan ids del
 * servidor y el móvil las recibe por el pull.
 */
export async function createCurrency(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateOptions = {}
): Promise<ActionResult<{ id: string }>> {
  const parsed = currencySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    // Las monedas de efectivo nacen con denominaciones básicas (serie 1-2-5)
    // para que el arqueo funcione desde el primer momento; se ajustan en
    // /monedas/[id]. Las digitales no llevan denominaciones.
    const currency = await inTx(db, async (tx) => {
      const created = await tx.currency.create({
        data: {
          id: clientIdOrUndefined(options.id),
          code: parsed.data.code,
          name: parsed.data.name,
          symbol: parsed.data.symbol,
          decimalPlaces: parsed.data.decimalPlaces,
          kind: parsed.data.kind,
          userId,
        },
      });
      if (parsed.data.kind !== "DIGITAL") {
        await tx.denomination.createMany({
          data: basicDenominations(created.decimalPlaces).map(
            (denomination) => ({ ...denomination, currencyId: created.id })
          ),
        });
      }
      return created;
    });
    return { success: true, data: { id: currency.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe una moneda con ese código" };
    }
    return unexpectedFailure("createCurrency", error, "No se pudo crear la moneda");
  }
}

export async function toggleCurrency(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const currency = await db.currency.findFirst({
      where: { id: parsed.data, userId },
    });
    if (!currency) return { success: false, error: "Moneda no encontrada" };
    if (currency.isBase && currency.active) {
      return {
        success: false,
        error: "La moneda base no se puede desactivar; primero cambia la base",
      };
    }

    const updated = await db.currency.update({
      where: { id: currency.id, userId },
      data: { active: !currency.active },
    });
    return { success: true, data: { id: updated.id, active: updated.active } };
  } catch (error) {
    return unexpectedFailure("toggleCurrency", error, "No se pudo actualizar la moneda");
  }
}

/**
 * Cambia la clasificación de la moneda. Pasar a DIGITAL exige que la moneda
 * no tenga denominaciones (elimínalas u ocúltalas antes no basta: hay que
 * borrarlas, y las usadas no se pueden borrar) ni cuentas de efectivo/caja.
 * `changed` = false cuando ya tenía esa clasificación (no se escribió nada).
 */
export async function setCurrencyKind(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string; changed: boolean }>> {
  const parsed = setCurrencyKindSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const currency = await db.currency.findFirst({
      where: { id: parsed.data.id, userId },
      include: {
        _count: {
          select: {
            denominations: true,
            accounts: { where: { type: { in: [...CASH_LIKE_TYPES] } } },
          },
        },
      },
    });
    if (!currency) return { success: false, error: "Moneda no encontrada" };
    if (currency.kind === parsed.data.kind) {
      return { success: true, data: { id: currency.id, changed: false } };
    }

    if (parsed.data.kind === "DIGITAL") {
      if (currency._count.denominations > 0) {
        return {
          success: false,
          error:
            "La moneda tiene denominaciones: elimínalas antes de marcarla como digital",
        };
      }
      if (currency._count.accounts > 0) {
        return {
          success: false,
          error:
            "Hay cuentas de efectivo o caja en esta moneda: no puede ser digital",
        };
      }
    }

    const updated = await db.currency.update({
      where: { id: currency.id, userId },
      data: { kind: parsed.data.kind },
    });
    return { success: true, data: { id: updated.id, changed: true } };
  } catch (error) {
    return unexpectedFailure("setCurrencyKind", error, "No se pudo cambiar la clasificación");
  }
}

export async function setBaseCurrency(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const currency = await db.currency.findFirst({
      where: { id: parsed.data, userId },
    });
    if (!currency) return { success: false, error: "Moneda no encontrada" };
    if (currency.isBase) {
      return { success: false, error: "Esa moneda ya es la base" };
    }

    await inTx(db, async (tx) => {
      await tx.currency.updateMany({
        where: { userId },
        data: { isBase: false },
      });
      await tx.currency.update({
        where: { id: currency.id, userId },
        data: { isBase: true, active: true },
      });
    });

    return { success: true, data: { id: currency.id } };
  } catch (error) {
    return unexpectedFailure("setBaseCurrency", error, "No se pudo cambiar la moneda base");
  }
}

export async function createDenomination(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateOptions = {}
): Promise<ActionResult<{ id: string; currencyId: string }>> {
  const parsed = denominationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const currency = await db.currency.findFirst({
      where: { id: parsed.data.currencyId, userId },
    });
    if (!currency) return { success: false, error: "Moneda no válida" };
    // La regla vivía solo en la UI: la API móvil podía crear billetes de una
    // moneda digital, que la web ni muestra ni deja borrar.
    if (isDigitalCurrencyKind(currency.kind)) {
      return {
        success: false,
        error: `${currency.code} es digital: no lleva denominaciones`,
      };
    }

    const valueMinor = parseAmountToMinor(parsed.data.value, currency);
    if (valueMinor <= 0) {
      return { success: false, error: "El valor debe ser mayor que cero" };
    }
    if (valueMinor > PRISMA_INT_MAX) {
      return { success: false, error: "Valor demasiado grande" };
    }

    const denomination = await db.denomination.create({
      data: {
        id: clientIdOrUndefined(options.id),
        currencyId: currency.id,
        valueMinor,
        kind: parsed.data.kind,
      },
    });
    return {
      success: true,
      data: { id: denomination.id, currencyId: currency.id },
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe esa denominación" };
    }
    return unexpectedFailure("createDenomination", error, "No se pudo crear la denominación");
  }
}

export async function updateDenomination(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string; currencyId: string }>> {
  const parsed = updateDenominationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const denomination = await db.denomination.findFirst({
      where: { id: parsed.data.id, currency: { userId } },
      include: {
        currency: true,
        _count: { select: { countLines: true, txLines: true } },
      },
    });
    if (!denomination) {
      return { success: false, error: "Denominación no encontrada" };
    }
    // Cambiar el valor de una denominación ya usada alteraría los arqueos
    // o desgloses guardados (sus líneas referencian esta denominación).
    if (denomination._count.countLines + denomination._count.txLines > 0) {
      return {
        success: false,
        error: "Ya se usó en arqueos o movimientos; ocúltala y crea una nueva",
      };
    }

    const valueMinor = parseAmountToMinor(
      parsed.data.value,
      denomination.currency
    );
    if (valueMinor <= 0) {
      return { success: false, error: "El valor debe ser mayor que cero" };
    }
    if (valueMinor > PRISMA_INT_MAX) {
      return { success: false, error: "Valor demasiado grande" };
    }

    const updated = await db.denomination.update({
      where: { id: denomination.id },
      data: { valueMinor, kind: parsed.data.kind },
    });
    return {
      success: true,
      data: { id: updated.id, currencyId: denomination.currencyId },
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe esa denominación" };
    }
    return unexpectedFailure("updateDenomination", error, "No se pudo editar la denominación");
  }
}

export async function deleteDenomination(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string; currencyId: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const denomination = await db.denomination.findFirst({
      where: { id: parsed.data, currency: { userId } },
      include: { _count: { select: { countLines: true, txLines: true } } },
    });
    if (!denomination) {
      return { success: false, error: "Denominación no encontrada" };
    }
    // Las FK de CashCountLine/TransactionDenomination son Restrict: borrar
    // una usada rompería lo guardado. Mejor mensaje amigable que error de BD.
    if (denomination._count.countLines + denomination._count.txLines > 0) {
      return {
        success: false,
        error: "Se usó en arqueos o movimientos guardados; ocúltala en su lugar",
      };
    }

    // Borrado y lápida en la misma transacción.
    await inTx(db, async (tx) => {
      await tx.denomination.delete({ where: { id: denomination.id } });
      await recordTombstone(tx, userId, "denomination", denomination.id);
    });
    return {
      success: true,
      data: { id: denomination.id, currencyId: denomination.currencyId },
    };
  } catch (error) {
    return unexpectedFailure("deleteDenomination", error, "No se pudo eliminar la denominación");
  }
}

export async function toggleDenomination(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean; currencyId: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const denomination = await db.denomination.findFirst({
      where: { id: parsed.data, currency: { userId } },
    });
    if (!denomination) {
      return { success: false, error: "Denominación no encontrada" };
    }

    // Update por id: ya validado arriba que la denominación pertenece al
    // usuario (vía su moneda), no hace falta repetir la condición.
    const updated = await db.denomination.update({
      where: { id: denomination.id },
      data: { active: !denomination.active },
    });
    return {
      success: true,
      data: {
        id: updated.id,
        active: updated.active,
        currencyId: denomination.currencyId,
      },
    };
  } catch (error) {
    return unexpectedFailure("toggleDenomination", error, "No se pudo actualizar la denominación");
  }
}

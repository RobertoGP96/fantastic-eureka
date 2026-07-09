"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";
import { getSessionUser } from "@/lib/auth";
import { basicDenominations } from "@/lib/user-defaults";
import {
  currencySchema,
  denominationSchema,
  idSchema,
  updateDenominationSchema,
  type ActionResult,
} from "@/lib/schemas";

// Las monedas y denominaciones alimentan selects y arqueos en toda la app.
function revalidateCurrencyPaths(currencyId?: string) {
  revalidatePath("/");
  revalidatePath("/monedas");
  if (currencyId) revalidatePath(`/monedas/${currencyId}`);
  revalidatePath("/tasas");
  revalidatePath("/cuentas/nueva");
  revalidatePath("/deudas/nueva");
  revalidatePath("/deudas/plan/nuevo");
}

export async function createCurrency(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = currencySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    // La moneda nace con denominaciones básicas (serie 1-2-5) para que el
    // arqueo funcione desde el primer momento; se ajustan en /monedas/[id].
    const currency = await prisma.$transaction(async (tx) => {
      const created = await tx.currency.create({
        data: {
          code: parsed.data.code,
          name: parsed.data.name,
          symbol: parsed.data.symbol,
          decimalPlaces: parsed.data.decimalPlaces,
          userId: user.id,
        },
      });
      await tx.denomination.createMany({
        data: basicDenominations(created.decimalPlaces).map(
          (denomination) => ({ ...denomination, currencyId: created.id })
        ),
      });
      return created;
    });
    revalidateCurrencyPaths(currency.id);
    return { success: true, data: { id: currency.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe una moneda con ese código" };
    }
    console.error("createCurrency:", error);
    return { success: false, error: "No se pudo crear la moneda" };
  }
}

export async function toggleCurrency(
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const currency = await prisma.currency.findFirst({
      where: { id: parsed.data, userId: user.id },
    });
    if (!currency) return { success: false, error: "Moneda no encontrada" };
    if (currency.isBase && currency.active) {
      return {
        success: false,
        error: "La moneda base no se puede desactivar; primero cambia la base",
      };
    }

    const updated = await prisma.currency.update({
      where: { id: currency.id, userId: user.id },
      data: { active: !currency.active },
    });
    revalidateCurrencyPaths(updated.id);
    return { success: true, data: { id: updated.id, active: updated.active } };
  } catch (error) {
    console.error("toggleCurrency:", error);
    return { success: false, error: "No se pudo actualizar la moneda" };
  }
}

export async function setBaseCurrency(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const currency = await prisma.currency.findFirst({
      where: { id: parsed.data, userId: user.id },
    });
    if (!currency) return { success: false, error: "Moneda no encontrada" };
    if (currency.isBase) {
      return { success: false, error: "Esa moneda ya es la base" };
    }

    await prisma.$transaction([
      prisma.currency.updateMany({
        where: { userId: user.id },
        data: { isBase: false },
      }),
      prisma.currency.update({
        where: { id: currency.id, userId: user.id },
        data: { isBase: true, active: true },
      }),
    ]);

    revalidateCurrencyPaths(currency.id);
    revalidatePath("/movimientos");
    return { success: true, data: { id: currency.id } };
  } catch (error) {
    console.error("setBaseCurrency:", error);
    return { success: false, error: "No se pudo cambiar la moneda base" };
  }
}

export async function createDenomination(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = denominationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const currency = await prisma.currency.findFirst({
      where: { id: parsed.data.currencyId, userId: user.id },
    });
    if (!currency) return { success: false, error: "Moneda no válida" };

    const valueMinor = parseAmountToMinor(parsed.data.value, currency);
    if (valueMinor <= 0) {
      return { success: false, error: "El valor debe ser mayor que cero" };
    }

    const denomination = await prisma.denomination.create({
      data: {
        currencyId: currency.id,
        valueMinor,
        kind: parsed.data.kind,
      },
    });
    revalidateCurrencyPaths(currency.id);
    return { success: true, data: { id: denomination.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe esa denominación" };
    }
    console.error("createDenomination:", error);
    return { success: false, error: "No se pudo crear la denominación" };
  }
}

export async function updateDenomination(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = updateDenominationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const denomination = await prisma.denomination.findFirst({
      where: { id: parsed.data.id, currency: { userId: user.id } },
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

    const updated = await prisma.denomination.update({
      where: { id: denomination.id },
      data: { valueMinor, kind: parsed.data.kind },
    });
    revalidateCurrencyPaths(denomination.currencyId);
    return { success: true, data: { id: updated.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe esa denominación" };
    }
    console.error("updateDenomination:", error);
    return { success: false, error: "No se pudo editar la denominación" };
  }
}

export async function deleteDenomination(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const denomination = await prisma.denomination.findFirst({
      where: { id: parsed.data, currency: { userId: user.id } },
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

    await prisma.denomination.delete({ where: { id: denomination.id } });
    revalidateCurrencyPaths(denomination.currencyId);
    return { success: true, data: { id: denomination.id } };
  } catch (error) {
    console.error("deleteDenomination:", error);
    return { success: false, error: "No se pudo eliminar la denominación" };
  }
}

export async function toggleDenomination(
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const denomination = await prisma.denomination.findFirst({
      where: { id: parsed.data, currency: { userId: user.id } },
    });
    if (!denomination) {
      return { success: false, error: "Denominación no encontrada" };
    }

    // Update por id: ya validado arriba que la denominación pertenece al
    // usuario (vía su moneda), no hace falta repetir la condición.
    const updated = await prisma.denomination.update({
      where: { id: denomination.id },
      data: { active: !denomination.active },
    });
    revalidateCurrencyPaths(denomination.currencyId);
    return { success: true, data: { id: updated.id, active: updated.active } };
  } catch (error) {
    console.error("toggleDenomination:", error);
    return { success: false, error: "No se pudo actualizar la denominación" };
  }
}

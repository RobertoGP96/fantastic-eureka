"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";
import {
  currencySchema,
  denominationSchema,
  idSchema,
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
  const parsed = currencySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const currency = await prisma.currency.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        symbol: parsed.data.symbol,
        decimalPlaces: parsed.data.decimalPlaces,
      },
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
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const currency = await prisma.currency.findUnique({
      where: { id: parsed.data },
    });
    if (!currency) return { success: false, error: "Moneda no encontrada" };
    if (currency.isBase && currency.active) {
      return {
        success: false,
        error: "La moneda base no se puede desactivar; primero cambia la base",
      };
    }

    const updated = await prisma.currency.update({
      where: { id: currency.id },
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
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const currency = await prisma.currency.findUnique({
      where: { id: parsed.data },
    });
    if (!currency) return { success: false, error: "Moneda no encontrada" };
    if (currency.isBase) {
      return { success: false, error: "Esa moneda ya es la base" };
    }

    await prisma.$transaction([
      prisma.currency.updateMany({ data: { isBase: false } }),
      prisma.currency.update({
        where: { id: currency.id },
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
  const parsed = denominationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const currency = await prisma.currency.findUnique({
      where: { id: parsed.data.currencyId },
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

export async function toggleDenomination(
  input: unknown
): Promise<ActionResult<{ id: string; active: boolean }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  try {
    const denomination = await prisma.denomination.findUnique({
      where: { id: parsed.data },
    });
    if (!denomination) {
      return { success: false, error: "Denominación no encontrada" };
    }

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

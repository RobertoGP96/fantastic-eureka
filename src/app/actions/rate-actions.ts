"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmountToMinor, PRISMA_INT_MAX } from "@/lib/money";
import { exchangeRateSchema, type ActionResult } from "@/lib/schemas";

// La tasa se captura como texto decimal y se guarda escalada ×10 000
// (4 decimales de precisión), siempre contra la moneda base.
export async function createExchangeRate(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = exchangeRateSchema.safeParse(input);
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
    if (!currency || !currency.active) {
      return { success: false, error: "Moneda no válida" };
    }
    if (currency.isBase) {
      return {
        success: false,
        error: "La moneda base no necesita tasa (siempre vale 1)",
      };
    }

    const rateScaled = parseAmountToMinor(parsed.data.rate, {
      decimalPlaces: 4,
    });
    if (rateScaled <= 0) {
      return { success: false, error: "La tasa debe ser mayor que cero" };
    }
    if (rateScaled > PRISMA_INT_MAX) {
      return { success: false, error: "La tasa es demasiado grande" };
    }

    const rate = await prisma.exchangeRate.create({
      data: {
        currencyId: currency.id,
        rateScaled,
        effectiveAt: parsed.data.effectiveAt ?? new Date(),
      },
    });

    revalidatePath("/");
    revalidatePath("/tasas");
    return { success: true, data: { id: rate.id } };
  } catch (error) {
    console.error("createExchangeRate:", error);
    return { success: false, error: "No se pudo guardar la tasa" };
  }
}

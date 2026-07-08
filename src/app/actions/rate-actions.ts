"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmountToMinor, PRISMA_INT_MAX } from "@/lib/money";
import { getSessionUser } from "@/lib/auth";
import { exchangeRateSchema, type ActionResult } from "@/lib/schemas";

// La tasa relaciona un PAR de monedas: unidades de destino por 1 de origen,
// escalada ×10 000 (4 decimales de precisión).
export async function createExchangeRate(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = exchangeRateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  if (parsed.data.fromCurrencyId === parsed.data.toCurrencyId) {
    return { success: false, error: "Elige dos monedas distintas" };
  }

  try {
    const [from, to] = await Promise.all([
      prisma.currency.findFirst({
        where: { id: parsed.data.fromCurrencyId, userId: user.id },
      }),
      prisma.currency.findFirst({
        where: { id: parsed.data.toCurrencyId, userId: user.id },
      }),
    ]);
    if (!from || !from.active || !to || !to.active) {
      return { success: false, error: "Moneda no válida" };
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
        fromCurrencyId: from.id,
        toCurrencyId: to.id,
        rateScaled,
        effectiveAt: parsed.data.effectiveAt ?? new Date(),
        userId: user.id,
      },
    });

    revalidatePath("/");
    revalidatePath("/tasas");
    revalidatePath("/cuentas");
    revalidatePath("/movimientos");
    return { success: true, data: { id: rate.id } };
  } catch (error) {
    console.error("createExchangeRate:", error);
    return { success: false, error: "No se pudo guardar la tasa" };
  }
}

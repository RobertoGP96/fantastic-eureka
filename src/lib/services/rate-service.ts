// Servicio de tasas de cambio. Lógica extraída de createExchangeRate
// (src/app/actions/rate-actions.ts) sin cambios de comportamiento: mismas
// validaciones y mismos mensajes.

import { parseAmountToMinor, PRISMA_INT_MAX } from "@/lib/money";
import { exchangeRateSchema, type ActionResult } from "@/lib/schemas";
import {
  clientIdOrUndefined,
  type CreateOptions,
  type ServiceContext,
} from "./context";

// La tasa relaciona un PAR de monedas: unidades de destino por 1 de origen,
// escalada ×10 000 (4 decimales de precisión).
export async function createExchangeRate(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateOptions = {}
): Promise<ActionResult<{ id: string }>> {
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
      db.currency.findFirst({
        where: { id: parsed.data.fromCurrencyId, userId },
      }),
      db.currency.findFirst({
        where: { id: parsed.data.toCurrencyId, userId },
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

    const rate = await db.exchangeRate.create({
      data: {
        id: clientIdOrUndefined(options.id),
        fromCurrencyId: from.id,
        toCurrencyId: to.id,
        rateScaled,
        effectiveAt: parsed.data.effectiveAt ?? new Date(),
        userId,
      },
    });
    return { success: true, data: { id: rate.id } };
  } catch (error) {
    console.error("createExchangeRate:", error);
    return { success: false, error: "No se pudo guardar la tasa" };
  }
}

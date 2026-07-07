"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  parseAmountToMinor,
  pow10,
  PRISMA_INT_MAX,
  RATE_SCALE,
} from "@/lib/money";
import {
  incomeExpenseSchema,
  transferSchema,
  type ActionResult,
} from "@/lib/schemas";

function revalidateMovementPaths(accountIds: string[]) {
  revalidatePath("/");
  revalidatePath("/cuentas");
  revalidatePath("/movimientos");
  for (const id of accountIds) revalidatePath(`/cuentas/${id}`);
}

export async function registerIncomeExpense(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = incomeExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const account = await prisma.account.findUnique({
      where: { id: parsed.data.accountId },
      include: { currency: true },
    });
    if (!account || account.archived) {
      return { success: false, error: "Cuenta no válida" };
    }

    const amountMinor = parseAmountToMinor(
      parsed.data.amount,
      account.currency
    );
    if (amountMinor <= 0) {
      return { success: false, error: "El monto debe ser mayor que cero" };
    }

    if (parsed.data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: parsed.data.categoryId },
      });
      if (!category || category.kind !== parsed.data.kind) {
        return { success: false, error: "Categoría no válida" };
      }
    }

    const transaction = await prisma.transaction.create({
      data: {
        kind: parsed.data.kind,
        accountId: account.id,
        amountMinor,
        currencyId: account.currencyId,
        categoryId: parsed.data.categoryId,
        note: parsed.data.note || undefined,
        occurredAt: parsed.data.occurredAt ?? new Date(),
      },
    });

    revalidateMovementPaths([account.id]);
    return { success: true, data: { id: transaction.id } };
  } catch (error) {
    console.error("registerIncomeExpense:", error);
    return { success: false, error: "No se pudo registrar el movimiento" };
  }
}

export async function registerTransfer(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  if (parsed.data.accountId === parsed.data.counterAccountId) {
    return { success: false, error: "Elige dos cuentas distintas" };
  }

  try {
    const [from, to] = await Promise.all([
      prisma.account.findUnique({
        where: { id: parsed.data.accountId },
        include: { currency: true },
      }),
      prisma.account.findUnique({
        where: { id: parsed.data.counterAccountId },
        include: { currency: true },
      }),
    ]);
    if (!from || from.archived || !to || to.archived) {
      return { success: false, error: "Cuenta no válida" };
    }

    const amountMinor = parseAmountToMinor(parsed.data.amount, from.currency);
    if (amountMinor <= 0) {
      return { success: false, error: "El monto debe ser mayor que cero" };
    }

    const sameCurrency = from.currencyId === to.currencyId;
    let counterAmountMinor = amountMinor;
    let rateScaled: number | null = null;

    if (!sameCurrency) {
      if (!parsed.data.counterAmount) {
        return {
          success: false,
          error: `Indica el monto recibido en ${to.currency.code}`,
        };
      }
      counterAmountMinor = parseAmountToMinor(
        parsed.data.counterAmount,
        to.currency
      );
      if (counterAmountMinor <= 0) {
        return { success: false, error: "El monto recibido debe ser mayor que cero" };
      }
      // Tasa implícita (destino por 1 origen, ×RATE_SCALE), solo informativa.
      // BigInt para no perder precisión con montos grandes; si no cabe en un
      // Int de Prisma se guarda null.
      const numerator =
        BigInt(counterAmountMinor) *
        BigInt(RATE_SCALE) *
        BigInt(pow10(from.currency.decimalPlaces));
      const denominator =
        BigInt(amountMinor) * BigInt(pow10(to.currency.decimalPlaces));
      const implied = Number((numerator + denominator / 2n) / denominator);
      rateScaled = implied >= 1 && implied <= PRISMA_INT_MAX ? implied : null;
    }

    const transaction = await prisma.transaction.create({
      data: {
        kind: "TRANSFER",
        accountId: from.id,
        counterAccountId: to.id,
        amountMinor,
        currencyId: from.currencyId,
        counterAmountMinor,
        rateScaled,
        note: parsed.data.note || undefined,
        occurredAt: parsed.data.occurredAt ?? new Date(),
      },
    });

    revalidateMovementPaths([from.id, to.id]);
    return { success: true, data: { id: transaction.id } };
  } catch (error) {
    console.error("registerTransfer:", error);
    return { success: false, error: "No se pudo registrar la transferencia" };
  }
}

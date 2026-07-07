"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";
import {
  createAccountSchema,
  updateAccountSchema,
  type ActionResult,
} from "@/lib/schemas";

export async function createAccount(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = createAccountSchema.safeParse(input);
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

    const initialMinor = parsed.data.initialAmount
      ? parseAmountToMinor(parsed.data.initialAmount, currency)
      : 0;

    // Cuenta y saldo inicial en una sola transacción: sin cuentas a medias.
    const account = await prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          name: parsed.data.name,
          type: parsed.data.type,
          currencyId: currency.id,
        },
      });
      if (initialMinor !== 0) {
        await tx.transaction.create({
          data: {
            kind: "ADJUSTMENT",
            accountId: created.id,
            amountMinor: initialMinor,
            currencyId: currency.id,
            note: "Saldo inicial",
          },
        });
      }
      return created;
    });

    revalidatePath("/");
    revalidatePath("/cuentas");
    return { success: true, data: { id: account.id } };
  } catch (error) {
    console.error("createAccount:", error);
    return { success: false, error: "No se pudo crear la cuenta" };
  }
}

export async function updateAccount(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const account = await prisma.account.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        ...(parsed.data.archived === undefined
          ? {}
          : { archived: parsed.data.archived }),
      },
    });

    revalidatePath("/");
    revalidatePath("/cuentas");
    revalidatePath(`/cuentas/${account.id}`);
    return { success: true, data: { id: account.id } };
  } catch (error) {
    console.error("updateAccount:", error);
    return { success: false, error: "No se pudo actualizar la cuenta" };
  }
}

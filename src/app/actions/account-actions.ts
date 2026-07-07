"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";
import { ACCOUNT_ICON_NAMES } from "@/lib/account-icons";
import {
  accountIconSchema,
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

    if (parsed.data.groupId) {
      const group = await prisma.accountGroup.findUnique({
        where: { id: parsed.data.groupId },
      });
      if (!group) return { success: false, error: "Grupo no válido" };
    }

    if (parsed.data.icon && !ACCOUNT_ICON_NAMES.includes(parsed.data.icon)) {
      return { success: false, error: "Icono no válido" };
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
          groupId: parsed.data.groupId,
          icon: parsed.data.icon,
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

export async function setAccountIcon(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = accountIconSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }
  if (parsed.data.icon && !ACCOUNT_ICON_NAMES.includes(parsed.data.icon)) {
    return { success: false, error: "Icono no válido" };
  }

  try {
    const account = await prisma.account.update({
      where: { id: parsed.data.accountId },
      data: { icon: parsed.data.icon },
    });
    revalidatePath("/");
    revalidatePath("/cuentas");
    revalidatePath(`/cuentas/${account.id}`);
    revalidatePath("/conteo");
    return { success: true, data: { id: account.id } };
  } catch (error) {
    console.error("setAccountIcon:", error);
    return { success: false, error: "No se pudo actualizar el icono" };
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

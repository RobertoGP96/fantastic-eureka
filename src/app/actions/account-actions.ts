"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";
import { ACCOUNT_ICON_NAMES } from "@/lib/account-icons";
import { getSessionUser } from "@/lib/auth";
import {
  accountIconSchema,
  createAccountSchema,
  idSchema,
  updateAccountSchema,
  type ActionResult,
} from "@/lib/schemas";

export async function createAccount(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = createAccountSchema.safeParse(input);
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
    if (!currency || !currency.active) {
      return { success: false, error: "Moneda no válida" };
    }

    if (parsed.data.groupId) {
      const group = await prisma.accountGroup.findFirst({
        where: { id: parsed.data.groupId, userId: user.id },
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
          userId: user.id,
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
            userId: user.id,
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
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = accountIconSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }
  if (parsed.data.icon && !ACCOUNT_ICON_NAMES.includes(parsed.data.icon)) {
    return { success: false, error: "Icono no válido" };
  }

  try {
    const account = await prisma.account.update({
      where: { id: parsed.data.accountId, userId: user.id },
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
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const account = await prisma.account.update({
      where: { id: parsed.data.id, userId: user.id },
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

// Eliminar solo cuentas sin uso: con movimientos o arqueos se perdería el
// historial (y los saldos derivados), así que ahí la opción es archivar.
export async function deleteAccount(
  input: unknown
): Promise<ActionResult<undefined>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const account = await prisma.account.findFirst({
      where: { id: parsed.data, userId: user.id },
    });
    if (!account) return { success: false, error: "Cuenta no encontrada" };

    const [txCount, countCount] = await Promise.all([
      prisma.transaction.count({
        where: {
          OR: [{ accountId: account.id }, { counterAccountId: account.id }],
        },
      }),
      prisma.cashCount.count({ where: { accountId: account.id } }),
    ]);
    if (txCount > 0 || countCount > 0) {
      return {
        success: false,
        error: "La cuenta tiene movimientos o arqueos; archívala en su lugar",
      };
    }

    // Debt.accountId y PaymentPlan.accountId quedan en null (onDelete: SetNull).
    await prisma.account.delete({ where: { id: account.id } });

    revalidatePath("/");
    revalidatePath("/cuentas");
    revalidatePath("/conteo");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteAccount:", error);
    return { success: false, error: "No se pudo eliminar la cuenta" };
  }
}

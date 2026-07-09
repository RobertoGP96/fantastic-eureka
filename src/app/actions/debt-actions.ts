"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";
import { fmtMinor } from "@/lib/format";
import { debtRemainingMinor } from "@/lib/debts";
import { getSessionUser } from "@/lib/auth";
import {
  ActionError,
  createDebtSchema,
  debtPaymentSchema,
  idSchema,
  setDebtAccountSchema,
  type ActionResult,
} from "@/lib/schemas";

function revalidateDebtPaths(debtId: string, accountId?: string) {
  revalidatePath("/");
  revalidatePath("/deudas");
  revalidatePath(`/deudas/${debtId}`);
  if (accountId) {
    revalidatePath("/cuentas");
    revalidatePath(`/cuentas/${accountId}`);
    revalidatePath("/movimientos");
  }
}

export async function createDebt(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = createDebtSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }
  const data = parsed.data;

  const planFields = [data.frequency, data.installmentAmount, data.firstDueAt];
  const withPlan = planFields.every((field) => field !== undefined);
  if (!withPlan && planFields.some((field) => field !== undefined)) {
    return {
      success: false,
      error: "Para el plan de cuotas indica frecuencia, cuota y primera fecha",
    };
  }

  try {
    const currency = await prisma.currency.findFirst({
      where: { id: data.currencyId, userId: user.id },
    });
    if (!currency || !currency.active) {
      return { success: false, error: "Moneda no válida" };
    }

    // Solo validaciones antes de escribir: el contacto nuevo se crea dentro
    // de la transacción para no dejar contactos huérfanos si algo falla.
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, userId: user.id },
      });
      if (!contact) return { success: false, error: "Contacto no válido" };
    } else if (!data.contactName) {
      return { success: false, error: "Indica el contacto" };
    }

    let accountId: string | null = null;
    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: data.accountId, userId: user.id },
      });
      if (!account || account.archived) {
        return { success: false, error: "Cuenta no válida" };
      }
      if (account.currencyId !== currency.id) {
        return {
          success: false,
          error: `La cuenta debe estar en ${currency.code} (la moneda de la deuda)`,
        };
      }
      accountId = account.id;
    }

    const totalMinor = parseAmountToMinor(data.total, currency);
    if (totalMinor <= 0) {
      return { success: false, error: "El total debe ser mayor que cero" };
    }

    let installmentMinor = 0;
    if (withPlan) {
      installmentMinor = parseAmountToMinor(data.installmentAmount!, currency);
      if (installmentMinor <= 0 || installmentMinor > totalMinor) {
        return {
          success: false,
          error: "La cuota debe ser mayor que cero y no superar el total",
        };
      }
    }

    const debt = await prisma.$transaction(async (tx) => {
      const contactId =
        data.contactId ??
        (
          await tx.contact.create({
            data: { name: data.contactName!, userId: user.id },
          })
        ).id;
      const created = await tx.debt.create({
        data: {
          contactId,
          direction: data.direction,
          description: data.description,
          totalMinor,
          currencyId: currency.id,
          accountId,
          userId: user.id,
        },
      });

      if (withPlan) {
        await tx.paymentPlan.create({
          data: {
            debtId: created.id,
            contactId,
            userId: user.id,
            kind: data.direction === "RECEIVABLE" ? "COLLECT" : "PAY",
            description: data.description,
            currencyId: currency.id,
            accountId,
            amountMinor: installmentMinor,
            frequency: data.frequency!,
            dayOfMonth:
              data.frequency === "MONTHLY" ? data.firstDueAt!.getDate() : null,
            nextDueAt: data.firstDueAt!,
            installments: {
              create: {
                dueAt: data.firstDueAt!,
                amountMinor: installmentMinor,
              },
            },
          },
        });
      }

      return created;
    });

    revalidateDebtPaths(debt.id);
    return { success: true, data: { id: debt.id } };
  } catch (error) {
    console.error("createDebt:", error);
    return { success: false, error: "No se pudo crear la deuda" };
  }
}

export async function setDebtAccount(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = setDebtAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const debt = await prisma.debt.findFirst({
      where: { id: parsed.data.debtId, userId: user.id },
      include: { currency: true },
    });
    if (!debt) {
      return { success: false, error: "Deuda no encontrada" };
    }

    if (parsed.data.accountId) {
      const account = await prisma.account.findFirst({
        where: { id: parsed.data.accountId, userId: user.id },
      });
      if (!account || account.archived) {
        return { success: false, error: "Cuenta no válida" };
      }
      if (account.currencyId !== debt.currencyId) {
        return {
          success: false,
          error: `La cuenta debe estar en ${debt.currency.code} (la moneda de la deuda)`,
        };
      }
    }

    await prisma.debt.update({
      where: { id: debt.id, userId: user.id },
      data: { accountId: parsed.data.accountId },
    });

    revalidateDebtPaths(debt.id);
    return { success: true, data: { id: debt.id } };
  } catch (error) {
    console.error("setDebtAccount:", error);
    return { success: false, error: "No se pudo actualizar la cuenta" };
  }
}

export async function registerDebtPayment(
  input: unknown
): Promise<ActionResult<{ id: string; settled: boolean }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = debtPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const [debt, account] = await Promise.all([
      prisma.debt.findFirst({
        where: { id: parsed.data.debtId, userId: user.id },
        include: { currency: true },
      }),
      prisma.account.findFirst({
        where: { id: parsed.data.accountId, userId: user.id },
      }),
    ]);
    if (!debt || debt.status !== "OPEN") {
      return { success: false, error: "La deuda no está abierta" };
    }
    if (!account || account.archived) {
      return { success: false, error: "Cuenta no válida" };
    }
    if (account.currencyId !== debt.currencyId) {
      return {
        success: false,
        error: `La cuenta debe estar en ${debt.currency.code} (la moneda de la deuda)`,
      };
    }

    const amountMinor = parseAmountToMinor(parsed.data.amount, debt.currency);
    if (amountMinor <= 0) {
      return { success: false, error: "El abono debe ser mayor que cero" };
    }

    const { payment, settled } = await prisma.$transaction(async (tx) => {
      // Releído dentro de la transacción: un doble envío concurrente no puede
      // pasar la validación con un saldo pendiente obsoleto.
      const remaining = await debtRemainingMinor(debt.id, tx);
      if (amountMinor > remaining) {
        throw new ActionError(
          `El abono supera el saldo pendiente (${fmtMinor(remaining, debt.currency)})`
        );
      }
      const settled = amountMinor === remaining;

      const transaction = await tx.transaction.create({
        data: {
          kind: debt.direction === "RECEIVABLE" ? "INCOME" : "EXPENSE",
          accountId: account.id,
          amountMinor,
          currencyId: debt.currencyId,
          note: parsed.data.note || `Abono · ${debt.description}`,
          userId: user.id,
        },
      });

      const created = await tx.debtPayment.create({
        data: {
          debtId: debt.id,
          transactionId: transaction.id,
          amountMinor,
        },
      });

      if (settled) {
        await tx.debt.update({
          where: { id: debt.id, userId: user.id },
          data: { status: "PAID" },
        });
        // La deuda quedó saldada: sus cuotas pendientes ya no aplican.
        await tx.installment.updateMany({
          where: {
            plan: { debtId: debt.id, userId: user.id },
            status: "PENDING",
          },
          data: { status: "SKIPPED" },
        });
        await tx.paymentPlan.updateMany({
          where: { debtId: debt.id, userId: user.id },
          data: { active: false },
        });
      }

      return { payment: created, settled };
    });

    revalidateDebtPaths(debt.id, account.id);
    return { success: true, data: { id: payment.id, settled } };
  } catch (error) {
    if (error instanceof ActionError) {
      return { success: false, error: error.message };
    }
    console.error("registerDebtPayment:", error);
    return { success: false, error: "No se pudo registrar el abono" };
  }
}

// Eliminar una deuda quita el SEGUIMIENTO: sus abonos (DebtPayment, FK
// Restrict — se borran antes que la deuda) y sus planes de cuotas (las
// cuotas caen por Cascade). Los movimientos de las cuentas se CONSERVAN:
// el dinero se movió de verdad y los saldos no deben cambiar; el detalle
// del movimiento solo pierde el vínculo a la deuda. El UI confirma antes.
export async function deleteDebt(
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
    const debt = await prisma.debt.findFirst({
      where: { id: parsed.data, userId: user.id },
    });
    if (!debt) return { success: false, error: "Deuda no encontrada" };

    await prisma.$transaction(async (tx) => {
      await tx.debtPayment.deleteMany({ where: { debtId: debt.id } });
      await tx.paymentPlan.deleteMany({ where: { debtId: debt.id } });
      await tx.debt.delete({ where: { id: debt.id } });
    });

    revalidateDebtPaths(debt.id);
    revalidatePath("/movimientos");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteDebt:", error);
    return { success: false, error: "No se pudo eliminar la deuda" };
  }
}

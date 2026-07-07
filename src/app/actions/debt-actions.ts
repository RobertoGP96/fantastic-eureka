"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";
import { fmtMinor } from "@/lib/format";
import { debtRemainingMinor } from "@/lib/debts";
import {
  ActionError,
  createDebtSchema,
  debtPaymentSchema,
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
    const currency = await prisma.currency.findUnique({
      where: { id: data.currencyId },
    });
    if (!currency || !currency.active) {
      return { success: false, error: "Moneda no válida" };
    }

    // Solo validaciones antes de escribir: el contacto nuevo se crea dentro
    // de la transacción para no dejar contactos huérfanos si algo falla.
    if (data.contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: data.contactId },
      });
      if (!contact) return { success: false, error: "Contacto no válido" };
    } else if (!data.contactName) {
      return { success: false, error: "Indica el contacto" };
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
        (await tx.contact.create({ data: { name: data.contactName! } })).id;
      const created = await tx.debt.create({
        data: {
          contactId,
          direction: data.direction,
          description: data.description,
          totalMinor,
          currencyId: currency.id,
        },
      });

      if (withPlan) {
        await tx.paymentPlan.create({
          data: {
            debtId: created.id,
            contactId,
            kind: data.direction === "RECEIVABLE" ? "COLLECT" : "PAY",
            description: data.description,
            currencyId: currency.id,
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

export async function registerDebtPayment(
  input: unknown
): Promise<ActionResult<{ id: string; settled: boolean }>> {
  const parsed = debtPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const [debt, account] = await Promise.all([
      prisma.debt.findUnique({
        where: { id: parsed.data.debtId },
        include: { currency: true },
      }),
      prisma.account.findUnique({ where: { id: parsed.data.accountId } }),
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
          where: { id: debt.id },
          data: { status: "PAID" },
        });
        // La deuda quedó saldada: sus cuotas pendientes ya no aplican.
        await tx.installment.updateMany({
          where: { plan: { debtId: debt.id }, status: "PENDING" },
          data: { status: "SKIPPED" },
        });
        await tx.paymentPlan.updateMany({
          where: { debtId: debt.id },
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

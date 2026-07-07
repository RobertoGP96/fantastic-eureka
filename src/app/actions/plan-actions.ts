"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseAmountToMinor } from "@/lib/money";
import { fmtMinor } from "@/lib/format";
import { nextDueDate } from "@/lib/dates";
import { debtRemainingMinor } from "@/lib/debts";
import type { Frequency } from "@/lib/domain";
import {
  ActionError,
  createPlanSchema,
  idSchema,
  settleInstallmentSchema,
  type ActionResult,
} from "@/lib/schemas";

function revalidatePlanPaths(planId: string, debtId?: string | null) {
  revalidatePath("/");
  revalidatePath("/deudas");
  revalidatePath(`/deudas/plan/${planId}`);
  if (debtId) revalidatePath(`/deudas/${debtId}`);
}

export async function createPlan(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = createPlanSchema.safeParse(input);
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

    const amountMinor = parseAmountToMinor(parsed.data.amount, currency);
    if (amountMinor <= 0) {
      return { success: false, error: "La cuota debe ser mayor que cero" };
    }
    if (
      parsed.data.endAt &&
      parsed.data.endAt.getTime() < parsed.data.firstDueAt.getTime()
    ) {
      return { success: false, error: "El fin no puede ser antes del inicio" };
    }

    const plan = await prisma.paymentPlan.create({
      data: {
        contactId: parsed.data.contactId,
        kind: parsed.data.kind,
        description: parsed.data.description,
        currencyId: currency.id,
        amountMinor,
        frequency: parsed.data.frequency,
        dayOfMonth:
          parsed.data.frequency === "MONTHLY"
            ? parsed.data.firstDueAt.getDate()
            : null,
        nextDueAt: parsed.data.firstDueAt,
        endAt: parsed.data.endAt,
        installments: {
          create: { dueAt: parsed.data.firstDueAt, amountMinor },
        },
      },
    });

    revalidatePlanPaths(plan.id);
    return { success: true, data: { id: plan.id } };
  } catch (error) {
    console.error("createPlan:", error);
    return { success: false, error: "No se pudo crear el plan" };
  }
}

interface PlanWithDebt {
  id: string;
  debtId: string | null;
  frequency: string;
  dayOfMonth: number | null;
  endAt: Date | null;
  active: boolean;
  amountMinor: number;
}

/**
 * Genera la siguiente cuota tras saldar/omitir la actual, o desactiva el plan
 * si la frecuencia es única, se alcanzó endAt o la deuda quedó saldada.
 */
async function advancePlan(
  tx: Prisma.TransactionClient,
  plan: PlanWithDebt,
  currentDueAt: Date,
  debtSettled: boolean
) {
  const next = nextDueDate(
    currentDueAt,
    plan.frequency as Frequency,
    plan.dayOfMonth
  );

  const shouldContinue =
    !debtSettled &&
    next !== null &&
    (!plan.endAt || next.getTime() <= plan.endAt.getTime());

  if (shouldContinue) {
    await tx.installment.upsert({
      where: { planId_dueAt: { planId: plan.id, dueAt: next } },
      update: {},
      create: { planId: plan.id, dueAt: next, amountMinor: plan.amountMinor },
    });
    await tx.paymentPlan.update({
      where: { id: plan.id },
      data: { nextDueAt: next },
    });
  } else {
    await tx.paymentPlan.update({
      where: { id: plan.id },
      data: { active: false },
    });
  }
}

export async function settleInstallment(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = settleInstallmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const installment = await prisma.installment.findUnique({
      where: { id: parsed.data.installmentId },
      include: { plan: { include: { currency: true } } },
    });
    if (!installment || installment.status !== "PENDING") {
      return { success: false, error: "La cuota no está pendiente" };
    }
    const plan = installment.plan;

    const account = await prisma.account.findUnique({
      where: { id: parsed.data.accountId },
    });
    if (!account || account.archived) {
      return { success: false, error: "Cuenta no válida" };
    }
    if (account.currencyId !== plan.currencyId) {
      return {
        success: false,
        error: `La cuenta debe estar en ${plan.currency.code}`,
      };
    }

    let amountMinor = installment.amountMinor;
    if (parsed.data.amount) {
      amountMinor = parseAmountToMinor(parsed.data.amount, plan.currency);
    }
    if (amountMinor <= 0) {
      return { success: false, error: "El monto debe ser mayor que cero" };
    }

    await prisma.$transaction(async (tx) => {
      // Releído dentro de la transacción: evita sobrepagos por doble envío.
      let debtSettled = false;
      if (plan.debtId) {
        const remaining = await debtRemainingMinor(plan.debtId, tx);
        if (amountMinor > remaining) {
          throw new ActionError(
            `El monto supera el saldo pendiente de la deuda (${fmtMinor(remaining, plan.currency)})`
          );
        }
        debtSettled = amountMinor === remaining;
      }

      const transaction = await tx.transaction.create({
        data: {
          kind: plan.kind === "COLLECT" ? "INCOME" : "EXPENSE",
          accountId: account.id,
          amountMinor,
          currencyId: plan.currencyId,
          note: parsed.data.note || `${plan.description} · cuota`,
        },
      });

      await tx.installment.update({
        where: { id: installment.id },
        data: {
          status: "PAID",
          transactionId: transaction.id,
          settledAt: new Date(),
        },
      });

      if (plan.debtId) {
        await tx.debtPayment.create({
          data: {
            debtId: plan.debtId,
            transactionId: transaction.id,
            amountMinor,
          },
        });
        if (debtSettled) {
          await tx.debt.update({
            where: { id: plan.debtId },
            data: { status: "PAID" },
          });
        }
      }

      await advancePlan(tx, plan, installment.dueAt, debtSettled);
    });

    revalidatePlanPaths(plan.id, plan.debtId);
    revalidatePath("/cuentas");
    revalidatePath(`/cuentas/${account.id}`);
    revalidatePath("/movimientos");
    return { success: true, data: { id: installment.id } };
  } catch (error) {
    if (error instanceof ActionError) {
      return { success: false, error: error.message };
    }
    console.error("settleInstallment:", error);
    return { success: false, error: "No se pudo registrar el pago de la cuota" };
  }
}

export async function skipInstallment(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const installment = await prisma.installment.findUnique({
      where: { id: parsed.data },
      include: { plan: true },
    });
    if (!installment || installment.status !== "PENDING") {
      return { success: false, error: "La cuota no está pendiente" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.installment.update({
        where: { id: installment.id },
        data: { status: "SKIPPED" },
      });
      await advancePlan(tx, installment.plan, installment.dueAt, false);
    });

    revalidatePlanPaths(installment.plan.id, installment.plan.debtId);
    return { success: true, data: { id: installment.id } };
  } catch (error) {
    console.error("skipInstallment:", error);
    return { success: false, error: "No se pudo omitir la cuota" };
  }
}

export async function deactivatePlan(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const plan = await prisma.paymentPlan.update({
      where: { id: parsed.data },
      data: { active: false },
    });
    await prisma.installment.updateMany({
      where: { planId: plan.id, status: "PENDING" },
      data: { status: "SKIPPED" },
    });

    revalidatePlanPaths(plan.id, plan.debtId);
    return { success: true, data: { id: plan.id } };
  } catch (error) {
    console.error("deactivatePlan:", error);
    return { success: false, error: "No se pudo desactivar el plan" };
  }
}

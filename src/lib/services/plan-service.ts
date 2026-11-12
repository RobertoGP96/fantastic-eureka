// Servicio de planes de cuotas (mensualidades). Lógica extraída de
// src/app/actions/plan-actions.ts sin cambios de comportamiento: mismas
// validaciones, mismos mensajes, pendiente de la deuda releído DENTRO de la
// transacción y `advancePlan` tras saldar/omitir.
//
// Los servicios devuelven, además de lo que ve el cliente web, los ids que
// la action necesita para revalidar rutas; la action los recorta.

import type { Prisma } from "@prisma/client";
import { parseAmountToMinor, PRISMA_INT_MAX } from "@/lib/money";
import { fmtMinor } from "@/lib/format";
import { endOfLocalDay, nextDueDate } from "@/lib/dates";
import { debtRemainingMinor, lockDebt } from "@/lib/debts";
import type { Frequency } from "@/lib/domain";
import {
  ActionError,
  createPlanSchema,
  idSchema,
  setPlanAccountSchema,
  settleInstallmentSchema,
  type ActionResult,
} from "@/lib/schemas";
import { recordTombstone } from "@/lib/sync/tombstones";
import {
  clientIdOrUndefined,
  inTx,
  type CreateOptions,
  type ServiceContext,
  unexpectedFailure,
} from "./context";

/**
 * Ids de cliente de createPlan (solo push móvil):
 *  · `id`            → el PaymentPlan.
 *  · `installmentId` → su primera Installment.
 */
export interface CreatePlanOptions extends CreateOptions {
  installmentId?: string;
}

export async function createPlan(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreatePlanOptions = {}
): Promise<ActionResult<{ id: string }>> {
  const parsed = createPlanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const currency = await db.currency.findFirst({
      where: { id: parsed.data.currencyId, userId },
    });
    if (!currency || !currency.active) {
      return { success: false, error: "Moneda no válida" };
    }

    let accountId: string | null = null;
    if (parsed.data.accountId) {
      const account = await db.account.findFirst({
        where: { id: parsed.data.accountId, userId },
      });
      if (!account || account.archived) {
        return { success: false, error: "Cuenta no válida" };
      }
      if (account.currencyId !== currency.id) {
        return {
          success: false,
          error: `La cuenta debe estar en ${currency.code} (la moneda del plan)`,
        };
      }
      accountId = account.id;
    }

    // Id ajeno = inexistente: sin esto el plan quedaba ligado al contacto de
    // otro usuario y sus vistas mostraban ese nombre.
    if (parsed.data.contactId) {
      const contact = await db.contact.findFirst({
        where: { id: parsed.data.contactId, userId },
      });
      if (!contact) return { success: false, error: "Contacto no válido" };
    }

    const amountMinor = parseAmountToMinor(parsed.data.amount, currency);
    if (amountMinor <= 0) {
      return { success: false, error: "La cuota debe ser mayor que cero" };
    }
    if (amountMinor > PRISMA_INT_MAX) {
      return { success: false, error: "Monto demasiado grande" };
    }
    if (
      parsed.data.endAt &&
      parsed.data.endAt.getTime() < parsed.data.firstDueAt.getTime()
    ) {
      return { success: false, error: "El fin no puede ser antes del inicio" };
    }

    const plan = await db.paymentPlan.create({
      data: {
        id: clientIdOrUndefined(options.id),
        contactId: parsed.data.contactId,
        userId,
        kind: parsed.data.kind,
        description: parsed.data.description,
        currencyId: currency.id,
        accountId,
        amountMinor,
        frequency: parsed.data.frequency,
        dayOfMonth:
          parsed.data.frequency === "MONTHLY"
            ? parsed.data.firstDueAt.getDate()
            : null,
        nextDueAt: parsed.data.firstDueAt,
        endAt: parsed.data.endAt,
        installments: {
          create: {
            id: clientIdOrUndefined(options.installmentId),
            dueAt: parsed.data.firstDueAt,
            amountMinor,
          },
        },
      },
    });

    return { success: true, data: { id: plan.id } };
  } catch (error) {
    return unexpectedFailure("createPlan", error, "No se pudo crear el plan");
  }
}

/** `data.debtId` es solo para revalidar: la action devuelve `{ id }`. */
export async function setPlanAccount(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string; debtId: string | null }>> {
  const parsed = setPlanAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const plan = await db.paymentPlan.findFirst({
      where: { id: parsed.data.planId, userId },
      include: { currency: true },
    });
    if (!plan) {
      return { success: false, error: "Plan no encontrado" };
    }

    if (parsed.data.accountId) {
      const account = await db.account.findFirst({
        where: { id: parsed.data.accountId, userId },
      });
      if (!account || account.archived) {
        return { success: false, error: "Cuenta no válida" };
      }
      if (account.currencyId !== plan.currencyId) {
        return {
          success: false,
          error: `La cuenta debe estar en ${plan.currency.code} (la moneda del plan)`,
        };
      }
    }

    await db.paymentPlan.update({
      where: { id: plan.id, userId },
      data: { accountId: parsed.data.accountId },
    });

    return { success: true, data: { id: plan.id, debtId: plan.debtId } };
  } catch (error) {
    return unexpectedFailure("setPlanAccount", error, "No se pudo actualizar la cuenta");
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
 *
 * Los updates por id (sin userId) son seguros: el `plan` que llega aquí ya
 * fue validado como propiedad del usuario por quien llama (settleInstallment
 * / skipInstallment) antes de invocar este helper.
 *
 * `nextInstallmentId` (solo push móvil) es el id que el dispositivo dio a la
 * cuota siguiente; solo se usa si la cuota se CREA (upsert por planId+dueAt).
 *
 * `endAt` es inclusivo POR DÍA: se compara contra el final de ese día y no por
 * instante, porque ambas fechas se guardan a «mediodía local» y esa hora
 * cambia en UTC con el horario de verano (la última cuota se perdía).
 *
 * En un plan de deuda la cuota siguiente nunca supera lo que queda por pagar
 * (si no, salía una cuota de 300 con 100 pendientes y saldarla fallaba).
 */
async function advancePlan(
  tx: Prisma.TransactionClient,
  plan: PlanWithDebt,
  currentDueAt: Date,
  debtSettled: boolean,
  nextInstallmentId?: string
) {
  const next = nextDueDate(
    currentDueAt,
    plan.frequency as Frequency,
    plan.dayOfMonth
  );

  let debtOpen = !debtSettled;
  let amountMinor = plan.amountMinor;
  if (debtOpen && plan.debtId) {
    const remaining = await debtRemainingMinor(plan.debtId, tx);
    if (remaining <= 0) debtOpen = false;
    else amountMinor = Math.min(amountMinor, remaining);
  }

  const shouldContinue =
    debtOpen &&
    next !== null &&
    (!plan.endAt || next.getTime() <= endOfLocalDay(plan.endAt).getTime());

  if (shouldContinue) {
    await tx.installment.upsert({
      where: { planId_dueAt: { planId: plan.id, dueAt: next } },
      update: {},
      create: {
        id: clientIdOrUndefined(nextInstallmentId),
        planId: plan.id,
        dueAt: next,
        amountMinor,
      },
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

/**
 * Ids de cliente de settleInstallment (solo push móvil):
 *  · `transactionId`     → el Transaction (movimiento) del pago.
 *  · `debtPaymentId`     → el DebtPayment (solo si el plan es de una deuda).
 *  · `nextInstallmentId` → la cuota siguiente que genera advancePlan.
 */
export interface SettleInstallmentOptions {
  transactionId?: string;
  debtPaymentId?: string;
  nextInstallmentId?: string;
}

/**
 * `data` = forma pública { id } + `planId`/`debtId`/`accountId` para que la
 * action revalide las rutas del plan, la deuda y la cuenta.
 */
export async function settleInstallment(
  { db, userId }: ServiceContext,
  input: unknown,
  options: SettleInstallmentOptions = {}
): Promise<
  ActionResult<{
    id: string;
    planId: string;
    debtId: string | null;
    accountId: string;
  }>
> {
  const parsed = settleInstallmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const installment = await db.installment.findFirst({
      where: { id: parsed.data.installmentId, plan: { userId } },
      include: { plan: { include: { currency: true } } },
    });
    if (!installment || installment.status !== "PENDING") {
      return { success: false, error: "La cuota no está pendiente" };
    }
    const plan = installment.plan;

    const account = await db.account.findFirst({
      where: { id: parsed.data.accountId, userId },
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
    if (amountMinor > PRISMA_INT_MAX) {
      return { success: false, error: "Monto demasiado grande" };
    }

    await inTx(db, async (tx) => {
      // La cuota se «reclama» con un UPDATE condicionado a PENDING: si dos
      // peticiones la saldan a la vez (dos pestañas, web + móvil), la segunda
      // espera el bloqueo de fila, encuentra 0 filas y aborta sin duplicar
      // el movimiento.
      const claimed = await tx.installment.updateMany({
        where: { id: installment.id, status: "PENDING" },
        data: { status: "PAID", settledAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new ActionError("La cuota no está pendiente");
      }

      // Bloqueo + relectura dentro de la transacción: evita sobrepagos.
      let debtSettled = false;
      if (plan.debtId) {
        await lockDebt(tx, plan.debtId);
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
          id: clientIdOrUndefined(options.transactionId),
          kind: plan.kind === "COLLECT" ? "INCOME" : "EXPENSE",
          accountId: account.id,
          amountMinor,
          currencyId: plan.currencyId,
          note: parsed.data.note || `${plan.description} · cuota`,
          userId,
        },
      });

      await tx.installment.update({
        where: { id: installment.id },
        data: { transactionId: transaction.id },
      });

      if (plan.debtId) {
        await tx.debtPayment.create({
          data: {
            id: clientIdOrUndefined(options.debtPaymentId),
            debtId: plan.debtId,
            transactionId: transaction.id,
            amountMinor,
          },
        });
        if (debtSettled) {
          await tx.debt.update({
            where: { id: plan.debtId, userId },
            data: { status: "PAID" },
          });
        }
      }

      await advancePlan(
        tx,
        plan,
        installment.dueAt,
        debtSettled,
        options.nextInstallmentId
      );
    });

    return {
      success: true,
      data: {
        id: installment.id,
        planId: plan.id,
        debtId: plan.debtId,
        accountId: account.id,
      },
    };
  } catch (error) {
    if (error instanceof ActionError) {
      return { success: false, error: error.message };
    }
    return unexpectedFailure("settleInstallment", error, "No se pudo registrar el pago de la cuota");
  }
}

/**
 * Ids de cliente de skipInstallment (solo push móvil):
 *  · `nextInstallmentId` → la cuota siguiente que genera advancePlan.
 */
export interface SkipInstallmentOptions {
  nextInstallmentId?: string;
}

/** `data` = forma pública { id } + `planId`/`debtId` para revalidar. */
export async function skipInstallment(
  { db, userId }: ServiceContext,
  input: unknown,
  options: SkipInstallmentOptions = {}
): Promise<ActionResult<{ id: string; planId: string; debtId: string | null }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const installment = await db.installment.findFirst({
      where: { id: parsed.data, plan: { userId } },
      include: { plan: true },
    });
    if (!installment || installment.status !== "PENDING") {
      return { success: false, error: "La cuota no está pendiente" };
    }

    await inTx(db, async (tx) => {
      // Mismo «reclamo» condicionado que al saldar (ver settleInstallment).
      const claimed = await tx.installment.updateMany({
        where: { id: installment.id, status: "PENDING" },
        data: { status: "SKIPPED" },
      });
      if (claimed.count !== 1) {
        throw new ActionError("La cuota no está pendiente");
      }
      await advancePlan(
        tx,
        installment.plan,
        installment.dueAt,
        false,
        options.nextInstallmentId
      );
    });

    return {
      success: true,
      data: {
        id: installment.id,
        planId: installment.plan.id,
        debtId: installment.plan.debtId,
      },
    };
  } catch (error) {
    if (error instanceof ActionError) {
      return { success: false, error: error.message };
    }
    return unexpectedFailure("skipInstallment", error, "No se pudo omitir la cuota");
  }
}

/** `data.debtId` es solo para revalidar: la action devuelve `{ id }`. */
export async function deactivatePlan(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string; debtId: string | null }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    // Las dos escrituras en una transacción: sin plan inactivo con cuota viva.
    const plan = await inTx(db, async (tx) => {
      const updated = await tx.paymentPlan.update({
        where: { id: parsed.data, userId },
        data: { active: false },
      });
      await tx.installment.updateMany({
        where: { planId: updated.id, plan: { userId }, status: "PENDING" },
        data: { status: "SKIPPED" },
      });
      return updated;
    });

    return { success: true, data: { id: plan.id, debtId: plan.debtId } };
  } catch (error) {
    return unexpectedFailure("deactivatePlan", error, "No se pudo desactivar el plan");
  }
}

// Eliminar un plan borra también todas sus cuotas (Cascade). Los movimientos
// de cuotas ya saldadas se CONSERVAN (Installment solo los vincula): los
// saldos de las cuentas no cambian. El UI confirma antes de llamar aquí.
//
// `data` es solo para revalidar: la action devuelve `undefined`.
export async function deletePlan(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ planId: string; debtId: string | null }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const plan = await db.paymentPlan.findFirst({
      where: { id: parsed.data, userId },
    });
    if (!plan) return { success: false, error: "Plan no encontrado" };

    await inTx(db, async (tx) => {
      await tx.paymentPlan.delete({ where: { id: plan.id } });
      await recordTombstone(tx, userId, "paymentPlan", plan.id);
    });

    return { success: true, data: { planId: plan.id, debtId: plan.debtId } };
  } catch (error) {
    return unexpectedFailure("deletePlan", error, "No se pudo eliminar el plan");
  }
}

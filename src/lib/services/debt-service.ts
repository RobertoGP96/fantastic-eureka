// Servicio de deudas. Lógica extraída de src/app/actions/debt-actions.ts sin
// cambios de comportamiento: mismas validaciones, mismos mensajes y el
// pendiente releído DENTRO de la transacción (anti doble envío).
//
// Los servicios devuelven, además de lo que ve el cliente web, los ids que
// la action necesita para revalidar rutas; la action los recorta.

import { parseAmountToMinor } from "@/lib/money";
import { fmtMinor } from "@/lib/format";
import { debtRemainingMinor } from "@/lib/debts";
import {
  ActionError,
  createDebtSchema,
  debtPaymentSchema,
  idSchema,
  setDebtAccountSchema,
  type ActionResult,
} from "@/lib/schemas";
import { recordTombstone } from "@/lib/sync/tombstones";
import {
  clientIdOrUndefined,
  inTx,
  type CreateOptions,
  type ServiceContext,
} from "./context";

/**
 * Ids de cliente de createDebt (solo push móvil):
 *  · `id`            → la Debt.
 *  · `contactId`     → el Contact NUEVO (solo si se crea por `contactName`).
 *  · `planId`        → el PaymentPlan (solo si viene plan de cuotas).
 *  · `installmentId` → la primera Installment de ese plan.
 */
export interface CreateDebtOptions extends CreateOptions {
  contactId?: string;
  planId?: string;
  installmentId?: string;
}

export async function createDebt(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateDebtOptions = {}
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
    const currency = await db.currency.findFirst({
      where: { id: data.currencyId, userId },
    });
    if (!currency || !currency.active) {
      return { success: false, error: "Moneda no válida" };
    }

    // Solo validaciones antes de escribir: el contacto nuevo se crea dentro
    // de la transacción para no dejar contactos huérfanos si algo falla.
    if (data.contactId) {
      const contact = await db.contact.findFirst({
        where: { id: data.contactId, userId },
      });
      if (!contact) return { success: false, error: "Contacto no válido" };
    } else if (!data.contactName) {
      return { success: false, error: "Indica el contacto" };
    }

    let accountId: string | null = null;
    if (data.accountId) {
      const account = await db.account.findFirst({
        where: { id: data.accountId, userId },
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

    const debt = await inTx(db, async (tx) => {
      const contactId =
        data.contactId ??
        (
          await tx.contact.create({
            data: {
              id: clientIdOrUndefined(options.contactId),
              name: data.contactName!,
              userId,
            },
          })
        ).id;
      const created = await tx.debt.create({
        data: {
          id: clientIdOrUndefined(options.id),
          contactId,
          direction: data.direction,
          description: data.description,
          totalMinor,
          currencyId: currency.id,
          accountId,
          userId,
        },
      });

      if (withPlan) {
        await tx.paymentPlan.create({
          data: {
            id: clientIdOrUndefined(options.planId),
            debtId: created.id,
            contactId,
            userId,
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
                id: clientIdOrUndefined(options.installmentId),
                dueAt: data.firstDueAt!,
                amountMinor: installmentMinor,
              },
            },
          },
        });
      }

      return created;
    });

    return { success: true, data: { id: debt.id } };
  } catch (error) {
    console.error("createDebt:", error);
    return { success: false, error: "No se pudo crear la deuda" };
  }
}

export async function setDebtAccount(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const parsed = setDebtAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const debt = await db.debt.findFirst({
      where: { id: parsed.data.debtId, userId },
      include: { currency: true },
    });
    if (!debt) {
      return { success: false, error: "Deuda no encontrada" };
    }

    if (parsed.data.accountId) {
      const account = await db.account.findFirst({
        where: { id: parsed.data.accountId, userId },
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

    await db.debt.update({
      where: { id: debt.id, userId },
      data: { accountId: parsed.data.accountId },
    });

    return { success: true, data: { id: debt.id } };
  } catch (error) {
    console.error("setDebtAccount:", error);
    return { success: false, error: "No se pudo actualizar la cuenta" };
  }
}

/**
 * Ids de cliente de registerDebtPayment (solo push móvil):
 *  · `id`            → el DebtPayment.
 *  · `transactionId` → el Transaction (movimiento) que lo respalda.
 */
export interface RegisterDebtPaymentOptions extends CreateOptions {
  transactionId?: string;
}

/**
 * `data` = forma pública { id, settled } + `debtId`/`accountId` para que la
 * action revalide las rutas de la deuda y de la cuenta.
 */
export async function registerDebtPayment(
  { db, userId }: ServiceContext,
  input: unknown,
  options: RegisterDebtPaymentOptions = {}
): Promise<
  ActionResult<{ id: string; settled: boolean; debtId: string; accountId: string }>
> {
  const parsed = debtPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const [debt, account] = await Promise.all([
      db.debt.findFirst({
        where: { id: parsed.data.debtId, userId },
        include: { currency: true },
      }),
      db.account.findFirst({
        where: { id: parsed.data.accountId, userId },
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

    const { payment, settled } = await inTx(db, async (tx) => {
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
          id: clientIdOrUndefined(options.transactionId),
          kind: debt.direction === "RECEIVABLE" ? "INCOME" : "EXPENSE",
          accountId: account.id,
          amountMinor,
          currencyId: debt.currencyId,
          note: parsed.data.note || `Abono · ${debt.description}`,
          userId,
        },
      });

      const created = await tx.debtPayment.create({
        data: {
          id: clientIdOrUndefined(options.id),
          debtId: debt.id,
          transactionId: transaction.id,
          amountMinor,
        },
      });

      if (settled) {
        await tx.debt.update({
          where: { id: debt.id, userId },
          data: { status: "PAID" },
        });
        // La deuda quedó saldada: sus cuotas pendientes ya no aplican.
        await tx.installment.updateMany({
          where: {
            plan: { debtId: debt.id, userId },
            status: "PENDING",
          },
          data: { status: "SKIPPED" },
        });
        await tx.paymentPlan.updateMany({
          where: { debtId: debt.id, userId },
          data: { active: false },
        });
      }

      return { payment: created, settled };
    });

    return {
      success: true,
      data: { id: payment.id, settled, debtId: debt.id, accountId: account.id },
    };
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
//
// `data.debtId` es solo para revalidar: la action devuelve `undefined`.
export async function deleteDebt(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ debtId: string }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const debt = await db.debt.findFirst({
      where: { id: parsed.data, userId },
    });
    if (!debt) return { success: false, error: "Deuda no encontrada" };

    await inTx(db, async (tx) => {
      await tx.debtPayment.deleteMany({ where: { debtId: debt.id } });
      await tx.paymentPlan.deleteMany({ where: { debtId: debt.id } });
      await tx.debt.delete({ where: { id: debt.id } });
      await recordTombstone(tx, userId, "debt", debt.id);
    });

    return { success: true, data: { debtId: debt.id } };
  } catch (error) {
    console.error("deleteDebt:", error);
    return { success: false, error: "No se pudo eliminar la deuda" };
  }
}

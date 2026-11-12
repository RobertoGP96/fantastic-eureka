// Servicio de movimientos. Lógica extraída de src/app/actions/transaction-actions.ts
// sin cambios de comportamiento: mismas validaciones y mismos mensajes.
//
// Además del id, cada servicio devuelve en `touched` lo que la action web
// necesita para decidir qué rutas revalidar (cuentas afectadas y, si el
// movimiento venía de un abono/cuota, la deuda y el plan). La action lo quita
// antes de responder al cliente.

import {
  convertMinor,
  convertMinorInverse,
  impliedRateScaled,
  parseAmountToMinor,
  PRISMA_INT_MAX,
} from "@/lib/money";
import { fmtMinor } from "@/lib/format";
import { closeDebtPlans, debtRemainingMinor, lockDebt } from "@/lib/debts";
import {
  ActionError,
  idSchema,
  incomeExpenseSchema,
  transferSchema,
  updateTransactionSchema,
  type ActionResult,
} from "@/lib/schemas";
import { recordTombstone } from "@/lib/sync/tombstones";
import {
  clientIdOrUndefined,
  inTx,
  type CreateOptions,
  type Db,
  type ServiceContext,
  unexpectedFailure,
} from "./context";

/** Entidades afectadas por un movimiento (para revalidar vistas). */
export interface MovementTouched {
  /** Cuentas de ambos lados del movimiento. */
  accountIds: string[];
  /** Deudas cuyo pendiente/estado cambió (abono o deuda del plan). */
  debtIds: string[];
  /** Planes de cuotas con una cuota vinculada al movimiento. */
  planIds: string[];
}

export interface MovementResult {
  id: string;
  touched: MovementTouched;
}

interface DenominationLineInput {
  denominationId: string;
  quantity: number;
}

type LinesCheck =
  | { ok: true; lines: DenominationLineInput[] }
  | { ok: false; error: string };

/**
 * Valida el desglose de denominaciones de UN lado del movimiento: la cuenta
 * debe ser CASH_BOX, las denominaciones de su moneda (y del usuario) y la
 * suma exactamente igual al monto de ese lado.
 */
async function checkDenominationLines(
  db: Db,
  userId: string,
  account: {
    id: string;
    type: string;
    currencyId: string;
    currency: { code: string; decimalPlaces: number };
  },
  lines: DenominationLineInput[] | undefined,
  expectedMinor: number
): Promise<LinesCheck> {
  if (!lines || lines.length === 0) return { ok: true, lines: [] };

  if (account.type !== "CASH_BOX") {
    return {
      ok: false,
      error: "El desglose de denominaciones solo aplica a cuentas tipo Caja",
    };
  }

  const ids = lines.map((line) => line.denominationId);
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: "Hay denominaciones repetidas en el desglose" };
  }

  const denominations = await db.denomination.findMany({
    where: {
      id: { in: ids },
      currencyId: account.currencyId,
      currency: { userId },
    },
    select: { id: true, valueMinor: true },
  });
  if (denominations.length !== ids.length) {
    return {
      ok: false,
      error: "Denominación no válida para la moneda de la caja",
    };
  }

  const byId = new Map(denominations.map((d) => [d.id, d.valueMinor]));
  const totalMinor = lines.reduce(
    (acc, line) => acc + byId.get(line.denominationId)! * line.quantity,
    0
  );
  if (totalMinor !== expectedMinor) {
    return {
      ok: false,
      error: `El desglose suma ${fmtMinor(totalMinor, account.currency)} y el monto es ${fmtMinor(expectedMinor, account.currency)}`,
    };
  }

  return { ok: true, lines };
}

function accountIdsOf(tx: {
  accountId: string;
  counterAccountId: string | null;
}): string[] {
  return [tx.accountId, tx.counterAccountId].filter(
    (id): id is string => !!id
  );
}

export async function registerIncomeExpense(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateOptions = {}
): Promise<ActionResult<MovementResult>> {
  const parsed = incomeExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const account = await db.account.findFirst({
      where: { id: parsed.data.accountId, userId },
      include: { currency: true },
    });
    if (!account || account.archived) {
      return { success: false, error: "Cuenta no válida" };
    }

    // Operación multi-moneda: el monto viene en otra divisa y se convierte a
    // la de la cuenta con la tasa indicada. El movimiento se guarda en la
    // moneda de la cuenta (los saldos no cambian de lógica) y el monto
    // original + la tasa quedan en counterAmountMinor/counterCurrencyId/rateScaled.
    const crossCurrency =
      !!parsed.data.amountCurrencyId &&
      parsed.data.amountCurrencyId !== account.currencyId;

    let amountMinor: number;
    let counterAmountMinor: number | undefined;
    let counterCurrencyId: string | undefined;
    let rateScaled: number | null = null;

    if (crossCurrency) {
      const opCurrency = await db.currency.findFirst({
        where: { id: parsed.data.amountCurrencyId, userId },
      });
      if (!opCurrency) {
        return { success: false, error: "Moneda no válida" };
      }

      const opMinor = parseAmountToMinor(parsed.data.amount, opCurrency);
      if (opMinor <= 0) {
        return { success: false, error: "El monto debe ser mayor que cero" };
      }
      if (opMinor > PRISMA_INT_MAX) {
        return { success: false, error: "Monto demasiado grande" };
      }

      if (!parsed.data.rate) {
        return {
          success: false,
          error: `Indica la tasa ${opCurrency.code}/${account.currency.code}`,
        };
      }
      // La tasa se parsea con la misma precisión con que se almacena (×10 000).
      const enteredRateScaled = parseAmountToMinor(parsed.data.rate, {
        decimalPlaces: 4,
      });
      if (enteredRateScaled <= 0 || enteredRateScaled > PRISMA_INT_MAX) {
        return { success: false, error: "Tasa inválida" };
      }

      amountMinor =
        parsed.data.rateDirection === "ACCOUNT_TO_AMOUNT"
          ? convertMinorInverse(
              opMinor,
              opCurrency,
              account.currency,
              enteredRateScaled
            )
          : convertMinor(opMinor, opCurrency, account.currency, enteredRateScaled);
      if (amountMinor <= 0) {
        return {
          success: false,
          error: "El monto convertido queda en cero: revisa la tasa",
        };
      }
      if (amountMinor > PRISMA_INT_MAX) {
        return { success: false, error: "El monto convertido es demasiado grande" };
      }

      counterAmountMinor = opMinor;
      counterCurrencyId = opCurrency.id;
      // Igual que en transferencias: tasa implícita informativa
      // (moneda original por 1 unidad de la moneda de la cuenta).
      rateScaled = impliedRateScaled(
        amountMinor,
        account.currency,
        opMinor,
        opCurrency
      );
    } else {
      amountMinor = parseAmountToMinor(parsed.data.amount, account.currency);
      if (amountMinor <= 0) {
        return { success: false, error: "El monto debe ser mayor que cero" };
      }
      if (amountMinor > PRISMA_INT_MAX) {
        return { success: false, error: "Monto demasiado grande" };
      }
    }

    if (parsed.data.categoryId) {
      const category = await db.category.findFirst({
        where: { id: parsed.data.categoryId, userId },
      });
      if (!category || category.kind !== parsed.data.kind) {
        return { success: false, error: "Categoría no válida" };
      }
    }

    // El desglose va en la moneda de la cuenta: en operaciones multi-moneda
    // debe cuadrar con el monto YA convertido (amountMinor).
    const linesCheck = await checkDenominationLines(
      db,
      userId,
      account,
      parsed.data.denominationLines,
      amountMinor
    );
    if (!linesCheck.ok) {
      return { success: false, error: linesCheck.error };
    }

    const transaction = await db.transaction.create({
      data: {
        id: clientIdOrUndefined(options.id),
        kind: parsed.data.kind,
        accountId: account.id,
        amountMinor,
        currencyId: account.currencyId,
        counterAmountMinor,
        counterCurrencyId,
        rateScaled,
        categoryId: parsed.data.categoryId,
        note: parsed.data.note || undefined,
        occurredAt: parsed.data.occurredAt ?? new Date(),
        userId,
        denominationLines: {
          create: linesCheck.lines.map((line) => ({
            accountId: account.id,
            denominationId: line.denominationId,
            quantity: line.quantity,
          })),
        },
      },
    });

    return {
      success: true,
      data: {
        id: transaction.id,
        touched: { accountIds: [account.id], debtIds: [], planIds: [] },
      },
    };
  } catch (error) {
    return unexpectedFailure("registerIncomeExpense", error, "No se pudo registrar el movimiento");
  }
}

export async function registerTransfer(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateOptions = {}
): Promise<ActionResult<MovementResult>> {
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
      db.account.findFirst({
        where: { id: parsed.data.accountId, userId },
        include: { currency: true },
      }),
      db.account.findFirst({
        where: { id: parsed.data.counterAccountId, userId },
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
    if (amountMinor > PRISMA_INT_MAX) {
      return { success: false, error: "Monto demasiado grande" };
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
      if (counterAmountMinor > PRISMA_INT_MAX) {
        return { success: false, error: "El monto recibido es demasiado grande" };
      }
      // Tasa implícita (destino por 1 origen), solo informativa; null si no
      // cabe en un Int de Prisma.
      rateScaled = impliedRateScaled(
        amountMinor,
        from.currency,
        counterAmountMinor,
        to.currency
      );
    }

    // Desglose de salida (origen) y de entrada (destino), cada uno en la
    // moneda y monto de su lado.
    const [fromLines, toLines] = await Promise.all([
      checkDenominationLines(
        db,
        userId,
        from,
        parsed.data.denominationLines,
        amountMinor
      ),
      checkDenominationLines(
        db,
        userId,
        to,
        parsed.data.counterDenominationLines,
        counterAmountMinor
      ),
    ]);
    if (!fromLines.ok) return { success: false, error: fromLines.error };
    if (!toLines.ok) return { success: false, error: toLines.error };

    const transaction = await db.transaction.create({
      data: {
        id: clientIdOrUndefined(options.id),
        kind: "TRANSFER",
        accountId: from.id,
        counterAccountId: to.id,
        amountMinor,
        currencyId: from.currencyId,
        counterAmountMinor,
        counterCurrencyId: to.currencyId,
        rateScaled,
        note: parsed.data.note || undefined,
        occurredAt: parsed.data.occurredAt ?? new Date(),
        userId,
        denominationLines: {
          create: [
            ...fromLines.lines.map((line) => ({
              accountId: from.id,
              denominationId: line.denominationId,
              quantity: line.quantity,
            })),
            ...toLines.lines.map((line) => ({
              accountId: to.id,
              denominationId: line.denominationId,
              quantity: line.quantity,
            })),
          ],
        },
      },
    });

    return {
      success: true,
      data: {
        id: transaction.id,
        touched: { accountIds: [from.id, to.id], debtIds: [], planIds: [] },
      },
    };
  } catch (error) {
    return unexpectedFailure("registerTransfer", error, "No se pudo registrar la transferencia");
  }
}

/**
 * Edita un movimiento ya registrado (equivocaciones): monto, monto del otro
 * lado (transferencias entre monedas / operaciones multi-moneda), categoría,
 * fecha, nota y desglose de denominaciones (que REEMPLAZA al anterior). No
 * se puede cambiar el tipo ni las cuentas (para eso, eliminar y volver a
 * registrar). Los ADJUSTMENT (saldo inicial/arqueos) no se editan. Si el
 * movimiento nació de un abono o cuota, el abono (DebtPayment) se mantiene
 * en sincronía con el pendiente de la deuda.
 *
 * `touched.debtIds` = deuda del abono y deuda del plan de la cuota (si hay);
 * `touched.planIds` = plan de la cuota vinculada (si hay).
 */
export async function updateTransaction(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<MovementResult>> {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const existing = await db.transaction.findFirst({
      where: { id: parsed.data.id, userId },
      include: {
        account: { include: { currency: true } },
        counterAccount: { include: { currency: true } },
        currency: true,
        counterCurrency: true,
        debtPayment: true,
        installment: { include: { plan: true } },
      },
    });
    if (!existing) {
      return { success: false, error: "Movimiento no encontrado" };
    }
    if (existing.kind === "ADJUSTMENT") {
      return {
        success: false,
        error:
          "Los ajustes (saldo inicial o arqueos) no se pueden editar",
      };
    }

    const amountMinor = parseAmountToMinor(parsed.data.amount, existing.currency);
    if (amountMinor <= 0) {
      return { success: false, error: "El monto debe ser mayor que cero" };
    }
    if (amountMinor > PRISMA_INT_MAX) {
      return { success: false, error: "Monto demasiado grande" };
    }

    const isTransfer = existing.kind === "TRANSFER";
    // Lado contrario: en TRANSFER siempre hay (igual al monto si comparten
    // moneda); en INCOME/EXPENSE solo si la operación fue multi-moneda. En
    // transferencias la moneda contraria se deriva de la cuenta destino
    // (transferencias viejas pueden tener counterCurrencyId null).
    let counterAmountMinor: number | null = null;
    let rateScaled: number | null = null;
    const counterCurrency = isTransfer
      ? existing.counterAccount &&
        existing.counterAccount.currencyId !== existing.currencyId
        ? existing.counterAccount.currency
        : null
      : existing.counterCurrencyId &&
          existing.counterCurrencyId !== existing.currencyId
        ? existing.counterCurrency
        : null;
    const crossCurrency = !!counterCurrency;

    if (isTransfer && !crossCurrency) {
      counterAmountMinor = amountMinor;
    } else if (counterCurrency) {
      if (!parsed.data.counterAmount) {
        return {
          success: false,
          error: `Indica el monto en ${counterCurrency.code}`,
        };
      }
      counterAmountMinor = parseAmountToMinor(
        parsed.data.counterAmount,
        counterCurrency
      );
      if (counterAmountMinor <= 0) {
        return { success: false, error: "El monto debe ser mayor que cero" };
      }
      if (counterAmountMinor > PRISMA_INT_MAX) {
        return { success: false, error: "Monto demasiado grande" };
      }
      // Tasa implícita informativa, igual que al registrar.
      rateScaled = impliedRateScaled(
        amountMinor,
        existing.currency,
        counterAmountMinor,
        counterCurrency
      );
    }

    let categoryId = existing.categoryId;
    if (!isTransfer && parsed.data.categoryId !== undefined) {
      if (parsed.data.categoryId === null) {
        categoryId = null;
      } else {
        const category = await db.category.findFirst({
          where: { id: parsed.data.categoryId, userId },
        });
        if (!category || category.kind !== existing.kind) {
          return { success: false, error: "Categoría no válida" };
        }
        categoryId = category.id;
      }
    }

    // Desglose por lado sobre los montos NUEVOS; reemplaza al existente.
    const originCheck = await checkDenominationLines(
      db,
      userId,
      existing.account,
      parsed.data.denominationLines,
      amountMinor
    );
    if (!originCheck.ok) return { success: false, error: originCheck.error };

    let destLines: DenominationLineInput[] = [];
    if (isTransfer && existing.counterAccount) {
      const destCheck = await checkDenominationLines(
        db,
        userId,
        existing.counterAccount,
        parsed.data.counterDenominationLines,
        counterAmountMinor ?? amountMinor
      );
      if (!destCheck.ok) return { success: false, error: destCheck.error };
      destLines = destCheck.lines;
    }

    await inTx(db, async (tx) => {
      // Movimiento nacido de un abono/cuota: el DebtPayment acompaña al
      // monto y el pendiente se relee AQUÍ dentro (patrón anti doble-envío).
      const payment = existing.debtPayment;
      if (payment && amountMinor !== payment.amountMinor) {
        await lockDebt(tx, payment.debtId);
        const remaining = await debtRemainingMinor(payment.debtId, tx);
        const available = remaining + payment.amountMinor;
        if (amountMinor > available) {
          throw new ActionError(
            `El monto supera el pendiente de la deuda (${fmtMinor(available, existing.currency)})`
          );
        }
        await tx.debtPayment.update({
          where: { id: payment.id },
          data: { amountMinor },
        });
        const debt = await tx.debt.findUnique({
          where: { id: payment.debtId },
          select: { status: true },
        });
        if (debt && debt.status !== "CANCELLED") {
          const settled = amountMinor === available;
          await tx.debt.update({
            where: { id: payment.debtId },
            data: { status: settled ? "PAID" : "OPEN" },
          });
          // Igual que un abono que salda: sin esto el plan seguía activo con
          // una cuota pendiente imposible de pagar (pendiente 0).
          if (settled) await closeDebtPlans(tx, userId, payment.debtId);
        }
      }
      if (payment) {
        await tx.debtPayment.update({
          where: { id: payment.id },
          data: { paidAt: parsed.data.occurredAt },
        });
      }

      await tx.transactionDenomination.deleteMany({
        where: { transactionId: existing.id },
      });
      await tx.transaction.update({
        where: { id: existing.id },
        data: {
          amountMinor,
          counterAmountMinor,
          rateScaled,
          categoryId,
          note: parsed.data.note || null,
          occurredAt: parsed.data.occurredAt,
          denominationLines: {
            create: [
              ...originCheck.lines.map((line) => ({
                accountId: existing.accountId,
                denominationId: line.denominationId,
                quantity: line.quantity,
              })),
              ...destLines.map((line) => ({
                accountId: existing.counterAccountId!,
                denominationId: line.denominationId,
                quantity: line.quantity,
              })),
            ],
          },
        },
      });
    });

    const debtIds: string[] = [];
    if (existing.debtPayment) debtIds.push(existing.debtPayment.debtId);
    if (existing.installment?.plan.debtId) {
      debtIds.push(existing.installment.plan.debtId);
    }
    return {
      success: true,
      data: {
        id: existing.id,
        touched: {
          accountIds: accountIdsOf(existing),
          debtIds,
          planIds: existing.installment ? [existing.installment.planId] : [],
        },
      },
    };
  } catch (error) {
    if (error instanceof ActionError) {
      return { success: false, error: error.message };
    }
    return unexpectedFailure("updateTransaction", error, "No se pudo actualizar el movimiento");
  }
}

/**
 * Elimina un movimiento (los saldos se recalculan solos al ser derivados).
 * El ajuste de un arqueo no se elimina por separado (romperia el arqueo).
 * Si el movimiento era un abono, el DebtPayment se borra antes (FK Restrict)
 * y el pendiente de la deuda reaparece; una cuota vinculada conserva su
 * estado y solo pierde el vínculo (SetNull), igual que al eliminar cuentas.
 * Deja lápida "transaction" para el pull móvil (sus hijos caen en cascada).
 *
 * `touched.debtIds` = deuda del abono (si hay); `touched.planIds` = plan de
 * la cuota vinculada (si hay).
 */
export async function deleteTransaction(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<{ touched: MovementTouched }>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const existing = await db.transaction.findFirst({
      where: { id: parsed.data, userId },
      include: {
        cashCount: { select: { id: true } },
        debtPayment: true,
        installment: { select: { id: true, planId: true } },
      },
    });
    if (!existing) {
      return { success: false, error: "Movimiento no encontrado" };
    }
    if (existing.cashCount) {
      return {
        success: false,
        error: "Este ajuste proviene de un arqueo y no se puede eliminar",
      };
    }

    await inTx(db, async (tx) => {
      if (existing.debtPayment) {
        await tx.debtPayment.delete({ where: { id: existing.debtPayment.id } });
        // El pendiente reaparece: una deuda saldada vuelve a estar abierta.
        await tx.debt.updateMany({
          where: { id: existing.debtPayment.debtId, status: "PAID" },
          data: { status: "OPEN" },
        });
      }
      // Desgloses por Cascade; Installment.transactionId queda en null.
      await tx.transaction.delete({ where: { id: existing.id } });
      await recordTombstone(tx, userId, "transaction", existing.id);
    });

    return {
      success: true,
      data: {
        touched: {
          accountIds: accountIdsOf(existing),
          debtIds: existing.debtPayment ? [existing.debtPayment.debtId] : [],
          planIds: existing.installment ? [existing.installment.planId] : [],
        },
      },
    };
  } catch (error) {
    return unexpectedFailure("deleteTransaction", error, "No se pudo eliminar el movimiento");
  }
}

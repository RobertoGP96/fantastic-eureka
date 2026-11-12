// Servicio de cuentas. Lógica extraída de src/app/actions/account-actions.ts
// sin cambios de comportamiento: mismas validaciones y mismos mensajes.

import { parseAmountToMinor, PRISMA_INT_MAX } from "@/lib/money";
import { ACCOUNT_ICON_NAMES } from "@/lib/account-icons";
import { isCashLikeType, isDigitalCurrencyKind } from "@/lib/domain";
import {
  accountIconSchema,
  createAccountSchema,
  idSchema,
  updateAccountSchema,
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
 * Opciones de createAccount. Además del id de la cuenta, el móvil manda el
 * id del movimiento ADJUSTMENT de saldo inicial: lo creó offline con su
 * propio id y ambos lados deben referirse a la misma fila.
 */
export interface CreateAccountOptions extends CreateOptions {
  initialTransactionId?: string;
}

export async function createAccount(
  { db, userId }: ServiceContext,
  input: unknown,
  options: CreateAccountOptions = {}
): Promise<ActionResult<{ id: string }>> {
  const parsed = createAccountSchema.safeParse(input);
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
    // Una moneda digital no existe en efectivo: sin cuentas de caja/efectivo.
    if (isCashLikeType(parsed.data.type) && isDigitalCurrencyKind(currency.kind)) {
      return {
        success: false,
        error: `${currency.code} es digital: usa una cuenta de tipo Banco o Digital`,
      };
    }

    if (parsed.data.groupId) {
      const group = await db.accountGroup.findFirst({
        where: { id: parsed.data.groupId, userId },
      });
      if (!group) return { success: false, error: "Grupo no válido" };
    }

    if (parsed.data.icon && !ACCOUNT_ICON_NAMES.includes(parsed.data.icon)) {
      return { success: false, error: "Icono no válido" };
    }

    const initialMinor = parsed.data.initialAmount
      ? parseAmountToMinor(parsed.data.initialAmount, currency)
      : 0;
    if (initialMinor > PRISMA_INT_MAX) {
      return { success: false, error: "Saldo inicial demasiado grande" };
    }

    // Cuenta y saldo inicial en una sola transacción: sin cuentas a medias.
    const account = await inTx(db, async (tx) => {
      const created = await tx.account.create({
        data: {
          id: clientIdOrUndefined(options.id),
          name: parsed.data.name,
          type: parsed.data.type,
          currencyId: currency.id,
          groupId: parsed.data.groupId,
          icon: parsed.data.icon,
          userId,
        },
      });
      if (initialMinor !== 0) {
        await tx.transaction.create({
          data: {
            id: clientIdOrUndefined(options.initialTransactionId),
            kind: "ADJUSTMENT",
            accountId: created.id,
            amountMinor: initialMinor,
            currencyId: currency.id,
            note: "Saldo inicial",
            userId,
          },
        });
      }
      return created;
    });

    return { success: true, data: { id: account.id } };
  } catch (error) {
    return unexpectedFailure("createAccount", error, "No se pudo crear la cuenta");
  }
}

export async function setAccountIcon(
  { db, userId }: ServiceContext,
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
    const account = await db.account.update({
      where: { id: parsed.data.accountId, userId },
      data: { icon: parsed.data.icon },
    });
    return { success: true, data: { id: account.id } };
  } catch (error) {
    return unexpectedFailure("setAccountIcon", error, "No se pudo actualizar el icono");
  }
}

export async function updateAccount(
  { db, userId }: ServiceContext,
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
    const account = await db.account.update({
      where: { id: parsed.data.id, userId },
      data: {
        name: parsed.data.name,
        ...(parsed.data.archived === undefined
          ? {}
          : { archived: parsed.data.archived }),
      },
    });
    return { success: true, data: { id: account.id } };
  } catch (error) {
    return unexpectedFailure("updateAccount", error, "No se pudo actualizar la cuenta");
  }
}

// Eliminar la cuenta borra en cascada TODO su historial: movimientos donde
// participa por cualquiera de los dos lados (incluidas transferencias con
// otras cuentas), arqueos y abonos vinculados a esos movimientos. El UI pide
// confirmación explícita antes de llamar aquí; la alternativa que conserva
// el historial sigue siendo archivar.
export async function deleteAccount(
  { db, userId }: ServiceContext,
  input: unknown
): Promise<ActionResult<undefined>> {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  try {
    const account = await db.account.findFirst({
      where: { id: parsed.data, userId },
    });
    if (!account) return { success: false, error: "Cuenta no encontrada" };

    const touchesAccount = {
      OR: [{ accountId: account.id }, { counterAccountId: account.id }],
    };

    // Orden dictado por las claves foráneas: DebtPayment.transactionId es
    // Restrict (hay que borrar el abono antes que su movimiento — la deuda
    // vuelve a mostrar ese pendiente al ser derivado), mientras que
    // Installment.transactionId es SetNull (la cuota saldada conserva su
    // estado, solo pierde el vínculo). Los desgloses de denominaciones y las
    // líneas de arqueo caen por Cascade.
    await inTx(db, async (tx) => {
      await tx.cashCount.deleteMany({ where: { accountId: account.id } });
      const affectedDebts = await tx.debtPayment.findMany({
        where: { transaction: touchesAccount },
        select: { debtId: true },
        distinct: ["debtId"],
      });
      await tx.debtPayment.deleteMany({
        where: { transaction: touchesAccount },
      });
      // Igual que deleteTransaction: al perder abonos, una deuda SALDADA
      // vuelve a estar abierta. Sin esto quedaba «Saldada · abonado 0» y sin
      // forma de abonarle (las CANCELLED no se tocan).
      if (affectedDebts.length > 0) {
        await tx.debt.updateMany({
          where: {
            id: { in: affectedDebts.map((payment) => payment.debtId) },
            userId,
            status: "PAID",
          },
          data: { status: "OPEN" },
        });
      }
      await tx.transaction.deleteMany({
        where: { userId, ...touchesAccount },
      });
      // Debt.accountId y PaymentPlan.accountId quedan en null (onDelete: SetNull).
      await tx.account.delete({ where: { id: account.id } });
      // Solo la lápida raíz: el móvil replica las mismas cascadas.
      await recordTombstone(tx, userId, "account", account.id);
    });

    return { success: true, data: undefined };
  } catch (error) {
    return unexpectedFailure("deleteAccount", error, "No se pudo eliminar la cuenta");
  }
}

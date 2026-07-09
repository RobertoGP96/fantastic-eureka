"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  convertMinor,
  convertMinorInverse,
  impliedRateScaled,
  parseAmountToMinor,
  PRISMA_INT_MAX,
} from "@/lib/money";
import { getSessionUser } from "@/lib/auth";
import { fmtMinor } from "@/lib/format";
import {
  incomeExpenseSchema,
  transferSchema,
  type ActionResult,
} from "@/lib/schemas";

function revalidateMovementPaths(accountIds: string[]) {
  revalidatePath("/");
  revalidatePath("/cuentas");
  revalidatePath("/movimientos");
  for (const id of accountIds) revalidatePath(`/cuentas/${id}`);
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

  const denominations = await prisma.denomination.findMany({
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

export async function registerIncomeExpense(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = incomeExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const account = await prisma.account.findFirst({
      where: { id: parsed.data.accountId, userId: user.id },
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
      const opCurrency = await prisma.currency.findFirst({
        where: { id: parsed.data.amountCurrencyId, userId: user.id },
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
    }

    if (parsed.data.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: parsed.data.categoryId, userId: user.id },
      });
      if (!category || category.kind !== parsed.data.kind) {
        return { success: false, error: "Categoría no válida" };
      }
    }

    // El desglose va en la moneda de la cuenta: en operaciones multi-moneda
    // debe cuadrar con el monto YA convertido (amountMinor).
    const linesCheck = await checkDenominationLines(
      user.id,
      account,
      parsed.data.denominationLines,
      amountMinor
    );
    if (!linesCheck.ok) {
      return { success: false, error: linesCheck.error };
    }

    const transaction = await prisma.transaction.create({
      data: {
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
        userId: user.id,
        denominationLines: {
          create: linesCheck.lines.map((line) => ({
            accountId: account.id,
            denominationId: line.denominationId,
            quantity: line.quantity,
          })),
        },
      },
    });

    revalidateMovementPaths([account.id]);
    return { success: true, data: { id: transaction.id } };
  } catch (error) {
    console.error("registerIncomeExpense:", error);
    return { success: false, error: "No se pudo registrar el movimiento" };
  }
}

export async function registerTransfer(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

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
      prisma.account.findFirst({
        where: { id: parsed.data.accountId, userId: user.id },
        include: { currency: true },
      }),
      prisma.account.findFirst({
        where: { id: parsed.data.counterAccountId, userId: user.id },
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
        user.id,
        from,
        parsed.data.denominationLines,
        amountMinor
      ),
      checkDenominationLines(
        user.id,
        to,
        parsed.data.counterDenominationLines,
        counterAmountMinor
      ),
    ]);
    if (!fromLines.ok) return { success: false, error: fromLines.error };
    if (!toLines.ok) return { success: false, error: toLines.error };

    const transaction = await prisma.transaction.create({
      data: {
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
        userId: user.id,
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

    revalidateMovementPaths([from.id, to.id]);
    return { success: true, data: { id: transaction.id } };
  } catch (error) {
    console.error("registerTransfer:", error);
    return { success: false, error: "No se pudo registrar la transferencia" };
  }
}

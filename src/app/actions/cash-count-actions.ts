"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { accountBalanceMinor } from "@/lib/balances";
import { sumMinor } from "@/lib/money";
import { getSessionUser } from "@/lib/auth";
import { cashCountSchema, type ActionResult } from "@/lib/schemas";
import { isCashLikeType } from "@/lib/domain";

export async function createCashCount(
  input: unknown
): Promise<ActionResult<{ id: string; differenceMinor: number }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "Tu sesión ha expirado. Vuelve a iniciar sesión." };
  }

  const parsed = cashCountSchema.safeParse(input);
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
    if (!account || account.archived || !isCashLikeType(account.type)) {
      return { success: false, error: "Solo se pueden arquear cajas de efectivo" };
    }

    const denominations = await prisma.denomination.findMany({
      where: {
        currencyId: account.currencyId,
        active: true,
        currency: { userId: user.id },
      },
    });
    const byId = new Map(denominations.map((d) => [d.id, d]));

    for (const line of parsed.data.lines) {
      if (!byId.has(line.denominationId)) {
        return { success: false, error: "Denominación no válida para esta moneda" };
      }
    }

    const totalMinor = sumMinor(
      parsed.data.lines.map(
        (line) => byId.get(line.denominationId)!.valueMinor * line.quantity
      )
    );
    const storedLines = parsed.data.lines.filter((line) => line.quantity > 0);

    const { cashCount, differenceMinor } = await prisma.$transaction(async (tx) => {
      // Saldo teórico leído dentro de la transacción: la diferencia guardada
      // es coherente aunque llegue otro movimiento concurrente.
      const expectedMinor = await accountBalanceMinor(account.id, tx);
      const differenceMinor = totalMinor - expectedMinor;

      const created = await tx.cashCount.create({
        data: {
          accountId: account.id,
          totalMinor,
          expectedMinor,
          differenceMinor,
          note: parsed.data.note || undefined,
          userId: user.id,
          lines: {
            create: storedLines.map((line) => ({
              denominationId: line.denominationId,
              quantity: line.quantity,
            })),
          },
        },
      });

      if (parsed.data.createAdjustment && differenceMinor !== 0) {
        const adjustment = await tx.transaction.create({
          data: {
            kind: "ADJUSTMENT",
            accountId: account.id,
            amountMinor: differenceMinor,
            currencyId: account.currencyId,
            note: "Ajuste por arqueo",
            userId: user.id,
          },
        });
        await tx.cashCount.update({
          where: { id: created.id },
          data: { adjustmentTxId: adjustment.id },
        });
      }

      return { cashCount: created, differenceMinor };
    });

    revalidatePath("/");
    revalidatePath("/cuentas");
    revalidatePath(`/cuentas/${account.id}`);
    revalidatePath("/conteo");
    revalidatePath(`/conteo/${account.id}`);
    revalidatePath("/movimientos");
    return { success: true, data: { id: cashCount.id, differenceMinor } };
  } catch (error) {
    console.error("createCashCount:", error);
    return { success: false, error: "No se pudo guardar el arqueo" };
  }
}

import { notFound, redirect } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { minorToAmountInput } from "@/lib/money";
import { accountDenominationStock } from "@/lib/denominations";
import type { BreakdownDenomination } from "@/components/denomination-breakdown-field";
import { EditTransactionForm } from "./edit-transaction-form";

export const dynamic = "force-dynamic";

/**
 * Denominaciones de una caja CASH_BOX para el formulario de edición. Como el
 * desglose nuevo REEMPLAZA al viejo, en salidas se devuelve al stock lo que
 * este movimiento ya había sacado (addBack) antes de limitar sugerencias.
 */
async function editableBoxDenoms(
  userId: string,
  accountId: string,
  oldQuantities: Record<string, number>,
  addBack: boolean
): Promise<BreakdownDenomination[]> {
  const stock = await accountDenominationStock(userId, accountId);
  return stock.lines
    .filter(
      (line) =>
        line.active ||
        line.quantity > 0 ||
        (oldQuantities[line.denominationId] ?? 0) > 0
    )
    .map((line) => ({
      id: line.denominationId,
      valueMinor: line.valueMinor,
      kind: line.kind,
      available: Math.max(
        0,
        line.quantity +
          (addBack ? (oldQuantities[line.denominationId] ?? 0) : 0)
      ),
    }));
}

export default async function EditarMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;

  const tx = await prisma.transaction.findFirst({
    where: { id, userId: user.id },
    include: {
      account: { include: { currency: true } },
      counterAccount: { include: { currency: true } },
      currency: true,
      counterCurrency: true,
      debtPayment: { select: { id: true } },
      installment: { select: { id: true } },
      denominationLines: {
        select: { accountId: true, denominationId: true, quantity: true },
      },
    },
  });
  if (!tx) notFound();
  // Los ajustes (saldo inicial/arqueos) no se editan; el detalle tampoco
  // ofrece el botón, esto cubre la URL directa.
  if (tx.kind === "ADJUSTMENT") redirect(`/movimientos/${id}`);

  const isTransfer = tx.kind === "TRANSFER";
  // Moneda del "otro lado": destino en transferencias entre monedas, o la
  // divisa original en INCOME/EXPENSE multi-moneda (mismo criterio que la
  // action; en transferencias viejas counterCurrencyId puede venir null).
  const counterCurrency = isTransfer
    ? tx.counterAccount && tx.counterAccount.currencyId !== tx.currencyId
      ? tx.counterAccount.currency
      : null
    : tx.counterCurrencyId && tx.counterCurrencyId !== tx.currencyId
      ? tx.counterCurrency
      : null;

  const categories = isTransfer
    ? []
    : await prisma.category.findMany({
        where: { active: true, userId: user.id, kind: tx.kind },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });

  // Desglose previo por lado (prellenado del formulario).
  const oldLines = (accountId: string): Record<string, number> =>
    Object.fromEntries(
      tx.denominationLines
        .filter((line) => line.accountId === accountId)
        .map((line) => [line.denominationId, line.quantity])
    );
  const originOldLines = oldLines(tx.accountId);
  const destOldLines = tx.counterAccountId ? oldLines(tx.counterAccountId) : {};

  const originDenoms =
    tx.account.type === "CASH_BOX"
      ? await editableBoxDenoms(
          user.id,
          tx.accountId,
          originOldLines,
          tx.kind !== "INCOME"
        )
      : [];
  const destDenoms =
    isTransfer && tx.counterAccount?.type === "CASH_BOX"
      ? await editableBoxDenoms(
          user.id,
          tx.counterAccount.id,
          destOldLines,
          false
        )
      : [];

  const cross = !!counterCurrency;
  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Editar movimiento" backHref={`/movimientos/${id}`} />
      <div className="anim-fade-up px-5 pt-5 md:max-w-md md:px-0">
        <EditTransactionForm
          tx={{
            id: tx.id,
            kind: tx.kind,
            accountName: tx.account.name,
            counterAccountName: tx.counterAccount?.name ?? null,
            currency: {
              code: tx.currency.code,
              decimalPlaces: tx.currency.decimalPlaces,
            },
            counterCurrency: counterCurrency
              ? {
                  code: counterCurrency.code,
                  decimalPlaces: counterCurrency.decimalPlaces,
                }
              : null,
            amount: minorToAmountInput(tx.amountMinor, tx.currency),
            counterAmount:
              cross && tx.counterAmountMinor !== null
                ? minorToAmountInput(tx.counterAmountMinor, counterCurrency!)
                : null,
            categoryId: tx.categoryId,
            note: tx.note ?? "",
            occurredAtISO: tx.occurredAt.toISOString(),
            isLinked: !!tx.debtPayment || !!tx.installment,
          }}
          categories={categories}
          originDenoms={originDenoms}
          destDenoms={destDenoms}
          initialOriginLines={originOldLines}
          initialDestLines={destOldLines}
        />
      </div>
    </main>
  );
}

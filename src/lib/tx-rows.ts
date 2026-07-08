import "server-only";

import { TRANSACTION_KIND_LABELS, type TransactionKind } from "@/lib/domain";
import { fmtMinor } from "@/lib/format";
import type { TxRow } from "@/components/tx-list";

interface TxWithRelations {
  id: string;
  kind: string;
  amountMinor: number;
  counterAmountMinor: number | null;
  note: string | null;
  occurredAt: Date;
  accountId: string;
  account: { name: string };
  counterAccount: { name: string } | null;
  currency: { code: string; decimalPlaces: number };
  counterCurrency: { code: string; decimalPlaces: number } | null;
  category: { name: string } | null;
}

function kindLabel(kind: string): string {
  return TRANSACTION_KIND_LABELS[kind as TransactionKind] ?? kind;
}

/**
 * Convierte una transacción en fila de historial desde la perspectiva de una
 * cuenta (signo relativo a ella) o global (perspectiveAccountId undefined:
 * signo del movimiento en su cuenta de origen).
 */
export function toTxRow(
  tx: TxWithRelations,
  perspectiveAccountId?: string,
  perspectiveCurrency?: { code: string; decimalPlaces: number }
): TxRow {
  const isIncoming =
    perspectiveAccountId !== undefined &&
    tx.kind === "TRANSFER" &&
    tx.accountId !== perspectiveAccountId;

  let amountMinor: number;
  let currency = tx.currency;
  let title: string;

  if (tx.kind === "TRANSFER") {
    if (isIncoming) {
      amountMinor = tx.counterAmountMinor ?? 0;
      currency = perspectiveCurrency ?? tx.currency;
      title = `Desde ${tx.account.name}`;
    } else {
      amountMinor = -tx.amountMinor;
      title = `Hacia ${tx.counterAccount?.name ?? "otra cuenta"}`;
    }
  } else if (tx.kind === "EXPENSE") {
    amountMinor = -tx.amountMinor;
    title = tx.category?.name ?? kindLabel(tx.kind);
  } else if (tx.kind === "INCOME") {
    amountMinor = tx.amountMinor;
    title = tx.category?.name ?? kindLabel(tx.kind);
  } else {
    // ADJUSTMENT lleva el signo en amountMinor
    amountMinor = tx.amountMinor;
    title = tx.note ?? kindLabel(tx.kind);
  }

  const subtitleParts: string[] = [];
  if (perspectiveAccountId === undefined) subtitleParts.push(tx.account.name);
  // Ingreso/gasto multi-moneda: se muestra el monto original de la operación
  // (el principal ya va convertido a la moneda de la cuenta).
  if (
    (tx.kind === "INCOME" || tx.kind === "EXPENSE") &&
    tx.counterAmountMinor !== null &&
    tx.counterCurrency
  ) {
    subtitleParts.push(fmtMinor(tx.counterAmountMinor, tx.counterCurrency));
  }
  if (tx.note && title !== tx.note) subtitleParts.push(tx.note);

  return {
    id: tx.id,
    kind: tx.kind,
    title,
    subtitle: subtitleParts.join(" · "),
    occurredAt: tx.occurredAt,
    amountMinor,
    currency,
  };
}

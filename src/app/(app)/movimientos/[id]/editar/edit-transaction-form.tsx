"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTransaction } from "@/app/actions/transaction-actions";
import { parseAmountToMinor } from "@/lib/money";
import { countedTotalMinor } from "@/lib/counting";
import {
  DenominationBreakdownField,
  type BreakdownDenomination,
} from "@/components/denomination-breakdown-field";
import { TRANSACTION_KIND_LABELS, type TransactionKind } from "@/lib/domain";
import { useUI } from "@/lib/ui-store";

// Radix Select no admite value "": valor especial para «Sin categoría».
const NO_CATEGORY = "__none__";

const todayISO = () => new Date().toISOString().slice(0, 10);

const toLocalDateISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export interface EditableTx {
  id: string;
  kind: string;
  accountName: string;
  counterAccountName: string | null;
  currency: { code: string; decimalPlaces: number };
  /** Moneda del otro lado; null si el movimiento no cruza monedas. */
  counterCurrency: { code: string; decimalPlaces: number } | null;
  amount: string;
  counterAmount: string | null;
  categoryId: string | null;
  note: string;
  occurredAtISO: string;
  /** Nació de un abono o cuota: el pendiente de la deuda acompaña al monto. */
  isLinked: boolean;
}

export function EditTransactionForm({
  tx,
  categories,
  originDenoms,
  destDenoms,
  initialOriginLines,
  initialDestLines,
}: {
  tx: EditableTx;
  categories: { id: string; name: string }[];
  originDenoms: BreakdownDenomination[];
  destDenoms: BreakdownDenomination[];
  initialOriginLines: Record<string, number>;
  initialDestLines: Record<string, number>;
}) {
  const router = useRouter();
  const { showToast } = useUI();

  const occurredAt = new Date(tx.occurredAtISO);
  const isTransfer = tx.kind === "TRANSFER";
  const cross = !!tx.counterCurrency;

  const [amount, setAmount] = useState(tx.amount);
  const [counterAmount, setCounterAmount] = useState(tx.counterAmount ?? "");
  const [categoryId, setCategoryId] = useState(tx.categoryId ?? NO_CATEGORY);
  const [note, setNote] = useState(tx.note);
  const [date, setDate] = useState(toLocalDateISO(occurredAt));
  const [originLines, setOriginLines] = useState(initialOriginLines);
  const [destLines, setDestLines] = useState(initialDestLines);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const safeMinor = (
    text: string,
    cur: { decimalPlaces: number }
  ): number | null => {
    try {
      const minor = parseAmountToMinor(text, cur);
      return minor > 0 ? minor : null;
    } catch {
      return null;
    }
  };

  // El monto de cada lado va SIEMPRE en la moneda de su cuenta (aquí se
  // edita directo, sin conversión: la tasa implícita la recalcula la action).
  const originTarget = safeMinor(amount, tx.currency);
  const destTarget = cross
    ? tx.counterCurrency
      ? safeMinor(counterAmount, tx.counterCurrency)
      : null
    : originTarget;

  const originBreakdownOk =
    originDenoms.length === 0 ||
    (originTarget !== null &&
      countedTotalMinor(originDenoms, originLines) === originTarget);
  const destBreakdownOk =
    destDenoms.length === 0 ||
    (destTarget !== null &&
      countedTotalMinor(destDenoms, destLines) === destTarget);

  const linesPayload = (
    lines: Record<string, number>
  ): { denominationId: string; quantity: number }[] | undefined => {
    const entries = Object.entries(lines)
      .filter(([, qty]) => qty > 0)
      .map(([denominationId, quantity]) => ({ denominationId, quantity }));
    return entries.length > 0 ? entries : undefined;
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    // Fecha elegida conservando la hora original: el movimiento mantiene su
    // posición entre los del mismo día.
    const [y, m, d] = date.split("-").map(Number);
    const newOccurredAt = new Date(
      y,
      m - 1,
      d,
      occurredAt.getHours(),
      occurredAt.getMinutes(),
      occurredAt.getSeconds(),
      occurredAt.getMilliseconds()
    );

    const result = await updateTransaction({
      id: tx.id,
      amount,
      counterAmount: cross ? counterAmount : undefined,
      categoryId: isTransfer
        ? undefined
        : categoryId === NO_CATEGORY
          ? null
          : categoryId,
      note: note.trim() || undefined,
      occurredAt: newOccurredAt,
      denominationLines: originDenoms.length
        ? linesPayload(originLines)
        : undefined,
      counterDenominationLines: destDenoms.length
        ? linesPayload(destLines)
        : undefined,
    });

    setSaving(false);
    if (result.success) {
      showToast("Movimiento actualizado");
      router.push(`/movimientos/${tx.id}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const kindLabel =
    TRANSACTION_KIND_LABELS[tx.kind as TransactionKind] ?? tx.kind;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="rounded-[16px] border border-line bg-white px-4 py-3 text-[12.5px] text-ink-soft">
        <span className="font-semibold text-navy">{kindLabel}</span>
        {" · "}
        {isTransfer && tx.counterAccountName
          ? `${tx.accountName} → ${tx.counterAccountName}`
          : tx.accountName}
        <div className="mt-1 text-[11.5px] text-muted">
          El tipo y las cuentas no se cambian: si te equivocaste de cuenta,
          elimina el movimiento y regístralo de nuevo.
        </div>
        {tx.isLinked && (
          <div className="mt-1 text-[11.5px] text-muted">
            Este movimiento nació de un abono o cuota: al cambiar el monto se
            actualiza también el pendiente de la deuda.
          </div>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          {isTransfer ? `Monto enviado (${tx.currency.code})` : `Monto (${tx.currency.code})`}
        </span>
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0"
          required
        />
      </label>

      {cross && tx.counterCurrency && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            {isTransfer
              ? `Monto recibido (${tx.counterCurrency.code})`
              : `Monto original (${tx.counterCurrency.code})`}
          </span>
          <Input
            value={counterAmount}
            onChange={(e) => setCounterAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            required
          />
          <span className="text-[11.5px] text-muted">
            {isTransfer
              ? "Lo que entra en la cuenta de destino; la tasa implícita se recalcula."
              : `La operación se anotó en ${tx.counterCurrency.code}; la tasa implícita se recalcula.`}
          </span>
        </label>
      )}

      {originDenoms.length > 0 && (
        <DenominationBreakdownField
          title={
            tx.kind === "INCOME"
              ? `Entra en «${tx.accountName}» (denominaciones)`
              : `Sale de «${tx.accountName}» (denominaciones)`
          }
          denominations={originDenoms}
          currency={tx.currency}
          targetMinor={originTarget}
          quantities={originLines}
          onQtyChange={setOriginLines}
          outflow={tx.kind !== "INCOME"}
        />
      )}

      {destDenoms.length > 0 && tx.counterAccountName && (
        <DenominationBreakdownField
          title={`Entra en «${tx.counterAccountName}» (denominaciones)`}
          denominations={destDenoms}
          currency={tx.counterCurrency ?? tx.currency}
          targetMinor={destTarget}
          quantities={destLines}
          onQtyChange={setDestLines}
          outflow={false}
        />
      )}

      {!isTransfer && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Categoría (opcional)
          </span>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Fecha
          </span>
          <Input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Nota (opcional)
          </span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Detalle"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={
          saving ||
          !amount.trim() ||
          (cross && !counterAmount.trim()) ||
          !originBreakdownOk ||
          !destBreakdownOk
        }
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

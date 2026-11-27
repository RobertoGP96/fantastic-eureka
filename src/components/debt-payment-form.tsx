"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FORM_DRAWER_FORM,
  FormDrawerBody,
  FormDrawerFooter,
  useFormDrawer,
} from "@/components/form-drawer";
import { Field, FormError } from "@/components/form-field";
import { registerDebtPayment } from "@/app/actions/debt-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

interface AccountOption {
  id: string;
  name: string;
}

/** Abono a una deuda (vive en un drawer del detalle de la deuda). */
export function DebtPaymentForm({
  debtId,
  accounts,
  currencyCode,
  remainingLabel,
  defaultAccountId,
}: {
  debtId: string;
  accounts: AccountOption[];
  currencyCode: string;
  /** Pendiente ya formateado («2 000 CUP»), como referencia. */
  remainingLabel: string;
  defaultAccountId?: string | null;
}) {
  const { showToast } = useUI();
  const { setBusy, close } = useFormDrawer();
  // Arranca en la cuenta vinculada a la deuda (si sigue disponible).
  const [accountId, setAccountId] = useState(
    accounts.find((account) => account.id === defaultAccountId)?.id ??
      accounts[0]?.id ??
      ""
  );
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (accounts.length === 0) {
    return (
      <FormDrawerBody>
        <p className="rounded-xl border border-line bg-card px-3.5 py-3 text-sm text-muted">
          Crea una cuenta en {currencyCode} para poder registrar abonos.
        </p>
      </FormDrawerBody>
    );
  }

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);
    const result = await runAction(() =>
      registerDebtPayment({
        debtId,
        accountId,
        amount,
        note: note.trim() || undefined,
      })
    );
    if (result.success) {
      // `saving` sigue en true mientras se cierra: un segundo toque no
      // registra otro abono.
      showToast(result.data.settled ? "Deuda saldada 🎉" : "Abono registrado");
      close();
    } else {
      setSaving(false);
      setBusy(false);
      setError(result.error);
    }
  };

  return (
    <form
      className={FORM_DRAWER_FORM}
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <FormDrawerBody>
        <p className="text-sm text-muted">
          Pendiente:{" "}
          <span className="money font-semibold text-heading">
            {remainingLabel}
          </span>
        </p>
        <Field label={`Monto (${currencyCode})`}>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            required
          />
        </Field>
        <Field label="Cuenta">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger variant="form" className="w-full">
              <SelectValue placeholder="Cuenta" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Nota (opcional)">
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Detalle del abono"
          />
        </Field>
        <FormError>{error}</FormError>
      </FormDrawerBody>
      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={saving || !amount.trim() || !accountId}
        >
          {saving ? "Guardando…" : "Registrar abono"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

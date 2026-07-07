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
import { registerDebtPayment } from "@/app/actions/debt-actions";
import { useUI } from "@/lib/ui-store";

interface AccountOption {
  id: string;
  name: string;
}

export function PaymentForm({
  debtId,
  accounts,
  currencyCode,
  defaultAccountId,
}: {
  debtId: string;
  accounts: AccountOption[];
  currencyCode: string;
  defaultAccountId?: string | null;
}) {
  const router = useRouter();
  const { showToast } = useUI();
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
      <p className="rounded-[13px] border border-line bg-white px-3.5 py-3 text-[12.5px] text-muted">
        Crea una cuenta en {currencyCode} para poder registrar abonos.
      </p>
    );
  }

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await registerDebtPayment({
      debtId,
      accountId,
      amount,
      note: note.trim() || undefined,
    });
    setSaving(false);
    if (result.success) {
      showToast(result.data.settled ? "Deuda saldada 🎉" : "Abono registrado");
      setAmount("");
      setNote("");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <form
      className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex gap-2.5">
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="h-10 min-w-0 flex-1 rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
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
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder={`Monto (${currencyCode})`}
          className="w-36"
          required
        />
      </div>
      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        placeholder="Nota (opcional)"
      />
      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}
      <Button type="submit" disabled={saving || !amount.trim() || !accountId}>
        {saving ? "Guardando…" : "Registrar abono"}
      </Button>
    </form>
  );
}

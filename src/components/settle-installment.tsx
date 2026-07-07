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
import {
  settleInstallment,
  skipInstallment,
} from "@/app/actions/plan-actions";
import { useUI } from "@/lib/ui-store";

interface AccountOption {
  id: string;
  name: string;
}

export function SettleInstallment({
  installmentId,
  accounts,
  defaultAmount,
  currencyCode,
  kind,
  defaultAccountId,
}: {
  installmentId: string;
  accounts: AccountOption[];
  defaultAmount: string;
  currencyCode: string;
  kind: string;
  defaultAccountId?: string | null;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  // Arranca en la cuenta vinculada al plan/deuda (si sigue disponible).
  const [accountId, setAccountId] = useState(
    accounts.find((account) => account.id === defaultAccountId)?.id ??
      accounts[0]?.id ??
      ""
  );
  const [amount, setAmount] = useState(defaultAmount);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const settle = async () => {
    setSaving(true);
    setError(null);
    const result = await settleInstallment({
      installmentId,
      accountId,
      amount: amount.trim() || undefined,
    });
    setSaving(false);
    if (result.success) {
      showToast(kind === "COLLECT" ? "Cobro registrado" : "Pago registrado");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const skip = async () => {
    setSaving(true);
    setError(null);
    const result = await skipInstallment(installmentId);
    setSaving(false);
    if (result.success) {
      showToast("Cuota omitida");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {accounts.length === 0 ? (
        <p className="text-[11.5px] text-muted">
          Crea una cuenta en {currencyCode} para registrar el{" "}
          {kind === "COLLECT" ? "cobro" : "pago"}.
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-9 min-w-0 flex-1 rounded-[10px] border border-line bg-white px-2.5 text-[12px] text-ink">
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
            aria-label={`Monto en ${currencyCode}`}
            className="h-9 w-24 rounded-[10px] px-2 text-center text-[12px]"
          />
          <Button
            size="sm"
            disabled={saving || !accountId || !amount.trim()}
            onClick={() => void settle()}
          >
            {kind === "COLLECT" ? "Cobrar" : "Pagar"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => void skip()}
          >
            Omitir
          </Button>
        </div>
      )}
      {error && (
        <div className="rounded-[10px] bg-danger-bg px-3 py-2 text-[11.5px] font-medium text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

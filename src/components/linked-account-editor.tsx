"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setDebtAccount } from "@/app/actions/debt-actions";
import { setPlanAccount } from "@/app/actions/plan-actions";
import { useUI } from "@/lib/ui-store";

interface AccountOption {
  id: string;
  name: string;
}

const NO_ACCOUNT = "__none__";

/**
 * Selector de la cuenta vinculada a una deuda o un plan: guarda el cambio al
 * vuelo (null desvincula). La cuenta se preselecciona luego en los
 * formularios de abono y de cuota.
 */
export function LinkedAccountEditor({
  kind,
  targetId,
  accounts,
  currentAccountId,
  currencyCode,
}: {
  kind: "debt" | "plan";
  targetId: string;
  accounts: AccountOption[];
  currentAccountId: string | null;
  currencyCode: string;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [value, setValue] = useState(currentAccountId ?? NO_ACCOUNT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (accounts.length === 0) {
    return (
      <p className="rounded-[13px] border border-line bg-white px-3.5 py-3 text-[12.5px] text-muted">
        Crea una cuenta en {currencyCode} para poder vincularla.
      </p>
    );
  }

  const change = async (next: string) => {
    const previous = value;
    setValue(next);
    setSaving(true);
    setError(null);
    const accountId = next === NO_ACCOUNT ? null : next;
    const result =
      kind === "debt"
        ? await setDebtAccount({ debtId: targetId, accountId })
        : await setPlanAccount({ planId: targetId, accountId });
    setSaving(false);
    if (result.success) {
      showToast(accountId ? "Cuenta vinculada" : "Cuenta desvinculada");
      router.refresh();
    } else {
      setValue(previous);
      setError(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Select value={value} onValueChange={(next) => void change(next)}>
        <SelectTrigger
          disabled={saving}
          className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink"
        >
          <SelectValue placeholder="Cuenta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_ACCOUNT}>Sin cuenta</SelectItem>
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

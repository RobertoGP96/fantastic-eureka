"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
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
 * Cuenta vinculada a una deuda o mensualidad, en UNA sola fila: guarda el
 * cambio al vuelo (null desvincula) y la cuenta queda preseleccionada en los
 * formularios de abono y de cuota. Compacto a propósito: es un ajuste, no una
 * sección — antes ocupaba un bloque con título propio en cada detalle.
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
      <p className="rounded-[14px] border border-line bg-white px-3.5 py-2.5 text-[11.5px] text-muted">
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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-white px-3.5 py-2.5">
        <Wallet className="h-4 w-4 flex-none text-muted-2" />
        <span className="text-[12px] font-medium text-muted">
          Cuenta habitual
        </span>
        <Select value={value} onValueChange={(next) => void change(next)}>
          <SelectTrigger
            disabled={saving}
            aria-label="Cuenta vinculada"
            className="ml-auto max-w-[60%] min-w-0"
          >
            <span className="truncate">
              <SelectValue placeholder="Sin cuenta" />
            </span>
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
      </div>
      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

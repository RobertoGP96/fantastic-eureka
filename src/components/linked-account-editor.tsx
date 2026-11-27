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
 * Cuenta vinculada a una deuda o mensualidad, en UNA sola fila: guarda el
 * cambio al vuelo (null desvincula) y la cuenta queda preseleccionada en los
 * formularios de abono y de cuota. Compacto a propósito: es un ajuste, no una
 * sección — antes ocupaba un bloque con título propio en cada detalle.
 * Sin marco: lo pone quien la monta (va pegada al formulario que la usa).
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
      <p className="text-xs text-muted">
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
      <div className="flex items-center gap-3">
        <span className="flex-none text-xs font-medium text-muted">
          Cuenta habitual
        </span>
        {/* max-w: en columnas anchas (tablet) el selector no se estira de
            lado a lado; ml-auto lo deja pegado a la derecha. */}
        <Select value={value} onValueChange={(next) => void change(next)}>
          <SelectTrigger
            variant="form"
            disabled={saving}
            aria-label="Cuenta vinculada"
            className="ml-auto max-w-64 min-w-0 flex-1"
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
        <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

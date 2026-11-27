"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";
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

/**
 * Saldar (u omitir) una cuota en dos líneas compactas: la cuenta arriba y,
 * debajo, monto + acciones. Se incrusta en filas de lista y en tarjetas
 * estrechas, así que no trae marco propio ni depende del ancho de la página:
 * quien lo monta decide dónde va y cuánto mide.
 */
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
  // Cuenta vinculada al plan/deuda (si sigue disponible): cuando existe, el
  // selector se guarda tras un «Cambiar» — el caso normal es cobrar/pagar
  // desde ella y no hace falta volver a elegirla en cada cuota.
  const linked = accounts.find((account) => account.id === defaultAccountId);
  const [accountId, setAccountId] = useState(
    linked?.id ?? accounts[0]?.id ?? ""
  );
  const [picking, setPicking] = useState(!linked);
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

  if (accounts.length === 0) {
    return (
      <p className="text-xs text-muted">
        Crea una cuenta en {currencyCode} para registrar el{" "}
        {kind === "COLLECT" ? "cobro" : "pago"}.
      </p>
    );
  }

  const selectedName =
    accounts.find((account) => account.id === accountId)?.name ?? "";

  return (
    <div className="flex flex-col gap-2">
      {picking ? (
        // Es el ÚNICO combobox del componente: los tests E2E lo localizan por
        // rol dentro de la sección «Cuotas pendientes».
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger variant="form" aria-label="Cuenta" className="w-full">
            <span className="flex min-w-0 items-center gap-2">
              <Wallet className="size-4 flex-none text-muted" />
              <span className="truncate">
                <SelectValue placeholder="Cuenta" />
              </span>
            </span>
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <Wallet className="size-3.5 flex-none" />
          <span className="min-w-0 truncate">
            {kind === "COLLECT" ? "Entra en" : "Sale de"}{" "}
            <span className="font-medium text-ink-soft">{selectedName}</span>
          </span>
          {/* -my/py: agranda la zona táctil sin separar las dos líneas. */}
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="-my-2 flex-none rounded-md px-1 py-2 font-semibold text-brand-ink transition-colors hover:text-brand-mid focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Cambiar
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        {/* Sin tamaño de letra propio: hereda de Input los 16 px en táctil
            (por debajo de eso iOS amplía la página al enfocar). */}
        <Input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          aria-label={`Monto en ${currencyCode}`}
          className="money w-28 px-3 text-center"
        />
        {/* El texto es exactamente «Cobrar»/«Pagar»: los tests buscan el
            botón por ese nombre. */}
        <Button
          className="flex-1"
          disabled={saving || !accountId || !amount.trim()}
          onClick={() => void settle()}
        >
          {kind === "COLLECT" ? "Cobrar" : "Pagar"}
        </Button>
        <Button
          variant="ghost"
          className="px-3"
          disabled={saving}
          onClick={() => void skip()}
        >
          Omitir
        </Button>
      </div>
      {error && (
        <div className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {error}
        </div>
      )}
    </div>
  );
}

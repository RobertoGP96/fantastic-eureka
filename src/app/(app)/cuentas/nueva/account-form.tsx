"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount } from "@/app/actions/account-actions";
import { IconPicker } from "@/components/icon-picker";
import { useUI } from "@/lib/ui-store";
import { runAction } from "@/lib/run-action";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  isCashLikeType,
  isDigitalCurrencyKind,
} from "@/lib/domain";

interface CurrencyOption {
  id: string;
  code: string;
  name: string;
  kind: string;
}

interface GroupOption {
  id: string;
  name: string;
}

const NO_GROUP = "__none__";

const TYPE_OPTIONS = ACCOUNT_TYPES.map((accountType) => ({
  value: accountType,
  label: ACCOUNT_TYPE_LABELS[accountType],
}));

export function AccountForm({
  currencies,
  groups,
}: {
  currencies: CurrencyOption[];
  groups: GroupOption[];
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("CASH");
  // El tipo inicial es CASH: la moneda por defecto debe ser de efectivo
  // (si la base es digital, p. ej. MLC, el selector salía en blanco).
  const [currencyId, setCurrencyId] = useState(
    (currencies.find((c) => !isDigitalCurrencyKind(c.kind)) ?? currencies[0])
      ?.id ?? ""
  );

  // Las monedas digitales no existen en efectivo: para tipos de caja se
  // ocultan del selector (y la action lo re-valida en el servidor).
  const cashLike = isCashLikeType(type);
  const eligibleCurrencies = cashLike
    ? currencies.filter((c) => !isDigitalCurrencyKind(c.kind))
    : currencies;
  const hiddenDigitalCount = currencies.length - eligibleCurrencies.length;

  const pickType = (nextType: string) => {
    setType(nextType);
    if (
      isCashLikeType(nextType) &&
      isDigitalCurrencyKind(
        currencies.find((c) => c.id === currencyId)?.kind ?? "CASH"
      )
    ) {
      const firstEligible = currencies.find(
        (c) => !isDigitalCurrencyKind(c.kind)
      );
      setCurrencyId(firstEligible?.id ?? "");
    }
  };
  const [groupId, setGroupId] = useState(NO_GROUP);
  const [icon, setIcon] = useState<string | null>(null);
  const [initialAmount, setInitialAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await runAction(() =>
      createAccount({
        name,
        type,
        currencyId,
        initialAmount: initialAmount.trim() || undefined,
        groupId: groupId === NO_GROUP ? undefined : groupId,
        icon: icon ?? undefined,
      })
    );
    if (result.success) {
      // `saving` sigue en true mientras navega: evita una segunda cuenta.
      showToast("Cuenta creada");
      router.push(`/cuentas/${result.data.id}`);
    } else {
      setSaving(false);
      setError(result.error);
    }
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Nombre
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Caja principal, Banco, Tarjeta MLC…"
          maxLength={60}
          required
        />
      </label>

      {/* Tipo e Icono son <div> + <span>, NO <label>: un label alrededor de
          un grupo de botones reenvía el clic al primero. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">Tipo</span>
        <Segmented
          layout="grid"
          ariaLabel="Tipo de cuenta"
          options={TYPE_OPTIONS}
          value={type}
          onValueChange={pickType}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Icono (opcional; si no eliges, se usa el del tipo)
        </span>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {/* Moneda y Grupo comparten fila desde `sm` (breakpoint de viewport a
          propósito: la tarjeta tiene ancho máximo fijo). Sin grupos, Moneda
          ocupa todo el ancho. */}
      <div
        className={cn(
          "grid grid-cols-1 gap-4",
          groups.length > 0 && "sm:grid-cols-2 sm:gap-3"
        )}
      >
        {/* El primer hijo del label es SOLO el rótulo: el test E2E abre el
            selector buscando el texto exacto «Moneda» dentro del label. */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">
            Moneda
          </span>
          <Select value={currencyId} onValueChange={setCurrencyId}>
            <SelectTrigger variant="form" className="w-full">
              <SelectValue placeholder="Elige moneda" />
            </SelectTrigger>
            <SelectContent>
              {eligibleCurrencies.map((currency) => (
                <SelectItem key={currency.id} value={currency.id}>
                  {currency.code} · {currency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {cashLike && hiddenDigitalCount > 0 && (
            <span className="text-xs text-muted">
              Las monedas digitales no aparecen: no existen en efectivo.
            </span>
          )}
        </label>

        {groups.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink-soft">
              Grupo (opcional)
            </span>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger variant="form" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GROUP}>Sin grupo</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
          Saldo inicial (opcional)
        </span>
        <Input
          value={initialAmount}
          onChange={(e) => setInitialAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0"
        />
      </label>

      {error && (
        <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={saving || !name.trim() || !currencyId}
      >
        {saving ? "Creando…" : "Crear cuenta"}
      </Button>
    </form>
  );
}

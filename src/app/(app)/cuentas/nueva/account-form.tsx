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
import { createAccount } from "@/app/actions/account-actions";
import { IconPicker } from "@/components/icon-picker";
import { useUI } from "@/lib/ui-store";
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
  const [currencyId, setCurrencyId] = useState(currencies[0]?.id ?? "");

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
    const result = await createAccount({
      name,
      type,
      currencyId,
      initialAmount: initialAmount.trim() || undefined,
      groupId: groupId === NO_GROUP ? undefined : groupId,
      icon: icon ?? undefined,
    });
    setSaving(false);
    if (result.success) {
      showToast("Cuenta creada");
      router.push(`/cuentas/${result.data.id}`);
    } else {
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
        <span className="text-[12.5px] font-semibold text-ink-soft">
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

      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">Tipo</span>
        <div className="grid grid-cols-2 gap-2">
          {ACCOUNT_TYPES.map((accountType) => (
            <button
              key={accountType}
              type="button"
              onClick={() => pickType(accountType)}
              className={`rounded-[13px] border px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
                type === accountType
                  ? "border-brand bg-chip text-brand"
                  : "border-line bg-white text-ink-soft hover:border-brand-soft"
              }`}
            >
              {ACCOUNT_TYPE_LABELS[accountType]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Icono (opcional; si no eliges, se usa el del tipo)
        </span>
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Moneda
        </span>
        <Select value={currencyId} onValueChange={setCurrencyId}>
          <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
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
          <span className="text-[11.5px] text-muted">
            Las monedas digitales no aparecen: no existen en efectivo.
          </span>
        )}
      </label>

      {groups.length > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Grupo (opcional)
          </span>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
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

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
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
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={saving || !name.trim() || !currencyId}>
        {saving ? "Creando…" : "Crear cuenta"}
      </Button>
    </form>
  );
}

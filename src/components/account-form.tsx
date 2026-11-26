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
import { Field, FIELD_SELECT, FormError } from "@/components/form-field";
import { IconPicker } from "@/components/icon-picker";
import { createAccount } from "@/app/actions/account-actions";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABELS,
  isCashLikeType,
  isDigitalCurrencyKind,
} from "@/lib/domain";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export interface AccountCurrencyOption {
  id: string;
  code: string;
  name: string;
  kind: string;
}

export interface AccountGroupOption {
  id: string;
  name: string;
}

const NO_GROUP = "__none__";

/** Alta de cuenta (vive en el drawer «nueva-cuenta» de /cuentas). */
export function AccountForm({
  currencies,
  groups,
}: {
  currencies: AccountCurrencyOption[];
  groups: AccountGroupOption[];
}) {
  const { showToast } = useUI();
  const { setBusy, closeAndGo } = useFormDrawer();
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("CASH");
  // El tipo inicial es CASH: la moneda por defecto debe ser de efectivo
  // (si la base es digital, p. ej. MLC, el selector salía en blanco).
  const [currencyId, setCurrencyId] = useState(
    (currencies.find((c) => !isDigitalCurrencyKind(c.kind)) ?? currencies[0])
      ?.id ?? ""
  );
  const [groupId, setGroupId] = useState(NO_GROUP);
  const [icon, setIcon] = useState<string | null>(null);
  const [initialAmount, setInitialAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const submit = async () => {
    setSaving(true);
    setBusy(true);
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
      closeAndGo(`/cuentas/${result.data.id}`);
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
        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Caja principal, Banco, Tarjeta MLC…"
            maxLength={60}
            required
          />
        </Field>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-soft">Tipo</span>
          <div
            role="radiogroup"
            aria-label="Tipo de cuenta"
            className="grid grid-cols-2 gap-2"
          >
            {ACCOUNT_TYPES.map((accountType) => (
              <button
                key={accountType}
                type="button"
                role="radio"
                aria-checked={type === accountType}
                onClick={() => pickType(accountType)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                  type === accountType
                    ? "border-brand-ink bg-chip text-brand-ink"
                    : "border-line bg-card text-ink-soft hover:border-brand-soft"
                )}
              >
                {ACCOUNT_TYPE_LABELS[accountType]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink-soft">
            Icono (opcional; si no eliges, se usa el del tipo)
          </span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        <Field
          label="Moneda"
          hint={
            cashLike && hiddenDigitalCount > 0
              ? "Las monedas digitales no aparecen: no existen en efectivo."
              : undefined
          }
        >
          <Select value={currencyId} onValueChange={setCurrencyId}>
            <SelectTrigger className={FIELD_SELECT}>
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
        </Field>

        {groups.length > 0 && (
          <Field label="Grupo (opcional)">
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className={FIELD_SELECT}>
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
          </Field>
        )}

        <Field label="Saldo inicial (opcional)">
          <Input
            value={initialAmount}
            onChange={(e) => setInitialAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
          />
        </Field>

        <FormError>{error}</FormError>
      </FormDrawerBody>

      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={saving || !name.trim() || !currencyId}
        >
          {saving ? "Creando…" : "Crear cuenta"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

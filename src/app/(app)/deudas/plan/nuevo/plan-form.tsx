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
import { createPlan } from "@/app/actions/plan-actions";
import { useUI } from "@/lib/ui-store";
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  PLAN_KINDS,
  PLAN_KIND_LABELS,
} from "@/lib/domain";

interface ContactOption {
  id: string;
  name: string;
}

interface CurrencyOption {
  id: string;
  code: string;
}

interface AccountOption {
  id: string;
  name: string;
  currencyId: string;
}

const NO_CONTACT = "__none__";
const NO_ACCOUNT = "__none_account__";

const todayISO = () => new Date().toISOString().slice(0, 10);

export function PlanForm({
  contacts,
  currencies,
  accounts,
}: {
  contacts: ContactOption[];
  currencies: CurrencyOption[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [kind, setKind] = useState<string>("PAY");
  const [description, setDescription] = useState("");
  const [contactId, setContactId] = useState(NO_CONTACT);
  const [currencyId, setCurrencyId] = useState(currencies[0]?.id ?? "");
  const [accountId, setAccountId] = useState(NO_ACCOUNT);
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("MONTHLY");
  const [firstDueAt, setFirstDueAt] = useState(todayISO());
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Solo cuentas de la moneda elegida: es donde se pagan/cobran las cuotas.
  const currencyAccounts = accounts.filter(
    (account) => account.currencyId === currencyId
  );

  const changeCurrency = (value: string) => {
    setCurrencyId(value);
    const selected = accounts.find((account) => account.id === accountId);
    if (selected && selected.currencyId !== value) setAccountId(NO_ACCOUNT);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await createPlan({
      kind,
      description,
      contactId: contactId === NO_CONTACT ? undefined : contactId,
      currencyId,
      accountId: accountId === NO_ACCOUNT ? undefined : accountId,
      amount,
      frequency,
      firstDueAt: new Date(`${firstDueAt}T12:00:00`),
      endAt: endAt ? new Date(`${endAt}T12:00:00`) : undefined,
    });
    setSaving(false);
    if (result.success) {
      showToast("Plan creado");
      router.push(`/deudas/plan/${result.data.id}`);
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
      <div className="grid grid-cols-2 gap-2">
        {PLAN_KINDS.map((planKind) => (
          <button
            key={planKind}
            type="button"
            onClick={() => setKind(planKind)}
            className={`rounded-[13px] border px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
              kind === planKind
                ? "border-brand bg-chip text-brand"
                : "border-line bg-white text-ink-soft hover:border-brand-soft"
            }`}
          >
            {PLAN_KIND_LABELS[planKind]}
            {planKind === "COLLECT" ? " (me pagan)" : " (yo pago)"}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Descripción
        </span>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Renta, mensualidad, suscripción…"
          maxLength={120}
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Contacto (opcional)
        </span>
        <Select value={contactId} onValueChange={setContactId}>
          <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CONTACT}>Sin contacto</SelectItem>
            {contacts.map((contact) => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Cuota
          </span>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Moneda
          </span>
          <Select value={currencyId} onValueChange={changeCurrency}>
            <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((currency) => (
                <SelectItem key={currency.id} value={currency.id}>
                  {currency.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {currencyAccounts.length > 0 && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Cuenta para las cuotas (opcional)
          </span>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ACCOUNT}>Sin cuenta</SelectItem>
              {currencyAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[11.5px] text-muted">
            Se preseleccionará al pagar o cobrar cada cuota.
          </span>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Frecuencia
          </span>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FREQUENCIES.map((freq) => (
                <SelectItem key={freq} value={freq}>
                  {FREQUENCY_LABELS[freq]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Primer vencimiento
          </span>
          <Input
            type="date"
            value={firstDueAt}
            onChange={(e) => setFirstDueAt(e.target.value)}
            required
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Termina el (opcional)
        </span>
        <Input
          type="date"
          value={endAt}
          min={firstDueAt}
          onChange={(e) => setEndAt(e.target.value)}
        />
      </label>

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={saving || !description.trim() || !amount.trim() || !currencyId}
      >
        {saving ? "Creando…" : "Crear plan"}
      </Button>
    </form>
  );
}

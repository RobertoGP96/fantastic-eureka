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
import { createDebt } from "@/app/actions/debt-actions";
import { useUI } from "@/lib/ui-store";
import {
  DEBT_DIRECTIONS,
  DEBT_DIRECTION_LABELS,
  FREQUENCIES,
  FREQUENCY_LABELS,
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

const NEW_CONTACT = "__new__";
const NO_ACCOUNT = "__none__";

const todayISO = () => new Date().toISOString().slice(0, 10);

export function DebtForm({
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
  const [direction, setDirection] = useState<string>("RECEIVABLE");
  const [contactId, setContactId] = useState(NEW_CONTACT);
  const [contactName, setContactName] = useState("");
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState("");
  const [currencyId, setCurrencyId] = useState(currencies[0]?.id ?? "");
  const [accountId, setAccountId] = useState(NO_ACCOUNT);
  const [withPlan, setWithPlan] = useState(false);
  const [frequency, setFrequency] = useState<string>("MONTHLY");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [firstDueAt, setFirstDueAt] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Solo cuentas de la moneda elegida: es donde se registrarán los abonos.
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
    const result = await createDebt({
      direction,
      contactId: contactId === NEW_CONTACT ? undefined : contactId,
      contactName: contactId === NEW_CONTACT ? contactName : undefined,
      description,
      total,
      currencyId,
      accountId: accountId === NO_ACCOUNT ? undefined : accountId,
      ...(withPlan
        ? {
            frequency,
            installmentAmount,
            firstDueAt: new Date(`${firstDueAt}T12:00:00`),
          }
        : {}),
    });
    setSaving(false);
    if (result.success) {
      showToast("Deuda creada");
      router.push(`/deudas/${result.data.id}`);
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
        {DEBT_DIRECTIONS.map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => setDirection(dir)}
            className={`rounded-[13px] border px-3 py-2.5 text-[12.5px] font-semibold transition-colors ${
              direction === dir
                ? "border-brand bg-chip text-brand"
                : "border-line bg-white text-ink-soft hover:border-brand-soft"
            }`}
          >
            {DEBT_DIRECTION_LABELS[dir]}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Contacto
        </span>
        <Select value={contactId} onValueChange={setContactId}>
          <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NEW_CONTACT}>+ Nuevo contacto</SelectItem>
            {contacts.map((contact) => (
              <SelectItem key={contact.id} value={contact.id}>
                {contact.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {contactId === NEW_CONTACT && (
        <Input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Nombre del contacto"
          maxLength={60}
          required
        />
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Descripción
        </span>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Préstamo, mercancía, alquiler…"
          maxLength={120}
          required
        />
      </label>

      <div className="grid grid-cols-[1fr_110px] gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Monto total
          </span>
          <Input
            value={total}
            onChange={(e) => setTotal(e.target.value)}
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
            Cuenta para abonos (opcional)
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
            Se preseleccionará al registrar abonos y cuotas.
          </span>
        </label>
      )}

      <label className="flex items-center gap-2.5 rounded-[13px] border border-line bg-white px-3.5 py-3">
        <input
          type="checkbox"
          checked={withPlan}
          onChange={(e) => setWithPlan(e.target.checked)}
          className="h-4 w-4 accent-[#0c6b70]"
        />
        <span className="text-[12.5px] font-medium text-ink-soft">
          Con plan de cuotas (recordatorios periódicos)
        </span>
      </label>

      {withPlan && (
        <div className="flex flex-col gap-3 rounded-[18px] border border-brand-soft/50 bg-chip/40 p-4">
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
                Cuota
              </span>
              <Input
                value={installmentAmount}
                onChange={(e) => setInstallmentAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                required
              />
            </label>
          </div>
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
      )}

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={
          saving ||
          !description.trim() ||
          !total.trim() ||
          !currencyId ||
          (contactId === NEW_CONTACT && !contactName.trim()) ||
          (withPlan && !installmentAmount.trim())
        }
      >
        {saving ? "Creando…" : "Crear deuda"}
      </Button>
    </form>
  );
}

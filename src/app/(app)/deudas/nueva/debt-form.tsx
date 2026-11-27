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
import { createDebt } from "@/app/actions/debt-actions";
import { useUI } from "@/lib/ui-store";
import { toLocalDateISO } from "@/lib/dates";
import { runAction } from "@/lib/run-action";
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

const DIRECTION_OPTIONS = DEBT_DIRECTIONS.map((dir) => ({
  value: dir,
  label: DEBT_DIRECTION_LABELS[dir],
}));

const todayISO = () => toLocalDateISO();

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
    const result = await runAction(() =>
      createDebt({
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
      })
    );
    if (result.success) {
      // `saving` sigue en true mientras navega: evita una deuda duplicada.
      showToast("Deuda creada");
      router.push(`/deudas/${result.data.id}`);
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
      <Segmented
        layout="fill"
        ariaLabel="Tipo de deuda"
        options={DIRECTION_OPTIONS}
        value={direction}
        onValueChange={setDirection}
      />

      {/* El nombre del contacto nuevo va pegado a su selector. Ese campo no
          lleva <label>: el test E2E lo localiza por su placeholder. */}
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">
            Contacto
          </span>
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger variant="form" className="w-full">
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
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink-soft">
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
          <span className="text-sm font-medium text-ink-soft">
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
          <span className="text-sm font-medium text-ink-soft">
            Moneda
          </span>
          <Select value={currencyId} onValueChange={changeCurrency}>
            <SelectTrigger variant="form" className="w-full">
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
          <span className="text-sm font-medium text-ink-soft">
            Cuenta para abonos (opcional)
          </span>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger variant="form" className="w-full">
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
          <span className="text-xs text-muted">
            Se preseleccionará al registrar abonos y cuotas.
          </span>
        </label>
      )}

      {/* Checkbox NATIVO dentro de su <label>: el test E2E lo marca con
          getByRole("checkbox") a través del label (un Switch lo rompería). */}
      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3.5 py-2.5 transition-colors hover:bg-subtle/60">
        <input
          type="checkbox"
          checked={withPlan}
          onChange={(e) => setWithPlan(e.target.checked)}
          className="size-4 flex-none accent-brand focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <span className="text-sm font-medium text-ink-soft">
          Con plan de cuotas (recordatorios periódicos)
        </span>
      </label>

      {withPlan && (
        // Panel interior neutro: los campos del plan cuelgan del checkbox.
        <div className="flex flex-col gap-3 rounded-xl bg-subtle p-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-soft">
                Frecuencia
              </span>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger variant="form" className="w-full">
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
            {/* El texto de este label es EXACTAMENTE «Cuota» (el test E2E usa
                getByLabel exacto): sin ayuda, unidad ni asterisco dentro. */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-ink-soft">
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
            <span className="text-sm font-medium text-ink-soft">
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
        <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
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

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
import { ContactPicker } from "@/components/contact-picker";
import { EntityAvatar } from "@/components/entity-avatar";
import {
  FORM_DRAWER_FORM,
  FormDrawerBody,
  FormDrawerFooter,
  useFormDrawer,
} from "@/components/form-drawer";
import {
  ChoiceGroup,
  Field,
  FIELD_SELECT,
  FormError,
} from "@/components/form-field";
import { createDebt } from "@/app/actions/debt-actions";
import { resolveContactInput } from "@/lib/contacts-core";
import { toLocalDateISO } from "@/lib/dates";
import {
  DEBT_DIRECTIONS,
  DEBT_DIRECTION_LABELS,
  FREQUENCIES,
  FREQUENCY_LABELS,
  type DebtDirection,
} from "@/lib/domain";
import type {
  ContactOption,
  DebtFormOptions,
} from "@/lib/form-option-types";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

const NO_ACCOUNT = "__none__";

const DIRECTION_OPTIONS = DEBT_DIRECTIONS.map((direction) => ({
  value: direction,
  label: DEBT_DIRECTION_LABELS[direction],
}));

/**
 * Alta de deuda (vive en un drawer). Con `fixedContact` el contacto viene
 * dado —se abre desde la ficha de ese contacto— y no se puede cambiar.
 */
export function DebtForm({
  contacts,
  currencies,
  accounts,
  fixedContact,
}: DebtFormOptions & { fixedContact?: ContactOption }) {
  const { showToast } = useUI();
  const { setBusy, closeAndGo } = useFormDrawer();
  const [direction, setDirection] = useState<DebtDirection>("RECEIVABLE");
  const [contactText, setContactText] = useState("");
  const [description, setDescription] = useState("");
  const [total, setTotal] = useState("");
  const [currencyId, setCurrencyId] = useState(currencies[0]?.id ?? "");
  const [accountId, setAccountId] = useState(NO_ACCOUNT);
  const [withPlan, setWithPlan] = useState(false);
  const [frequency, setFrequency] = useState<string>("MONTHLY");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [firstDueAt, setFirstDueAt] = useState(() => toLocalDateISO());
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

  const contact = fixedContact
    ? ({ kind: "existing", ...fixedContact } as const)
    : resolveContactInput(contactText, contacts);

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);
    const result = await runAction(() =>
      createDebt({
        direction,
        contactId: contact.kind === "existing" ? contact.id : undefined,
        contactName: contact.kind === "new" ? contact.name : undefined,
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
      closeAndGo(`/deudas/${result.data.id}`);
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
        <ChoiceGroup
          label="Tipo de deuda"
          options={DIRECTION_OPTIONS}
          value={direction}
          onChange={setDirection}
        />

        {fixedContact ? (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5">
            <EntityAvatar name={fixedContact.name} size="sm" />
            <div className="min-w-0">
              <div className="text-xs text-muted">Contacto</div>
              <div className="truncate text-sm font-semibold text-heading">
                {fixedContact.name}
              </div>
            </div>
          </div>
        ) : (
          <ContactPicker
            contacts={contacts}
            value={contactText}
            onChange={setContactText}
          />
        )}

        <Field label="Descripción">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Préstamo, mercancía, alquiler…"
            maxLength={120}
            required
          />
        </Field>

        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
          <Field label="Monto total">
            <Input
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              required
            />
          </Field>
          <Field label="Moneda">
            <Select value={currencyId} onValueChange={changeCurrency}>
              <SelectTrigger className={FIELD_SELECT}>
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
          </Field>
        </div>

        {currencyAccounts.length > 0 && (
          <Field
            label="Cuenta para abonos (opcional)"
            hint="Se preseleccionará al registrar abonos y cuotas."
          >
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className={FIELD_SELECT}>
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
          </Field>
        )}

        <label className="flex min-h-11 items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-3">
          <input
            type="checkbox"
            checked={withPlan}
            onChange={(e) => setWithPlan(e.target.checked)}
            className="size-4 accent-primary"
          />
          <span className="text-sm font-medium text-ink-soft">
            Con plan de cuotas (recordatorios periódicos)
          </span>
        </label>

        {withPlan && (
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-soft/50 bg-chip/40 p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Frecuencia">
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className={FIELD_SELECT}>
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
              </Field>
              <Field label="Cuota">
                <Input
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  required
                />
              </Field>
            </div>
            <Field label="Primer vencimiento">
              <Input
                type="date"
                value={firstDueAt}
                onChange={(e) => setFirstDueAt(e.target.value)}
                required
              />
            </Field>
          </div>
        )}

        <FormError>{error}</FormError>
      </FormDrawerBody>

      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={
            saving ||
            !description.trim() ||
            !total.trim() ||
            !currencyId ||
            contact.kind === "none" ||
            (withPlan && !installmentAmount.trim())
          }
        >
          {saving ? "Creando…" : "Crear deuda"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

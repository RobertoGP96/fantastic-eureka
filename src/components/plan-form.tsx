"use client";

import { useState } from "react";
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
import { ContactPicker, FixedContact } from "@/components/contact-picker";
import {
  FORM_DRAWER_FORM,
  FormDrawerBody,
  FormDrawerFooter,
  useFormDrawer,
} from "@/components/form-drawer";
import { Field, FormError } from "@/components/form-field";
import { createPlan } from "@/app/actions/plan-actions";
import { resolveContactInput } from "@/lib/contacts-core";
import { toLocalDateISO } from "@/lib/dates";
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  PLAN_KINDS,
  PLAN_KIND_LABELS,
  type PlanKind,
} from "@/lib/domain";
import type {
  ContactOption,
  DebtFormOptions,
} from "@/lib/form-option-types";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

const NO_ACCOUNT = "__none_account__";

// «Pago» primero: es lo habitual (renta, suscripciones). El paréntesis
// aclara desde qué lado se mira el plan.
const KIND_OPTIONS = [...PLAN_KINDS].reverse().map((kind) => ({
  value: kind,
  label: `${PLAN_KIND_LABELS[kind]} ${kind === "COLLECT" ? "(me pagan)" : "(yo pago)"}`,
}));

/**
 * Alta de mensualidad (vive en un drawer). El contacto es opcional; con
 * `fixedContact` viene dado desde la ficha de ese contacto.
 */
export function PlanForm({
  contacts,
  currencies,
  accounts,
  fixedContact,
}: DebtFormOptions & { fixedContact?: ContactOption }) {
  const { showToast } = useUI();
  const { setBusy, closeAndGo } = useFormDrawer();
  const [kind, setKind] = useState<PlanKind>("PAY");
  const [description, setDescription] = useState("");
  const [contactText, setContactText] = useState("");
  const [currencyId, setCurrencyId] = useState(currencies[0]?.id ?? "");
  const [accountId, setAccountId] = useState(NO_ACCOUNT);
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<string>("MONTHLY");
  const [firstDueAt, setFirstDueAt] = useState(() => toLocalDateISO());
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

  const contact = fixedContact
    ? ({ kind: "existing", ...fixedContact } as const)
    : resolveContactInput(contactText, contacts);

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);
    const result = await runAction(() =>
      createPlan({
        kind,
        description,
        contactId: contact.kind === "existing" ? contact.id : undefined,
        contactName: contact.kind === "new" ? contact.name : undefined,
        currencyId,
        accountId: accountId === NO_ACCOUNT ? undefined : accountId,
        amount,
        frequency,
        firstDueAt: new Date(`${firstDueAt}T12:00:00`),
        endAt: endAt ? new Date(`${endAt}T12:00:00`) : undefined,
      })
    );
    if (result.success) {
      // `saving` sigue en true mientras navega: evita un plan duplicado.
      showToast("Mensualidad creada");
      closeAndGo(`/mensualidades/${result.data.id}`);
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
        <Segmented
          layout="fill"
          ariaLabel="Tipo de mensualidad"
          options={KIND_OPTIONS}
          value={kind}
          onValueChange={setKind}
        />

        <Field label="Descripción">
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Renta, mensualidad, suscripción…"
            maxLength={120}
            required
          />
        </Field>

        {fixedContact ? (
          <FixedContact name={fixedContact.name} />
        ) : (
          <ContactPicker
            contacts={contacts}
            value={contactText}
            onChange={setContactText}
            optional
          />
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-3">
          <Field label="Cuota">
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              required
            />
          </Field>
          <Field label="Moneda">
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
          </Field>
        </div>

        {currencyAccounts.length > 0 && (
          <Field
            label="Cuenta habitual (opcional)"
            hint="Se usará por defecto al pagar o cobrar cada cuota."
          >
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
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Frecuencia">
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
          </Field>
          <Field label="Primer vencimiento">
            <Input
              type="date"
              value={firstDueAt}
              onChange={(e) => setFirstDueAt(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field label="Termina el (opcional)">
          <Input
            type="date"
            value={endAt}
            min={firstDueAt}
            onChange={(e) => setEndAt(e.target.value)}
          />
        </Field>

        <FormError>{error}</FormError>
      </FormDrawerBody>

      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={
            saving || !description.trim() || !amount.trim() || !currencyId
          }
        >
          {saving ? "Creando…" : "Crear mensualidad"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

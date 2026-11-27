"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FORM_DRAWER_FORM,
  FormDrawerBody,
  FormDrawerFooter,
  useFormDrawer,
} from "@/components/form-drawer";
import { Field, FormError } from "@/components/form-field";
import { createContact, updateContact } from "@/app/actions/contact-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

export interface EditableContact {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
}

/**
 * Alta o edición de un contacto (vive en un drawer). Con `contact` edita;
 * sin él crea y navega a la ficha nueva.
 */
export function ContactForm({ contact }: { contact?: EditableContact }) {
  const { showToast } = useUI();
  const { setBusy, close, closeAndGo } = useFormDrawer();
  const [name, setName] = useState(contact?.name ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [note, setNote] = useState(contact?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);
    const fields = { name, phone, note };
    const result = contact
      ? await runAction(() => updateContact({ id: contact.id, ...fields }))
      : await runAction(() => createContact(fields));

    if (result.success) {
      // `saving` sigue en true mientras cierra o navega (anti doble envío).
      if (contact) {
        showToast("Contacto guardado");
        close();
      } else {
        showToast("Contacto creado");
        closeAndGo(`/contactos/${result.data.id}`);
      }
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
            placeholder="Nombre del contacto"
            maxLength={60}
            autoComplete="off"
            required
          />
        </Field>
        <Field label="Teléfono (opcional)">
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+53 5 000 0000"
            maxLength={30}
            autoComplete="off"
          />
        </Field>
        <Field label="Nota (opcional)">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Parentesco, cómo suele pagar, dónde vive…"
            // Mismo aspecto que <Input>: 16 px en táctil (sin zoom en iOS) y
            // 14 px en escritorio con ratón.
            className="w-full min-w-0 resize-none rounded-xl border border-input bg-card px-3.5 py-2 text-base text-ink transition-colors outline-none placeholder:text-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dense:text-sm"
          />
        </Field>
        <FormError>{error}</FormError>
      </FormDrawerBody>
      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={saving || !name.trim()}
        >
          {saving
            ? "Guardando…"
            : contact
              ? "Guardar cambios"
              : "Crear contacto"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

"use client";

import { useMemo } from "react";
import { Check, UserRoundPlus, X } from "lucide-react";
import { EntityAvatar } from "@/components/entity-avatar";
import { Input } from "@/components/ui/input";
import { filterContacts, resolveContactInput } from "@/lib/contacts-core";
import type { ContactOption } from "@/lib/form-option-types";

const MAX_SUGGESTIONS = 5;

/**
 * Selector de contacto de un formulario: un campo de texto que sugiere los
 * contactos existentes al escribir y permite crear uno nuevo solo con
 * teclear su nombre.
 *
 * El valor es el TEXTO. Qué contacto representa lo decide
 * `resolveContactInput` (el formulario lo llama al enviar):
 *   · coincide con uno existente → ese (escribir «juan» no duplica a «Juan»);
 *   · no coincide               → contacto nuevo, que el servicio crea en la
 *                                 MISMA transacción que la deuda o el plan.
 * Por eso este componente no llama a ninguna action.
 */
export function ContactPicker({
  contacts,
  value,
  onChange,
  optional = false,
}: {
  contacts: ContactOption[];
  value: string;
  onChange: (text: string) => void;
  /** En mensualidades el contacto es opcional. */
  optional?: boolean;
}) {
  const choice = useMemo(
    () => resolveContactInput(value, contacts),
    [value, contacts]
  );

  // Con el campo vacío se ofrecen los primeros contactos como atajo; al
  // escribir, los que coinciden. Si ya hay uno elegido no se sugiere nada.
  const suggestions = useMemo(() => {
    if (choice.kind === "existing") return [];
    return filterContacts(contacts, value).slice(0, MAX_SUGGESTIONS);
  }, [choice.kind, contacts, value]);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-ink-soft">
          Contacto{optional ? " (opcional)" : ""}
        </span>
        <span className="relative">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nombre del contacto"
            maxLength={60}
            required={!optional}
            autoComplete="off"
            className="pr-11"
          />
          {value && (
            <button
              type="button"
              aria-label="Borrar contacto"
              onClick={() => onChange("")}
              className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:bg-chip hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-4" />
            </button>
          )}
        </span>
      </label>

      {choice.kind === "existing" && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-ok">
          <Check className="size-3.5 flex-none" />
          Contacto existente
        </p>
      )}
      {choice.kind === "new" && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-brand-ink">
          <UserRoundPlus className="size-3.5 flex-none" />
          <span className="min-w-0 truncate">
            Se creará el contacto «{choice.name}»
          </span>
        </p>
      )}

      {suggestions.length > 0 && (
        <ul
          aria-label={value ? "Contactos que coinciden" : "Tus contactos"}
          className="flex flex-wrap gap-1.5"
        >
          {suggestions.map((contact) => (
            <li key={contact.id} className="min-w-0">
              <button
                type="button"
                onClick={() => onChange(contact.name)}
                className="flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-line bg-card py-1 pr-3 pl-1 text-xs font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <EntityAvatar
                  name={contact.name}
                  size="sm"
                  className="size-7 text-[11px]"
                />
                <span className="truncate">{contact.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

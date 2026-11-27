"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { EntityAvatar } from "@/components/entity-avatar";
import {
  FORM_DRAWER_FORM,
  FormDrawerBody,
  FormDrawerFooter,
  useFormDrawer,
} from "@/components/form-drawer";
import { FormError } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { mergeContacts } from "@/app/actions/contact-actions";
import { filterContacts } from "@/lib/contacts-core";
import type { ContactOption } from "@/lib/form-option-types";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

/**
 * Fusiona ESTE contacto (`source`) en otro: sus deudas y mensualidades pasan
 * al elegido y este se elimina. Sirve para limpiar duplicados.
 */
export function MergeContactForm({
  source,
  candidates,
}: {
  source: ContactOption;
  /** El resto de contactos del usuario. */
  candidates: ContactOption[];
}) {
  const { showToast } = useUI();
  const { setBusy, closeAndGo } = useFormDrawer();
  const [query, setQuery] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(
    () => filterContacts(candidates, query),
    [candidates, query]
  );
  const target = candidates.find((contact) => contact.id === targetId) ?? null;

  if (candidates.length === 0) {
    return (
      <FormDrawerBody>
        <p className="rounded-xl border border-line bg-card px-3.5 py-3 text-sm text-muted">
          No hay otro contacto con el que fusionar a «{source.name}».
        </p>
      </FormDrawerBody>
    );
  }

  const submit = async () => {
    if (!target) return;
    setSaving(true);
    setBusy(true);
    setError(null);
    const result = await runAction(() =>
      mergeContacts({ sourceId: source.id, targetId: target.id })
    );
    if (result.success) {
      // `saving` sigue en true mientras navega (anti doble envío).
      showToast("Contactos fusionados");
      closeAndGo(`/contactos/${result.data.id}`);
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
        <p className="text-sm text-ink-soft">
          Las deudas y mensualidades de{" "}
          <strong className="font-semibold text-heading">{source.name}</strong>{" "}
          pasarán al contacto que elijas, y «{source.name}» se eliminará.
        </p>

        {candidates.length > 6 && (
          <label className="relative block">
            <span className="sr-only">Buscar contacto</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar contacto"
              autoComplete="off"
              className="pl-10"
            />
          </label>
        )}

        <div
          role="radiogroup"
          aria-label="Fusionar con"
          className="flex flex-col gap-1.5"
        >
          {visible.length === 0 && (
            <p className="px-1 text-sm text-muted">Ningún contacto coincide.</p>
          )}
          {visible.map((contact) => {
            const selected = contact.id === targetId;
            return (
              <button
                key={contact.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTargetId(contact.id)}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  // Tinte de acento solo para la opción elegida.
                  selected
                    ? "border-brand-ink bg-chip"
                    : "border-line bg-card hover:bg-subtle"
                )}
              >
                <EntityAvatar
                  name={contact.name}
                  size="sm"
                  tone={selected ? "brand" : "neutral"}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-heading">
                  {contact.name}
                </span>
                {selected && (
                  <Check className="size-4 flex-none text-brand-ink" />
                )}
              </button>
            );
          })}
        </div>

        <FormError>{error}</FormError>
      </FormDrawerBody>

      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="min-w-0 flex-1"
          disabled={saving || !target}
        >
          <span className="truncate">
            {saving
              ? "Fusionando…"
              : target
                ? `Fusionar con ${target.name}`
                : "Elige un contacto"}
          </span>
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

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
import { ChoiceGroup, Field, FormError } from "@/components/form-field";
import { createCategory, renameCategory } from "@/app/actions/category-actions";
import { type CategoryKind } from "@/lib/domain";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

const KIND_OPTIONS: { value: CategoryKind; label: string }[] = [
  { value: "EXPENSE", label: "Gasto" },
  { value: "INCOME", label: "Ingreso" },
];

/**
 * Alta o renombrado de una categoría (vive en un drawer). Con `category`
 * renombra —el tipo de una categoría existente no se cambia—; sin ella crea
 * una del tipo elegido, que arranca en `defaultKind`.
 */
export function CategoryForm({
  category,
  defaultKind = "EXPENSE",
}: {
  category?: { id: string; name: string };
  defaultKind?: CategoryKind;
}) {
  const { showToast } = useUI();
  const { setBusy, close } = useFormDrawer();
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(defaultKind);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);
    const result = category
      ? await runAction(() => renameCategory({ id: category.id, name }))
      : await runAction(() => createCategory({ name, kind }));

    if (result.success) {
      // `saving` sigue en true mientras se cierra (anti doble envío).
      showToast(category ? "Categoría renombrada" : "Categoría creada");
      close();
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
        {!category && (
          <ChoiceGroup
            label="Tipo de categoría"
            options={KIND_OPTIONS}
            value={kind}
            onChange={setKind}
          />
        )}
        <Field label="Nombre">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={category ? "Nombre de la categoría" : "Nueva categoría"}
            maxLength={40}
            autoComplete="off"
            required
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
            saving ||
            !name.trim() ||
            (category !== undefined && name.trim() === category.name)
          }
        >
          {saving ? "Guardando…" : category ? "Guardar" : "Añadir"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

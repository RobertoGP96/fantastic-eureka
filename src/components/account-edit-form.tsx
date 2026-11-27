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
import type { AccountGroupOption } from "@/components/account-form";
import {
  FORM_DRAWER_FORM,
  FormDrawerBody,
  FormDrawerFooter,
  useFormDrawer,
} from "@/components/form-drawer";
import { Field, FormError } from "@/components/form-field";
import { IconPicker } from "@/components/icon-picker";
import {
  setAccountIcon,
  updateAccount,
} from "@/app/actions/account-actions";
import { assignAccountGroup } from "@/app/actions/group-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

const NO_GROUP = "__none__";

/**
 * Edición de una cuenta en un solo formulario: nombre, icono y grupo (antes
 * eran tres tarjetas del detalle que guardaban cada una por su lado). Solo
 * se envía lo que cambió; si una parte falla, lo ya guardado se conserva y
 * el aviso dice cuál falló.
 */
export function AccountEditForm({
  accountId,
  name: initialName,
  icon: initialIcon,
  groupId: initialGroupId,
  groups,
}: {
  accountId: string;
  name: string;
  icon: string | null;
  groupId: string | null;
  groups: AccountGroupOption[];
}) {
  const { showToast } = useUI();
  const { setBusy, close } = useFormDrawer();
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState<string | null>(initialIcon);
  const [groupId, setGroupId] = useState(initialGroupId ?? NO_GROUP);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const nextGroupId = groupId === NO_GROUP ? null : groupId;
  const nameChanged = name.trim() !== initialName;
  const iconChanged = icon !== initialIcon;
  const groupChanged = nextGroupId !== initialGroupId;
  const dirty = nameChanged || iconChanged || groupChanged;

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);

    const fail = (message: string) => {
      setSaving(false);
      setBusy(false);
      setError(message);
    };

    if (nameChanged) {
      const result = await runAction(() =>
        updateAccount({ id: accountId, name })
      );
      if (!result.success) return fail(result.error);
    }
    if (iconChanged) {
      const result = await runAction(() =>
        setAccountIcon({ accountId, icon })
      );
      if (!result.success) return fail(`Icono: ${result.error}`);
    }
    if (groupChanged) {
      const result = await runAction(() =>
        assignAccountGroup({ accountId, groupId: nextGroupId })
      );
      if (!result.success) return fail(`Grupo: ${result.error}`);
    }

    // `saving` sigue en true mientras se cierra (anti doble envío).
    showToast("Cuenta actualizada");
    close();
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
            maxLength={60}
            required
          />
        </Field>

        {/* <div> + <span>, NO <label>: un label alrededor de un grupo de
            botones reenvía el clic al primero. */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink-soft">
            Icono (sin elegir, se usa el del tipo)
          </span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        {groups.length > 0 && (
          <Field label="Grupo">
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger variant="form" className="w-full">
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

        <FormError>{error}</FormError>
      </FormDrawerBody>

      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={saving || !name.trim() || !dirty}
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

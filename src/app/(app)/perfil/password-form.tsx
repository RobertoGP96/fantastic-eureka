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
import { updatePassword } from "@/app/actions/profile-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

/** Cambio de contraseña (vive en un drawer de /perfil). */
export function PasswordForm() {
  const { showToast } = useUI();
  const { setBusy, close } = useFormDrawer();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setBusy(true);
    setError(null);
    const result = await runAction(() =>
      updatePassword({ current, next, confirm })
    );
    if (result.success) {
      // `saving` sigue en true mientras se cierra el drawer: un segundo
      // toque ya enviaría la contraseña «actual» equivocada.
      showToast("Contraseña actualizada");
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
        <Field label="Contraseña actual">
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nueva">
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="Mínimo 8"
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Repetir">
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
        </div>

        <FormError>{error}</FormError>
      </FormDrawerBody>

      <FormDrawerFooter>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={saving || !current || !next || !confirm}
        >
          {saving ? "Cambiando…" : "Cambiar contraseña"}
        </Button>
      </FormDrawerFooter>
    </form>
  );
}

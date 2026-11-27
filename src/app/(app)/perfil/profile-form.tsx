"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormError } from "@/components/form-field";
import { updateProfile } from "@/app/actions/profile-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";

/** Datos personales: formulario inline (no navega ni cierra nada al guardar). */
export function ProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const { showToast } = useUI();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = name !== initialName || email !== initialEmail;

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await runAction(() => updateProfile({ name, email }));
    // Aquí `saving` SÍ vuelve a false tras el éxito: el formulario se queda
    // en pantalla y debe poder guardar otro cambio. Sin riesgo de duplicar:
    // la action revalida la página, llegan los datos nuevos como iniciales
    // y `dirty` deja el botón deshabilitado hasta que se edite de nuevo.
    setSaving(false);
    if (result.success) {
      showToast("Perfil actualizado");
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
      <Field label="Nombre">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="name"
          required
        />
      </Field>

      <Field label="Correo">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </Field>

      <FormError>{error}</FormError>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={saving || !dirty || !name.trim() || !email.trim()}
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

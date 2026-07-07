"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/app/actions/profile-actions";
import { useUI } from "@/lib/ui-store";

export function ProfileForm({
  initialName,
  initialEmail,
}: {
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = name !== initialName || email !== initialEmail;

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await updateProfile({ name, email });
    setSaving(false);
    if (result.success) {
      showToast("Perfil actualizado");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Nombre
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="name"
          required
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Correo
        </span>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </label>

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={saving || !dirty || !name.trim() || !email.trim()}
      >
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}

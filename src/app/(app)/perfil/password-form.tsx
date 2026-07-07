"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updatePassword } from "@/app/actions/profile-actions";
import { useUI } from "@/lib/ui-store";

export function PasswordForm() {
  const { showToast } = useUI();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await updatePassword({ current, next, confirm });
    setSaving(false);
    if (result.success) {
      showToast("Contraseña actualizada");
      setCurrent("");
      setNext("");
      setConfirm("");
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
          Contraseña actual
        </span>
        <Input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Nueva
          </span>
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Mínimo 8"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Repetir
          </span>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
      </div>

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={saving || !current || !next || !confirm}
      >
        {saving ? "Cambiando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}

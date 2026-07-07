"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { registerUser } from "@/app/actions/auth-actions";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await registerUser({ name, email, password, confirm });
    if (result.success) {
      router.push("/");
      router.refresh();
    } else {
      setSaving(false);
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
      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Nombre
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          autoComplete="name"
          maxLength={60}
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
          placeholder="tu@correo.com"
          autoComplete="email"
          required
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Contraseña
          </span>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            placeholder="••••••••"
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
        size="lg"
        className="w-full"
        disabled={
          saving || !name.trim() || !email.trim() || !password || !confirm
        }
      >
        {saving ? "Creando cuenta…" : "Crear cuenta"}
      </Button>

      <p className="text-center text-[12.5px] text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/auth/login"
          className="font-semibold text-brand-mid transition-colors hover:text-brand"
        >
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

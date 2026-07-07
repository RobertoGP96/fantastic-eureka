"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginUser } from "@/app/actions/auth-actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError(null);
    const result = await loginUser({ email, password });
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

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Contraseña
        </span>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
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
        size="lg"
        className="w-full"
        disabled={saving || !email.trim() || !password}
      >
        {saving ? "Entrando…" : "Entrar"}
      </Button>

      <p className="text-center text-[12.5px] text-muted">
        ¿No tienes cuenta?{" "}
        <Link
          href="/auth/registro"
          className="font-semibold text-brand-mid transition-colors hover:text-brand"
        >
          Regístrate
        </Link>
      </p>
    </form>
  );
}

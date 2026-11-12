"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isWellFormedShareToken, sharePath } from "@/lib/account-share";

/**
 * Entrada manual del código de seguimiento (para quien lo recibe dictado o
 * pegado sin el enlace completo). Acepta también la URL entera: se queda
 * con el último segmento.
 */
export function ShareCodeForm({ invalid = false }: { invalid?: boolean }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    invalid ? "Ese código no existe, caducó o fue revocado." : null
  );

  const submit = () => {
    const trimmed = code.trim();
    const token = trimmed.includes("/")
      ? (trimmed.split("/").filter(Boolean).pop() ?? "")
      : trimmed;
    if (!isWellFormedShareToken(token)) {
      setError("Código no válido. Revisa que esté completo.");
      return;
    }
    setError(null);
    router.push(sharePath(token));
  };

  return (
    <form
      className="flex flex-col gap-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <label className="text-xs font-semibold text-ink-soft" htmlFor="share-code">
        Código de seguimiento
      </label>
      <div className="flex gap-2">
        <Input
          id="share-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Pega aquí el código o el enlace"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-10 font-mono text-sm"
          required
        />
        <Button type="submit" disabled={!code.trim()}>
          <KeyRound className="h-4 w-4" />
          Abrir
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}

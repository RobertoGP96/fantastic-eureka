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
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label
          className="text-sm font-medium text-ink-soft"
          htmlFor="share-code"
        >
          Código de seguimiento
        </label>
        {/* En móvil el botón baja bajo el campo: el código pegado se ve
            entero. El campo NO fija alto ni tamaño de letra: en táctil debe
            quedarse en 16 px (iOS hace zoom por debajo). */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="share-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Pega aquí el código o el enlace"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            className="font-mono placeholder:font-sans"
            required
          />
          <Button type="submit" className="flex-none" disabled={!code.trim()}>
            <KeyRound className="size-4" />
            Abrir
          </Button>
        </div>
      </div>
      {error && (
        <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
          {error}
        </div>
      )}
    </form>
  );
}

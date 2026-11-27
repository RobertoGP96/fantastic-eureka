"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  FormDrawer,
  FormDrawerBody,
  FormDrawerFooter,
  useFormDrawer,
} from "@/components/form-drawer";

interface ConfirmDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Qué va a pasar exactamente (alcance del borrado). */
  description: ReactNode;
  confirmLabel?: string;
  /** Texto del botón mientras se ejecuta. */
  busyLabel?: string;
  tone?: "danger" | "default";
  /**
   * Ejecuta la acción. Devuelve un mensaje de error para mostrarlo y dejar
   * el drawer abierto; `null`/`undefined` si salió bien (quien llama cierra
   * o navega).
   */
  onConfirm: () => Promise<string | null | undefined | void>;
}

/**
 * Confirmación de una acción destructiva. Siempre es una hoja inferior
 * compacta (también en escritorio): un panel lateral entero para una frase
 * y dos botones quedaría vacío.
 */
export function ConfirmDrawer({ open, onClose, title, ...rest }: ConfirmDrawerProps) {
  return (
    <FormDrawer open={open} onClose={onClose} title={title} side="bottom">
      <ConfirmContent onClose={onClose} {...rest} />
    </FormDrawer>
  );
}

function ConfirmContent({
  onClose,
  description,
  confirmLabel = "Eliminar",
  busyLabel = "Eliminando…",
  tone = "danger",
  onConfirm,
}: Omit<ConfirmDrawerProps, "open" | "title">) {
  const { busy, setBusy } = useFormDrawer();
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const failure = await onConfirm();
    // Tras un éxito el botón sigue deshabilitado mientras se cierra o
    // navega: un segundo toque no repite la acción.
    if (failure) {
      setBusy(false);
      setError(failure);
    }
  };

  return (
    <>
      <FormDrawerBody>
        <div className="text-sm text-ink-soft">{description}</div>
        {error && (
          <div
            role="alert"
            className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger"
          >
            {error}
          </div>
        )}
      </FormDrawerBody>
      <FormDrawerFooter>
        <Button
          variant="ghost"
          className="flex-none"
          disabled={busy}
          onClick={onClose}
        >
          Cancelar
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "default"}
          className="flex-1"
          disabled={busy}
          onClick={() => void confirm()}
        >
          {busy ? busyLabel : confirmLabel}
        </Button>
      </FormDrawerFooter>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, RefreshCw, Share2, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createAccountShare,
  revokeAccountShare,
} from "@/app/actions/share-actions";
import { sharePath, shareRemainingLabel } from "@/lib/account-share";
import { useUI } from "@/lib/ui-store";

export interface SharePanelShare {
  token: string;
  /** ISO string (serializable servidor → cliente). */
  expiresAt: string;
}

/**
 * Panel «Compartir cuenta» del detalle: genera un código de seguimiento de
 * 24 h que abre una vista pública de solo lectura (saldo + movimientos).
 * Mientras esté vigente muestra el enlace, el tiempo restante y permite
 * copiarlo, compartirlo con el share nativo, regenerarlo o revocarlo.
 */
export function AccountSharePanel({
  accountId,
  accountName,
  share: initialShare,
}: {
  accountId: string;
  accountName: string;
  share: SharePanelShare | null;
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [share, setShare] = useState<SharePanelShare | null>(initialShare);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  // El origen y el reloj viven en estado tras montar: el servidor no conoce
  // el origin del navegador y el tiempo restante cambiaría entre render e
  // hidratación.
  const [origin, setOrigin] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Si el código caduca mientras la página sigue abierta, el panel vuelve al
  // estado inicial sin recargar.
  useEffect(() => {
    if (!share || !now) return;
    if (new Date(share.expiresAt).getTime() <= now.getTime()) setShare(null);
  }, [share, now]);

  const url = share && origin ? `${origin}${sharePath(share.token)}` : null;

  const generate = async () => {
    setBusy(true);
    const result = await createAccountShare(accountId);
    setBusy(false);
    if (result.success) {
      setShare(result.data);
      setConfirmRevoke(false);
      showToast("Código generado: válido 24 h");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const revoke = async () => {
    setBusy(true);
    const result = await revokeAccountShare(accountId);
    setBusy(false);
    setConfirmRevoke(false);
    if (result.success) {
      setShare(null);
      showToast("Código revocado");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Enlace copiado al portapapeles");
    } catch {
      showToast("No se pudo copiar el enlace");
    }
  };

  const nativeShare = async () => {
    if (!url) return;
    if (typeof navigator.share !== "function") {
      await copy();
      return;
    }
    try {
      await navigator.share({
        title: `Cuenta ${accountName}`,
        text: `Saldo y movimientos de «${accountName}» (enlace válido 24 h)`,
        url,
      });
    } catch (error) {
      // Cancelar el share nativo no es un error.
      if ((error as DOMException)?.name === "AbortError") return;
      await copy();
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      {/* flex-wrap: en la columna lateral estrecha la insignia baja bajo el
          título en vez de partirlo. */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h2 className="text-sm font-semibold text-heading">Compartir cuenta</h2>
        {share && now && (
          <Badge variant="warn">
            Vence en {shareRemainingLabel(new Date(share.expiresAt), now)}
          </Badge>
        )}
      </div>

      {share ? (
        <>
          <div className="flex items-center gap-2 rounded-xl bg-subtle px-3 py-2">
            <Link2 className="size-4 flex-none text-muted" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-heading">
              {url ?? sharePath(share.token)}
            </span>
          </div>
          {confirmRevoke ? (
            // basis-52: el aviso ocupa su línea y la pareja de botones baja
            // junta cuando no caben a su lado.
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="min-w-0 grow basis-52 text-xs text-muted">
                ¿Revocar el código? Quien tenga el enlace dejará de ver la
                cuenta al instante.
              </span>
              <div className="flex flex-none items-center gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => void revoke()}
                >
                  Revocar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirmRevoke(false)}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !url}
                onClick={() => void copy()}
              >
                {copied ? (
                  <Check className="size-3.5 text-ok" />
                ) : (
                  <Copy className="size-3.5" />
                )}
                Copiar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !url}
                onClick={() => void nativeShare()}
              >
                <Share2 className="size-3.5" />
                Compartir
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void generate()}
              >
                <RefreshCw className="size-3.5" />
                Nuevo código
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:text-danger"
                disabled={busy}
                onClick={() => setConfirmRevoke(true)}
              >
                <ShieldOff className="size-3.5" />
                Revocar
              </Button>
            </div>
          )}
        </>
      ) : (
        // basis-28: en la columna lateral estrecha el botón baja a su propia
        // línea en vez de partir el aviso en dos.
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 grow basis-28 text-xs text-muted">
            Sin código vigente.
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void generate()}
          >
            <Share2 className="size-3.5" />
            Generar código de 24 h
          </Button>
        </div>
      )}

      <p className="text-xs text-muted">
        El código abre una vista de solo lectura con el saldo y los
        movimientos de esta cuenta, sin necesidad de usuario. Caduca a las
        24 h; generar uno nuevo anula el anterior.
      </p>
    </Card>
  );
}

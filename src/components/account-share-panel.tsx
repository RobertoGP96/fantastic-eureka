"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, RefreshCw, Share2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-2.5 rounded-[16px] border border-line bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Compartir cuenta
        </span>
        {share && now && (
          <span className="rounded-md bg-gold/15 px-2 py-[3px] text-[10.5px] font-semibold text-navy">
            Vence en {shareRemainingLabel(new Date(share.expiresAt), now)}
          </span>
        )}
      </div>

      {share ? (
        <>
          <div className="flex items-center gap-2 rounded-[12px] bg-chip/60 px-3 py-2">
            <Link2 className="h-4 w-4 flex-none text-brand" />
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-navy">
              {url ?? sharePath(share.token)}
            </span>
          </div>
          {confirmRevoke ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-[12px] text-muted">
                ¿Revocar el código? Quien tenga el enlace dejará de ver la
                cuenta al instante.
              </span>
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
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !url}
                onClick={() => void copy()}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-ok" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copiar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !url}
                onClick={() => void nativeShare()}
              >
                <Share2 className="h-3.5 w-3.5" />
                Compartir
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => void generate()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Nuevo código
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:text-danger"
                disabled={busy}
                onClick={() => setConfirmRevoke(true)}
              >
                <ShieldOff className="h-3.5 w-3.5" />
                Revocar
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 flex-1 text-[12px] text-muted">
            Sin código vigente.
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void generate()}
          >
            <Share2 className="h-3.5 w-3.5" />
            Generar código de 24 h
          </Button>
        </div>
      )}

      <p className="text-[11px] text-muted">
        El código abre una vista de solo lectura con el saldo y los
        movimientos de esta cuenta, sin necesidad de usuario. Caduca a las
        24 h; generar uno nuevo anula el anterior.
      </p>
    </div>
  );
}

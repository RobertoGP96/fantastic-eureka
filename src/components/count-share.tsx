"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { fmtMinor, type DisplayCurrency } from "@/lib/format";
import {
  DENOMINATION_KIND_LABELS,
  type DenominationKind,
} from "@/lib/domain";
import { countedPieces, countedTotalMinor } from "@/lib/counting";
import { useUI } from "@/lib/ui-store";

export interface ShareableDenomination {
  id: string;
  valueMinor: number;
  kind: string;
}

/**
 * Texto plano del conteo (denominación × cantidad = subtotal + total), listo
 * para compartir por cualquier app. Exportado para poder testearlo.
 */
export function buildCountShareText(
  denominations: readonly ShareableDenomination[],
  quantities: Readonly<Record<string, number>>,
  currency: DisplayCurrency
): string {
  const lines = denominations
    .filter((d) => (quantities[d.id] ?? 0) > 0)
    .map((d) => {
      const qty = quantities[d.id] ?? 0;
      const kind =
        DENOMINATION_KIND_LABELS[d.kind as DenominationKind] ?? d.kind;
      return `${fmtMinor(d.valueMinor, currency)} (${kind}) × ${qty} = ${fmtMinor(d.valueMinor * qty, currency)}`;
    });
  const totalMinor = countedTotalMinor(denominations, quantities);
  const pieces = countedPieces(quantities);

  return [
    `Conteo de efectivo · ${currency.code}`,
    ...lines,
    `Total: ${fmtMinor(totalMinor, currency)} · ${pieces === 1 ? "1 pieza" : `${pieces} piezas`}`,
  ].join("\n");
}

// Comparte el conteo con las denominaciones contadas: usa el share nativo
// del sistema si existe y, si no, copia el texto al portapapeles.
export function CountShareButton({
  denominations,
  quantities,
  currency,
}: {
  denominations: readonly ShareableDenomination[];
  quantities: Readonly<Record<string, number>>;
  currency: DisplayCurrency;
}) {
  const { showToast } = useUI();
  const [copied, setCopied] = useState(false);
  const pieces = countedPieces(quantities);

  const share = async () => {
    const text = buildCountShareText(denominations, quantities, currency);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Conteo de efectivo", text });
        return;
      } catch (error) {
        // Cancelar el share nativo no es un error; cualquier otro fallo
        // cae al portapapeles.
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Conteo copiado al portapapeles");
    } catch {
      showToast("No se pudo compartir el conteo");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      disabled={pieces === 0}
      className="flex flex-none items-center gap-1.5 rounded-[12px] border border-line bg-white px-3 py-2 text-[12px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand disabled:opacity-40"
    >
      {copied ? (
        <Check className="h-4 w-4 text-ok" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      Compartir
    </button>
  );
}

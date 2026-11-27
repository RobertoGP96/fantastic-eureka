"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  setBaseCurrency,
  toggleCurrency,
} from "@/app/actions/currency-actions";
import { runAction } from "@/lib/run-action";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";

export interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBase: boolean;
  active: boolean;
  kind: string;
  accountCount: number;
  denominationCount: number;
}

/**
 * Lista de monedas: UNA tarjeta con una fila por divisa. Cada fila enlaza a
 * su detalle (denominaciones) y lleva sus acciones: «Hacer base» (con
 * confirmación en drawer: cambia en qué moneda se consolidan los totales) y
 * ocultar/activar (de un toque). El alta vive en el drawer de la página.
 */
export function CurrencyManager({
  currencies,
}: {
  currencies: CurrencyItem[];
}) {
  const { showToast } = useUI();
  // La moneda y el «abierto» van aparte: al cerrar, el drawer sigue
  // pintando su código mientras dura la animación de salida.
  const [newBase, setNewBase] = useState<CurrencyItem | null>(null);
  const [baseOpen, setBaseOpen] = useState(false);

  const toggle = async (id: string) => {
    const result = await runAction(() => toggleCurrency(id));
    showToast(
      result.success
        ? result.data.active
          ? "Moneda activada"
          : "Moneda oculta"
        : result.error
    );
  };

  const makeBase = async () => {
    if (!newBase) return null;
    const result = await runAction(() => setBaseCurrency(newBase.id));
    if (!result.success) return result.error;
    showToast("Moneda base actualizada");
    setBaseOpen(false);
    return null;
  };

  return (
    <>
      {currencies.length > 0 && (
        <Card padding="none" className="divide-y divide-line-2 overflow-hidden">
          {currencies.map((currency) => (
            // El enlace al detalle y los botones son HERMANOS (un botón
            // dentro de un <a> no es válido). En móvil los botones bajan a
            // una segunda línea; en escritorio comparten la fila.
            <div
              key={currency.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
            >
              <Link
                href={`/monedas/${currency.id}`}
                className="group flex min-w-0 flex-1 basis-60 items-center gap-3"
              >
                <span
                  className={cn(
                    "flex size-9 flex-none items-center justify-center rounded-xl bg-chip font-semibold text-brand-ink",
                    // Símbolos largos («CUC$») no caben a tamaño normal.
                    currency.symbol.length > 2 ? "text-[11px]" : "text-sm"
                  )}
                >
                  {currency.symbol}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-heading transition-colors group-hover:text-brand-ink">
                      {currency.code}
                    </span>
                    {currency.isBase && <Badge variant="featured">Base</Badge>}
                    {currency.kind === "DIGITAL" && (
                      <Badge variant="neutral">Digital</Badge>
                    )}
                    {/* Oculta: insignia y contraste normal, no opacidad. */}
                    {!currency.active && (
                      <Badge variant="neutral">Oculta</Badge>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {currency.name} · {currency.decimalPlaces} dec ·{" "}
                    {currency.kind === "DIGITAL"
                      ? "sin efectivo"
                      : `${currency.denominationCount} denominaciones`}
                    {currency.accountCount > 0 &&
                      ` · ${currency.accountCount} cuentas`}
                  </span>
                </span>
                {/* Pista táctil de que la fila abre el detalle; con ratón
                    basta el realce del código al pasar por encima. */}
                <ChevronRight className="size-4 flex-none text-muted dense:hidden" />
              </Link>

              {/* La base no se oculta ni se «hace base»: sin acciones. */}
              {!currency.isBase && (
                <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNewBase(currency);
                      setBaseOpen(true);
                    }}
                  >
                    <Star className="size-3.5" />
                    Hacer base
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void toggle(currency.id)}
                  >
                    {currency.active ? "Ocultar" : "Activar"}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      <ConfirmDrawer
        open={baseOpen}
        onClose={() => setBaseOpen(false)}
        title={`¿Hacer de ${newBase?.code ?? ""} la moneda base?`}
        description="Los totales se consolidarán en esta moneda. Las tasas registradas no cambian: solo hace falta un par (directo o inverso) entre cada moneda y la nueva base."
        confirmLabel="Confirmar base"
        busyLabel="Guardando…"
        tone="default"
        onConfirm={makeBase}
      />
    </>
  );
}

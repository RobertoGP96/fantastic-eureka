"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { ConfirmDrawer } from "@/components/confirm-drawer";
import { CardGrid } from "@/components/page-body";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
 * Rejilla de monedas. Cada tarjeta enlaza a su detalle (denominaciones) y
 * lleva sus acciones: «Hacer base» (con confirmación, cambia en qué moneda
 * se consolidan los totales) y ocultar/activar (de un toque). El alta vive
 * en el drawer de la página.
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
      <CardGrid>
        {currencies.map((currency) => (
          <div
            key={currency.id}
            className={cn(
              "flex flex-col rounded-2xl border border-line bg-card",
              !currency.active && "opacity-55"
            )}
          >
            <Link
              href={`/monedas/${currency.id}`}
              className="press flex flex-1 items-center gap-3 rounded-2xl p-4 hover:bg-chip/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-chip text-base font-bold text-brand-ink">
                {currency.symbol}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-bold text-heading">
                    {currency.code}
                  </span>
                  {currency.isBase && <Badge variant="featured">Base</Badge>}
                  {currency.kind === "DIGITAL" && (
                    <Badge variant="neutral">Digital</Badge>
                  )}
                  {!currency.active && <Badge variant="neutral">Oculta</Badge>}
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
              <ChevronRight className="size-4 flex-none text-muted" />
            </Link>

            {/* La base no se oculta ni se «hace base»: sin acciones. */}
            {!currency.isBase && (
              <div className="flex items-center justify-end gap-2 border-t border-line-2 px-3 py-2">
                <Button
                  size="sm"
                  variant="chip"
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
      </CardGrid>

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

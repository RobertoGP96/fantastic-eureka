"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCurrency,
  setBaseCurrency,
  toggleCurrency,
} from "@/app/actions/currency-actions";
import { useUI } from "@/lib/ui-store";
import { type CurrencyKind } from "@/lib/domain";
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

const DECIMAL_OPTIONS = ["0", "2", "3", "4"];

// `hint` describe la opción elegida bajo el control segmentado.
const KIND_OPTIONS: { value: CurrencyKind; label: string; hint: string }[] = [
  { value: "CASH", label: "Efectivo", hint: "con billetes y monedas" },
  {
    value: "DIGITAL",
    label: "Digital",
    hint: "solo saldo, sin denominaciones",
  },
];

export function CurrencyManager({
  currencies,
}: {
  currencies: CurrencyItem[];
}) {
  const router = useRouter();
  const { showToast } = useUI();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("$");
  const [decimals, setDecimals] = useState("2");
  const [kind, setKind] = useState<CurrencyKind>("CASH");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmBaseId, setConfirmBaseId] = useState<string | null>(null);

  const add = async () => {
    setSaving(true);
    setError(null);
    const result = await createCurrency({
      code,
      name,
      symbol,
      decimalPlaces: Number(decimals),
      kind,
    });
    setSaving(false);
    if (result.success) {
      showToast("Moneda creada");
      setCode("");
      setName("");
      setSymbol("$");
      setDecimals("2");
      setKind("CASH");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  const toggle = async (id: string) => {
    const result = await toggleCurrency(id);
    if (result.success) {
      showToast(result.data.active ? "Moneda activada" : "Moneda oculta");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const makeBase = async (id: string) => {
    setConfirmBaseId(null);
    const result = await setBaseCurrency(id);
    if (result.success) {
      showToast("Moneda base actualizada");
      router.refresh();
    } else {
      showToast(result.error);
    }
  };

  const kindHint = KIND_OPTIONS.find((option) => option.value === kind)?.hint;

  return (
    <div className="grid gap-5 @4xl/main:grid-cols-12">
      {/* Primero en el DOM (arriba en móvil); en escritorio pasa a la
          derecha con order-2. */}
      <div className="flex min-w-0 flex-col gap-3 @4xl/main:order-2 @4xl/main:col-span-4">
        <Card asChild>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void add();
            }}
          >
            <CardTitle>Nueva moneda</CardTitle>
            <div className="flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="MXN"
                maxLength={6}
                className="min-w-0 flex-1"
                aria-label="Código"
                required
              />
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="$"
                maxLength={4}
                className="w-20 flex-none"
                aria-label="Símbolo"
                required
              />
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Peso mexicano"
              maxLength={60}
              aria-label="Nombre"
              required
            />
            <div className="flex flex-col gap-1.5">
              <Segmented
                layout="fill"
                ariaLabel="Clasificación"
                options={KIND_OPTIONS}
                value={kind}
                onValueChange={setKind}
              />
              {kindHint && (
                <p className="text-xs text-muted first-letter:uppercase">
                  {kindHint}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Select value={decimals} onValueChange={setDecimals}>
                <SelectTrigger
                  variant="form"
                  className="min-w-0 flex-1"
                  aria-label="Decimales"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECIMAL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option} decimales
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="submit"
                className="flex-none"
                disabled={
                  saving || !code.trim() || !name.trim() || !symbol.trim()
                }
              >
                <Plus className="size-4" />
                Añadir
              </Button>
            </div>
            {error && (
              <div className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger">
                {error}
              </div>
            )}
          </form>
        </Card>

        <p className="text-xs text-muted">
          La moneda base es en la que se consolidan los totales. Las tasas se
          registran por pares en{" "}
          <Link
            href="/tasas"
            className="font-semibold text-brand-ink hover:text-brand-mid"
          >
            Tasas
          </Link>
          , así que cambiar la base no invalida ninguna: solo hace falta que
          exista un par (directo o inverso) entre cada moneda y la nueva base.
        </p>
      </div>

      {currencies.length > 0 && (
        <Card
          padding="none"
          className="min-w-0 divide-y divide-line-2 self-start overflow-hidden @4xl/main:col-span-8"
        >
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

              {!currency.isBase && (
                <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
                  {confirmBaseId === currency.id ? (
                    <>
                      <span className="text-xs text-muted">
                        Los totales se consolidarán en esta moneda
                      </span>
                      <Button
                        size="sm"
                        onClick={() => void makeBase(currency.id)}
                      >
                        Confirmar base
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmBaseId(null)}
                      >
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmBaseId(currency.id)}
                    >
                      <Star className="size-3.5" />
                      Hacer base
                    </Button>
                  )}
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
    </div>
  );
}

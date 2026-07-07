"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

export interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBase: boolean;
  active: boolean;
  accountCount: number;
  denominationCount: number;
}

const DECIMAL_OPTIONS = ["0", "2", "3", "4"];

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
    });
    setSaving(false);
    if (result.success) {
      showToast("Moneda creada");
      setCode("");
      setName("");
      setSymbol("$");
      setDecimals("2");
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

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void add();
        }}
      >
        <div className="text-[13px] font-bold text-navy">Nueva moneda</div>
        <div className="flex gap-2.5">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="MXN"
            maxLength={6}
            className="w-24"
            aria-label="Código"
            required
          />
          <Input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="$"
            maxLength={4}
            className="w-16"
            aria-label="Símbolo"
            required
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Peso mexicano"
            maxLength={60}
            aria-label="Nombre"
            required
          />
        </div>
        <div className="flex items-center gap-2.5">
          <Select value={decimals} onValueChange={setDecimals}>
            <SelectTrigger className="h-10 rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
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
            className="ml-auto"
            disabled={saving || !code.trim() || !name.trim() || !symbol.trim()}
          >
            <Plus className="h-4 w-4" />
            Añadir
          </Button>
        </div>
        {error && (
          <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
            {error}
          </div>
        )}
      </form>

      <div className="flex flex-col gap-2">
        {currencies.map((currency) => (
          <div
            key={currency.id}
            className={`rounded-[18px] border border-line bg-white p-4 ${
              currency.active ? "" : "opacity-55"
            }`}
          >
            <div className="flex items-center gap-3">
              <Link
                href={`/monedas/${currency.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-chip text-[15px] font-bold text-brand">
                  {currency.symbol}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-navy">
                      {currency.code}
                    </span>
                    {currency.isBase && <Badge variant="featured">Base</Badge>}
                    {!currency.active && (
                      <Badge variant="neutral">Oculta</Badge>
                    )}
                  </span>
                  <span className="block truncate text-[11.5px] text-muted">
                    {currency.name} · {currency.decimalPlaces} dec ·{" "}
                    {currency.denominationCount} denominaciones
                    {currency.accountCount > 0 &&
                      ` · ${currency.accountCount} cuentas`}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 flex-none text-muted-2" />
              </Link>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2 border-t border-line-2 pt-2.5">
              {!currency.isBase &&
                (confirmBaseId === currency.id ? (
                  <>
                    <span className="mr-auto text-[11px] text-muted">
                      Revisa las tasas tras el cambio
                    </span>
                    <Button size="sm" onClick={() => void makeBase(currency.id)}>
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
                    variant="chip"
                    onClick={() => setConfirmBaseId(currency.id)}
                  >
                    <Star className="h-3.5 w-3.5" />
                    Hacer base
                  </Button>
                ))}
              {!currency.isBase && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void toggle(currency.id)}
                >
                  {currency.active ? "Ocultar" : "Activar"}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11.5px] text-muted">
        Las tasas de cambio se cotizan contra la moneda base. Si cambias la
        base, registra tasas nuevas en{" "}
        <Link href="/tasas" className="font-semibold text-brand-mid">
          Tasas
        </Link>
        .
      </p>
    </div>
  );
}

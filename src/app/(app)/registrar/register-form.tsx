"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  registerIncomeExpense,
  registerTransfer,
} from "@/app/actions/transaction-actions";
import {
  convertMinor,
  convertMinorInverse,
  invertRateScaled,
  minorToAmountInput,
  parseAmountToMinor,
  RATE_SCALE,
} from "@/lib/money";
import { fmtMinor } from "@/lib/format";
import {
  buildPairMap,
  resolveRateScaled,
  type PairRateLite,
} from "@/lib/rate-resolve";
import { useUI } from "@/lib/ui-store";

export interface AccountOption {
  id: string;
  name: string;
  currency: { id: string; code: string; decimalPlaces: number };
}

export interface CategoryOption {
  id: string;
  name: string;
  kind: string;
}

export interface CurrencyOption {
  id: string;
  code: string;
  decimalPlaces: number;
}

// Las tasas se escriben con la misma precisión con que se almacenan (×10 000).
const RATE_DECIMALS = { decimalPlaces: 4 };

type RateDirection = "AMOUNT_TO_ACCOUNT" | "ACCOUNT_TO_AMOUNT";

type Mode = "gasto" | "ingreso" | "transferencia";

const MODES: { key: Mode; label: string }[] = [
  { key: "gasto", label: "Gasto" },
  { key: "ingreso", label: "Ingreso" },
  { key: "transferencia", label: "Transferencia" },
];

const todayISO = () => new Date().toISOString().slice(0, 10);

export function RegisterForm({
  accounts,
  categories,
  currencies,
  pairRates,
  baseCurrencyId,
  initialMode,
  initialAccountId,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  currencies: CurrencyOption[];
  pairRates: PairRateLite[];
  baseCurrencyId: string | null;
  initialMode: Mode;
  initialAccountId?: string;
}) {
  const router = useRouter();
  const { showToast } = useUI();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [accountId, setAccountId] = useState(
    initialAccountId ?? accounts[0]?.id ?? ""
  );
  const [counterAccountId, setCounterAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [counterAmount, setCounterAmount] = useState("");
  // "" = misma moneda de la cuenta; otro id = operación multi-moneda
  const [amountCurrencyId, setAmountCurrencyId] = useState("");
  const [rate, setRate] = useState("");
  const [rateDirection, setRateDirection] =
    useState<RateDirection>("ACCOUNT_TO_AMOUNT");
  const [prefilledPair, setPrefilledPair] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const from = accounts.find((a) => a.id === accountId);
  const to = accounts.find((a) => a.id === counterAccountId);
  const crossCurrency =
    mode === "transferencia" &&
    !!from &&
    !!to &&
    from.currency.id !== to.currency.id;

  const kind = mode === "gasto" ? "EXPENSE" : "INCOME";
  const modeCategories = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind]
  );

  const pairMap = useMemo(() => buildPairMap(pairRates), [pairRates]);

  // Moneda en que se escribe el monto (solo ingreso/gasto)
  const accountCurrency = from?.currency;
  const opCurrency =
    mode !== "transferencia"
      ? currencies.find(
          (c) => c.id === (amountCurrencyId || accountCurrency?.id)
        )
      : undefined;
  const crossCurrencyOp =
    !!accountCurrency && !!opCurrency && opCurrency.id !== accountCurrency.id;

  // Prellena la tasa definida al cambiar el par monto↔cuenta, en la dirección
  // más legible (número ≥ 1, ej. "1 USD = 400 CUP"). Editable después.
  const pairId =
    crossCurrencyOp && opCurrency && accountCurrency
      ? `${opCurrency.id}→${accountCurrency.id}`
      : "";
  if (pairId !== prefilledPair) {
    setPrefilledPair(pairId);
    if (pairId && opCurrency && accountCurrency) {
      const toAccount = resolveRateScaled(
        pairMap,
        opCurrency.id,
        accountCurrency.id,
        baseCurrencyId
      );
      const toAmount = resolveRateScaled(
        pairMap,
        accountCurrency.id,
        opCurrency.id,
        baseCurrencyId
      );
      if (toAccount !== null && (toAmount === null || toAccount >= RATE_SCALE)) {
        setRateDirection("AMOUNT_TO_ACCOUNT");
        setRate(minorToAmountInput(toAccount, RATE_DECIMALS));
      } else if (toAmount !== null) {
        setRateDirection("ACCOUNT_TO_AMOUNT");
        setRate(minorToAmountInput(toAmount, RATE_DECIMALS));
      } else {
        setRate("");
      }
    }
  }

  // Vista previa del monto convertido a la moneda de la cuenta
  let convertedPreview: string | null = null;
  if (crossCurrencyOp && opCurrency && accountCurrency) {
    try {
      const opMinor = parseAmountToMinor(amount, opCurrency);
      const rateScaled = parseAmountToMinor(rate, RATE_DECIMALS);
      if (opMinor > 0 && rateScaled > 0) {
        const minor =
          rateDirection === "ACCOUNT_TO_AMOUNT"
            ? convertMinorInverse(opMinor, opCurrency, accountCurrency, rateScaled)
            : convertMinor(opMinor, opCurrency, accountCurrency, rateScaled);
        if (minor > 0) convertedPreview = fmtMinor(minor, accountCurrency);
      }
    } catch {
      convertedPreview = null;
    }
  }

  const flipRateDirection = () => {
    setRateDirection((d) =>
      d === "AMOUNT_TO_ACCOUNT" ? "ACCOUNT_TO_AMOUNT" : "AMOUNT_TO_ACCOUNT"
    );
    // Reaprovecha la tasa escrita invirtiéndola; si no se puede, se limpia.
    try {
      const rateScaled = parseAmountToMinor(rate, RATE_DECIMALS);
      setRate(
        rateScaled > 0
          ? minorToAmountInput(invertRateScaled(rateScaled), RATE_DECIMALS)
          : ""
      );
    } catch {
      setRate("");
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setCategoryId("");
    setError(null);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const occurredAt = new Date(`${date}T12:00:00`);

    const result =
      mode === "transferencia"
        ? await registerTransfer({
            accountId,
            counterAccountId,
            amount,
            counterAmount: crossCurrency ? counterAmount : undefined,
            note: note.trim() || undefined,
            occurredAt,
          })
        : await registerIncomeExpense({
            kind,
            accountId,
            amount,
            amountCurrencyId:
              crossCurrencyOp && opCurrency ? opCurrency.id : undefined,
            rate: crossCurrencyOp ? rate : undefined,
            rateDirection: crossCurrencyOp ? rateDirection : undefined,
            categoryId: categoryId || undefined,
            note: note.trim() || undefined,
            occurredAt,
          });

    setSaving(false);
    if (result.success) {
      showToast(
        mode === "gasto"
          ? "Gasto registrado"
          : mode === "ingreso"
            ? "Ingreso registrado"
            : "Transferencia registrada"
      );
      router.push("/");
      router.refresh();
    } else {
      setError(result.error);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-[16px] border border-line bg-white px-4 py-6 text-center text-[13px] text-muted">
        Primero crea una cuenta para poder registrar movimientos.
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid grid-cols-3 gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => switchMode(m.key)}
            className={`rounded-[13px] border px-2 py-2.5 text-[12.5px] font-semibold transition-colors ${
              mode === m.key
                ? "border-brand bg-chip text-brand"
                : "border-line bg-white text-ink-soft hover:border-brand-soft"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          {mode === "transferencia" ? "Cuenta de origen" : "Cuenta"}
        </span>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
            <SelectValue placeholder="Elige cuenta" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} · {account.currency.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {mode === "transferencia" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Cuenta de destino
          </span>
          <Select value={counterAccountId} onValueChange={setCounterAccountId}>
            <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
              <SelectValue placeholder="Elige cuenta" />
            </SelectTrigger>
            <SelectContent>
              {accounts
                .filter((account) => account.id !== accountId)
                .map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} · {account.currency.code}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-ink-soft">
          Monto
          {mode === "transferencia" && from
            ? ` (${from.currency.code})`
            : opCurrency
              ? ` (${opCurrency.code})`
              : ""}
        </span>
        <div className="flex gap-2">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            required
            className="flex-1"
          />
          {mode !== "transferencia" && currencies.length > 1 && (
            <Select
              value={opCurrency?.id ?? ""}
              onValueChange={setAmountCurrencyId}
            >
              <SelectTrigger
                aria-label="Moneda del monto"
                className="h-10 w-28 flex-none rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink"
              >
                <SelectValue placeholder="Moneda" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.id} value={currency.id}>
                    {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {mode !== "transferencia" && !crossCurrencyOp && currencies.length > 1 && (
          <span className="text-[11.5px] text-muted">
            Puedes anotar el monto en otra moneda y se convertirá a la de la
            cuenta.
          </span>
        )}
      </label>

      {crossCurrencyOp && opCurrency && accountCurrency && from && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Tasa (1{" "}
            {rateDirection === "AMOUNT_TO_ACCOUNT"
              ? `${opCurrency.code} = ? ${accountCurrency.code}`
              : `${accountCurrency.code} = ? ${opCurrency.code}`}
            )
          </span>
          <div className="flex gap-2">
            <Input
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              required
              className="flex-1"
            />
            <button
              type="button"
              onClick={flipRateDirection}
              aria-label="Invertir la dirección de la tasa"
              className="flex h-10 w-10 flex-none items-center justify-center rounded-[13px] border border-line bg-white text-ink-soft transition-colors hover:border-brand-soft"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>
          </div>
          <span className="text-[11.5px] text-muted">
            {convertedPreview
              ? `Se registrará ${convertedPreview} en «${from.name}».`
              : `La cuenta es en ${accountCurrency.code}: el monto se convertirá con esta tasa.`}
          </span>
        </div>
      )}

      {crossCurrency && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Monto recibido ({to?.currency.code})
          </span>
          <Input
            value={counterAmount}
            onChange={(e) => setCounterAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0"
            required
          />
          <span className="text-[11.5px] text-muted">
            Las cuentas usan monedas distintas: indica cuánto entra en destino.
          </span>
        </label>
      )}

      {mode !== "transferencia" && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Categoría (opcional)
          </span>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-10 w-full rounded-[13px] border border-line bg-white px-3.5 text-sm text-ink">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              {modeCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Fecha
          </span>
          <Input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12.5px] font-semibold text-ink-soft">
            Nota (opcional)
          </span>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Detalle"
          />
        </label>
      </div>

      {error && (
        <div className="rounded-[13px] bg-danger-bg px-3.5 py-2.5 text-[12.5px] font-medium text-danger">
          {error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={
          saving ||
          !accountId ||
          !amount.trim() ||
          (crossCurrencyOp && !rate.trim()) ||
          (mode === "transferencia" &&
            (!counterAccountId || (crossCurrency && !counterAmount.trim())))
        }
      >
        {saving ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}

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
import { countedTotalMinor } from "@/lib/counting";
import {
  DenominationBreakdownField,
  type BreakdownDenomination,
} from "@/components/denomination-breakdown-field";
import { Field, FIELD_SELECT, FormError } from "@/components/form-field";
import { SplitLayout } from "@/components/page-body";
import { useUI } from "@/lib/ui-store";
import { toLocalDateISO } from "@/lib/dates";
import { runAction } from "@/lib/run-action";
import { cn } from "@/lib/utils";

export interface AccountOption {
  id: string;
  name: string;
  currency: { id: string; code: string; decimalPlaces: number };
}

/** Denominaciones (con stock derivado) por cuenta CASH_BOX. */
export type CashBoxStockMap = Record<string, BreakdownDenomination[]>;

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

const MODES: { value: Mode; label: string }[] = [
  { value: "gasto", label: "Gasto" },
  { value: "ingreso", label: "Ingreso" },
  { value: "transferencia", label: "Transferencia" },
];

// Radix Select no admite value "": valor especial para «Sin categoría».
const NO_CATEGORY = "__none__";

// Fecha LOCAL: con toISOString() (UTC) el formulario proponía «mañana»
// cada noche y el movimiento se guardaba 24 h en el futuro.
const todayISO = () => toLocalDateISO();

export function RegisterForm({
  accounts,
  categories,
  currencies,
  pairRates,
  baseCurrencyId,
  cashBoxStock,
  initialMode,
  initialAccountId,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  currencies: CurrencyOption[];
  pairRates: PairRateLite[];
  baseCurrencyId: string | null;
  cashBoxStock: CashBoxStockMap;
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
  // Desglose de denominaciones por lado (solo cuentas CASH_BOX)
  const [originLines, setOriginLines] = useState<Record<string, number>>({});
  const [destLines, setDestLines] = useState<Record<string, number>>({});
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
  let convertedMinor: number | null = null;
  if (crossCurrencyOp && opCurrency && accountCurrency) {
    try {
      const opMinor = parseAmountToMinor(amount, opCurrency);
      const rateScaled = parseAmountToMinor(rate, RATE_DECIMALS);
      if (opMinor > 0 && rateScaled > 0) {
        const minor =
          rateDirection === "ACCOUNT_TO_AMOUNT"
            ? convertMinorInverse(opMinor, opCurrency, accountCurrency, rateScaled)
            : convertMinor(opMinor, opCurrency, accountCurrency, rateScaled);
        if (minor > 0) convertedMinor = minor;
      }
    } catch {
      convertedMinor = null;
    }
  }
  const convertedPreview =
    convertedMinor !== null && accountCurrency
      ? fmtMinor(convertedMinor, accountCurrency)
      : null;

  // Monto parseado sin lanzar (para cuadrar el desglose antes de enviar)
  const safeMinor = (
    text: string,
    cur: { decimalPlaces: number } | undefined
  ): number | null => {
    if (!cur) return null;
    try {
      const minor = parseAmountToMinor(text, cur);
      return minor > 0 ? minor : null;
    } catch {
      return null;
    }
  };

  // Desglose de denominaciones: aplica cuando el lado es una caja CASH_BOX
  // con denominaciones. El monto a cuadrar va SIEMPRE en la moneda de la
  // cuenta afectada (convertido si la operación es multi-moneda).
  const originBoxDenoms = cashBoxStock[accountId];
  const destBoxDenoms =
    mode === "transferencia" ? cashBoxStock[counterAccountId] : undefined;

  const originTarget =
    mode === "transferencia" || !crossCurrencyOp
      ? safeMinor(amount, from?.currency)
      : convertedMinor;
  const destTarget = crossCurrency
    ? safeMinor(counterAmount, to?.currency)
    : safeMinor(amount, from?.currency);

  const originOutflow = mode !== "ingreso";
  const originBreakdownOk =
    !originBoxDenoms?.length ||
    (originTarget !== null &&
      countedTotalMinor(originBoxDenoms, originLines) === originTarget);
  const destBreakdownOk =
    !destBoxDenoms?.length ||
    (destTarget !== null &&
      countedTotalMinor(destBoxDenoms, destLines) === destTarget);

  // Contar primero: el total del desglose se copia al campo de monto del
  // lado correspondiente, así se ve el saldo que se va formando. El camino
  // inverso (escribir el monto y «Sugerir distribución») sigue disponible.
  // En operaciones multi-moneda el monto se escribe en OTRA divisa, por lo
  // que el desglose de origen no lo rellena (debe cuadrar con el convertido).
  const originDrivesAmount = mode === "transferencia" || !crossCurrencyOp;
  const totalInput = (
    denoms: BreakdownDenomination[],
    lines: Record<string, number>,
    cur: { decimalPlaces: number }
  ) => {
    const total = countedTotalMinor(denoms, lines);
    return total > 0 ? minorToAmountInput(total, cur) : "";
  };
  const changeOriginLines = (next: Record<string, number>) => {
    setOriginLines(next);
    if (originDrivesAmount && originBoxDenoms?.length && from) {
      setAmount(totalInput(originBoxDenoms, next, from.currency));
    }
  };
  const changeDestLines = (next: Record<string, number>) => {
    setDestLines(next);
    if (!destBoxDenoms?.length || !to) return;
    const text = totalInput(destBoxDenoms, next, to.currency);
    if (crossCurrency) setCounterAmount(text);
    else setAmount(text);
  };

  const linesPayload = (
    lines: Record<string, number>
  ): { denominationId: string; quantity: number }[] | undefined => {
    const entries = Object.entries(lines)
      .filter(([, qty]) => qty > 0)
      .map(([denominationId, quantity]) => ({ denominationId, quantity }));
    return entries.length > 0 ? entries : undefined;
  };

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

  // Cambiar de tipo conserva el desglose ya contado (y el monto): la cuenta
  // de origen no cambia, así que lo contado sigue valiendo. La categoría sí
  // se limpia porque depende del tipo.
  const switchMode = (next: Mode) => {
    setMode(next);
    setCategoryId("");
    setError(null);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    // Fecha elegida + hora actual: así los movimientos del mismo día
    // conservan el orden en que se registraron.
    const now = new Date();
    const [y, m, d] = date.split("-").map(Number);
    const occurredAt = new Date(
      y,
      m - 1,
      d,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    );

    const result = await runAction(() =>
      mode === "transferencia"
        ? registerTransfer({
            accountId,
            counterAccountId,
            amount,
            counterAmount: crossCurrency ? counterAmount : undefined,
            note: note.trim() || undefined,
            occurredAt,
            denominationLines: originBoxDenoms?.length
              ? linesPayload(originLines)
              : undefined,
            counterDenominationLines: destBoxDenoms?.length
              ? linesPayload(destLines)
              : undefined,
          })
        : registerIncomeExpense({
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
            denominationLines: originBoxDenoms?.length
              ? linesPayload(originLines)
              : undefined,
          })
    );

    if (result.success) {
      // `saving` se queda en true: el botón no debe reactivarse mientras
      // navega, o un segundo toque duplicaría el movimiento.
      showToast(
        mode === "gasto"
          ? "Gasto registrado"
          : mode === "ingreso"
            ? "Ingreso registrado"
            : "Transferencia registrada"
      );
      // Tras guardar se vuelve al detalle de la cuenta afectada (en
      // transferencias, la de origen), no al Inicio. Diferido: navegar en
      // el mismo tick en que resuelve la action hace que Next descarte su
      // resultado y vuelva a pedir la página. Sin `router.refresh()`: la
      // action ya revalida las rutas afectadas.
      setTimeout(() => router.push(`/cuentas/${accountId}`), 0);
    } else {
      setSaving(false);
      setError(result.error);
    }
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-card px-4 py-6 text-center text-sm text-muted md:max-w-md">
        Primero crea una cuenta para poder registrar movimientos.
      </div>
    );
  }

  // Los desgloses van ANTES del monto que rellenan; en multi-moneda el de
  // origen baja tras la tasa porque cuadra con el monto ya convertido.
  const originBreakdown = !!originBoxDenoms?.length && from && (
    <DenominationBreakdownField
      title={
        originOutflow
          ? `Sale de «${from.name}» (denominaciones)`
          : `Entra en «${from.name}» (denominaciones)`
      }
      denominations={originBoxDenoms}
      currency={from.currency}
      targetMinor={originTarget}
      quantities={originLines}
      onQtyChange={changeOriginLines}
      outflow={originOutflow}
      drivesAmount={originDrivesAmount}
    />
  );
  const destBreakdown = !!destBoxDenoms?.length && to && (
    <DenominationBreakdownField
      title={`Entra en «${to.name}» (denominaciones)`}
      denominations={destBoxDenoms}
      currency={to.currency}
      targetMinor={destTarget}
      quantities={destLines}
      onQtyChange={changeDestLines}
      outflow={false}
      drivesAmount
    />
  );

  // Resumen de lo que se va a guardar (solo en el lateral de escritorio).
  // Puramente informativo: reutiliza los montos ya calculados arriba.
  const typedCurrency =
    mode !== "transferencia" && crossCurrencyOp ? opCurrency : from?.currency;
  const typedMinor = safeMinor(amount, typedCurrency);
  const summaryAmount =
    typedMinor !== null && typedCurrency
      ? fmtMinor(typedMinor, typedCurrency)
      : null;
  const summaryDetail =
    mode === "transferencia"
      ? crossCurrency && destTarget !== null && to
        ? `Entran ${fmtMinor(destTarget, to.currency)}`
        : null
      : convertedPreview
        ? `Equivale a ${convertedPreview}`
        : null;

  return (
    <form
      // Mientras no cabe en dos columnas, una sola de ancho de lectura; al
      // partirse (SplitLayout) ocupa todo el panel.
      className="max-w-xl @4xl:max-w-none"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {/* Escritorio: campos a la izquierda y, fijo a la derecha, resumen +
          fecha/nota + Guardar. En móvil el lateral cae al final y el orden
          es el de siempre (… categoría, fecha, nota, Guardar). */}
      <SplitLayout
        main={
          <>
            {/* No usa ChoiceGroup: «Transferencia» en tres columnas de móvil
                solo cabe con el relleno lateral justo (px-2). */}
            <div
              role="radiogroup"
              aria-label="Tipo de movimiento"
              className="grid grid-cols-3 gap-2"
            >
              {MODES.map((option) => {
                const active = mode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => switchMode(option.value)}
                    className={cn(
                      "min-h-11 rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
                      active
                        ? "border-brand-ink bg-chip text-brand-ink"
                        : "border-line bg-card text-ink-soft hover:border-brand-soft"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div
              className={cn(
                "grid gap-4",
                mode === "transferencia" && "@xl:grid-cols-2"
              )}
            >
              <Field
                label={mode === "transferencia" ? "Cuenta de origen" : "Cuenta"}
              >
                <Select
                  value={accountId}
                  onValueChange={(id) => {
                    setAccountId(id);
                    setOriginLines({});
                    // El destino no puede ser la nueva cuenta de origen.
                    if (id === counterAccountId) {
                      setCounterAccountId("");
                      setDestLines({});
                    }
                  }}
                >
                  <SelectTrigger className={FIELD_SELECT}>
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
              </Field>

              {mode === "transferencia" && (
                <Field label="Cuenta de destino">
                  <Select
                    value={counterAccountId}
                    onValueChange={(id) => {
                      setCounterAccountId(id);
                      setDestLines({});
                    }}
                  >
                    <SelectTrigger className={FIELD_SELECT}>
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
                </Field>
              )}
            </div>

            {originDrivesAmount && originBreakdown}
            {!crossCurrency && destBreakdown}

            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink-soft">
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
                        className={cn(FIELD_SELECT, "w-28 flex-none")}
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
              </label>
              {/* Fuera del <label>: dentro, este texto pasaba a formar parte
                  del nombre accesible del campo de monto. */}
              {mode !== "transferencia" &&
                !crossCurrencyOp &&
                currencies.length > 1 && (
                  <span className="text-xs text-muted">
                    Puedes anotar el monto en otra moneda y se convertirá a la
                    de la cuenta.
                  </span>
                )}
            </div>

            {crossCurrencyOp && opCurrency && accountCurrency && from && (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-semibold text-ink-soft">
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
                    className="flex size-11 flex-none items-center justify-center rounded-xl border border-input bg-card text-ink-soft transition-colors hover:border-brand-ink hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  >
                    <ArrowRightLeft className="size-4" />
                  </button>
                </div>
                <span className="text-xs text-muted">
                  {convertedPreview
                    ? `Se registrará ${convertedPreview} en «${from.name}».`
                    : `La cuenta es en ${accountCurrency.code}: el monto se convertirá con esta tasa.`}
                </span>
              </div>
            )}

            {!originDrivesAmount && originBreakdown}

            {crossCurrency && (
              <>
                {destBreakdown}
                <Field
                  label={`Monto recibido (${to?.currency.code})`}
                  hint="Las cuentas usan monedas distintas: indica cuánto entra en destino."
                >
                  <Input
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0"
                    required
                  />
                </Field>
              </>
            )}

            {mode !== "transferencia" && (
              <Field label="Categoría (opcional)">
                <Select
                  value={categoryId}
                  onValueChange={(value) =>
                    setCategoryId(value === NO_CATEGORY ? "" : value)
                  }
                >
                  <SelectTrigger className={FIELD_SELECT}>
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Sin este ítem, una vez elegida una categoría no había
                        forma de quitarla (Radix no admite value ""). */}
                    <SelectItem value={NO_CATEGORY}>Sin categoría</SelectItem>
                    {modeCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </>
        }
        aside={
          <>
            {/* Solo en dos columnas: en móvil el monto ya queda a la vista
                junto al botón y el flujo es el de siempre. */}
            <div className="hidden flex-col gap-1 rounded-2xl border border-line bg-card p-4 @4xl:flex">
              <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
                {MODES.find((option) => option.value === mode)?.label}
              </span>
              <span className="money text-[22px] font-bold tracking-[-0.4px] text-heading">
                {summaryAmount ?? "—"}
              </span>
              <span className="truncate text-xs text-muted">
                {from?.name ?? "Sin cuenta"}
                {mode === "transferencia" ? ` → ${to?.name ?? "…"}` : ""}
              </span>
              {summaryDetail && (
                <span className="text-xs font-medium text-brand-ink">
                  {summaryDetail}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 @md:grid-cols-2 @4xl:grid-cols-1">
              <Field label="Fecha">
                <Input
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Nota (opcional)">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={200}
                  placeholder="Detalle"
                />
              </Field>
            </div>

            <FormError>{error}</FormError>

            <Button
              type="submit"
              size="lg"
              disabled={
                saving ||
                !accountId ||
                !amount.trim() ||
                (crossCurrencyOp && !rate.trim()) ||
                (mode === "transferencia" &&
                  (!counterAccountId ||
                    (crossCurrency && !counterAmount.trim()))) ||
                !originBreakdownOk ||
                !destBreakdownOk
              }
            >
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </>
        }
      />
    </form>
  );
}

import Link from "next/link";
import { Coins, LineChart, PencilLine, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAccountIcon } from "@/lib/account-icons";
import type { AccountWithBalance } from "@/lib/balances";
import { totalsByCurrency } from "@/lib/balances-core";
import type { DashboardWidget } from "@/lib/dashboard-prefs";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";
import { fmtMinor, fmtRate } from "@/lib/format";
import { incomeCardData } from "@/lib/metrics";
import type { BaseCurrencyInfo } from "@/lib/metrics-core";
import { toTxRow } from "@/lib/tx-rows";
import { TxList } from "@/components/tx-list";
import { DenominationAvailability } from "@/components/denomination-availability";
import { IncomeCard } from "@/components/income-card";
import { RateSparkline } from "@/components/rate-sparkline";

// Gadgets del dashboard (server components): tarjeta de una cuenta,
// totales por divisa y tasa de un par. Se instancian desde las
// preferencias del usuario (src/lib/dashboard-prefs.ts).

function WidgetPlaceholder({ message }: { message: string }) {
  return (
    <section className="rounded-[18px] border border-dashed border-line bg-white p-4 text-center text-[12.5px] text-muted">
      {message}
    </section>
  );
}

/** Tarjeta de UNA cuenta (de caja o no): saldo, accesos y extras opcionales. */
export async function AccountCardWidget({
  userId,
  widget,
  account,
}: {
  userId: string;
  widget: DashboardWidget;
  account: AccountWithBalance | undefined;
}) {
  if (!account) {
    return (
      <WidgetPlaceholder message="La cuenta de este gadget ya no existe o está archivada. Edítalo desde «Personalizar Inicio»." />
    );
  }

  const Icon = getAccountIcon(account.icon, account.type);
  const negative = account.balanceMinor < 0;

  const transactions = widget.showMovements
    ? await prisma.transaction.findMany({
        where: {
          userId,
          OR: [{ accountId: account.id }, { counterAccountId: account.id }],
        },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 3,
        include: {
          account: { select: { name: true } },
          counterAccount: { select: { name: true } },
          currency: { select: { code: true, decimalPlaces: true } },
          counterCurrency: { select: { code: true, decimalPlaces: true } },
          category: { select: { name: true } },
        },
      })
    : [];
  // Últimos movimientos en orden cronológico (el más reciente al final).
  const rows = transactions
    .map((tx) => toTxRow(tx, account.id, account.currency))
    .reverse();

  return (
    <div className="flex flex-col gap-2.5">
      <section className="rounded-[18px] border border-line bg-white p-4">
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-chip text-brand">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/cuentas/${account.id}`}
              className="block truncate text-[13.5px] font-semibold text-navy hover:text-brand"
            >
              {account.name}
            </Link>
            <div className="text-[11.5px] text-muted">
              {ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type}{" "}
              · {account.currency.code}
            </div>
          </div>
          <div
            className={`text-[17px] font-bold whitespace-nowrap ${
              negative ? "text-danger" : "text-navy"
            }`}
          >
            {fmtMinor(account.balanceMinor, account.currency)}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-line-2 pt-2.5">
          <Link
            href={`/registrar?cuenta=${account.id}`}
            className="flex items-center gap-1.5 rounded-lg bg-chip px-[11px] py-1.5 text-[11.5px] font-semibold text-brand transition-colors hover:bg-brand-soft/30"
          >
            <Plus className="h-3.5 w-3.5" />
            Registrar aquí
          </Link>
          <Link
            href={`/cuentas/${account.id}`}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-[11px] py-1.5 text-[11.5px] font-semibold text-muted transition-colors hover:text-brand"
          >
            <PencilLine className="h-3.5 w-3.5" />
            Ver cuenta
          </Link>
        </div>
        {widget.showMovements && (
          <div className="mt-2.5">
            {rows.length > 0 ? (
              <TxList rows={rows} />
            ) : (
              <p className="py-2 text-center text-[12px] text-muted">
                Sin movimientos todavía.
              </p>
            )}
          </div>
        )}
      </section>
      {widget.showDenominations && account.type === "CASH_BOX" && (
        <DenominationAvailability
          userId={userId}
          accountId={account.id}
          currency={account.currency}
        />
      )}
    </div>
  );
}

/** Suma de saldos por divisa, sin conversión (complementa el consolidado). */
export function CurrencyTotalsWidget({
  accounts,
}: {
  accounts: AccountWithBalance[];
}) {
  const totals = totalsByCurrency(accounts);
  if (totals.length === 0) {
    return (
      <WidgetPlaceholder message="Sin cuentas todavía: los totales por moneda aparecerán aquí." />
    );
  }
  return (
    <section className="h-full rounded-[18px] border border-line bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[13.5px] font-bold text-navy">
        <Coins className="h-4 w-4 text-brand" />
        Totales por moneda
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {totals.map((total) => (
          <div
            key={total.currency.id}
            className="rounded-[14px] bg-app px-3 py-2.5"
          >
            <div className="text-[10.5px] font-medium tracking-wide text-muted uppercase">
              {total.currency.code}
            </div>
            <div
              className={`mt-0.5 text-[14.5px] font-bold ${
                total.totalMinor < 0 ? "text-danger" : "text-navy"
              }`}
            >
              {fmtMinor(total.totalMinor, total.currency)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** «Resumen de ingresos»: consulta las series y renderiza la tarjeta cliente. */
export async function IncomeCardWidget({
  userId,
  widget,
  base,
}: {
  userId: string;
  widget: DashboardWidget;
  base: (BaseCurrencyInfo & { code: string }) | null;
}) {
  const data = await incomeCardData(userId, base, widget.accountId);
  if (!data) {
    return (
      <WidgetPlaceholder
        message={
          widget.accountId
            ? "La cuenta de este gadget ya no existe. Edítalo desde «Personalizar Inicio»."
            : "Define una moneda base en /monedas para ver este gadget."
        }
      />
    );
  }
  return (
    <IncomeCard
      heading={widget.title || data.accountName || "Resumen de ingresos"}
      config={{
        variant: widget.variant ?? "soft",
        metric: widget.metric ?? "income",
        defaultPeriod: widget.defaultPeriod ?? "month",
        showTabs: widget.showTabs !== false,
        showDelta: widget.showDelta !== false,
        showIncome: widget.showIncome !== false,
        showExpense: widget.showExpense !== false,
        showNet: widget.showNet !== false,
      }}
      currency={data.currency}
      series={data.series}
      missingRates={data.missingRates}
    />
  );
}

/** Última tasa de un par con su tendencia (misma fuente que /tasas). */
export function RatePairWidget({
  fromCode,
  toCode,
  values,
}: {
  fromCode: string;
  toCode: string;
  values: number[];
}) {
  const latest = values.at(-1);
  return (
    <section className="flex h-full flex-col justify-center rounded-[18px] border border-line bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-chip text-brand">
          <LineChart className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/tasas/${fromCode}/${toCode}`}
            className="block text-[13.5px] font-semibold text-navy hover:text-brand"
          >
            {fromCode} → {toCode}
          </Link>
          <div className="text-[11.5px] text-muted">
            {latest !== undefined
              ? `1 ${fromCode} = ${fmtRate(latest)} ${toCode}`
              : "Sin tasas registradas para este par"}
          </div>
        </div>
        {values.length > 1 && <RateSparkline values={values} />}
      </div>
    </section>
  );
}

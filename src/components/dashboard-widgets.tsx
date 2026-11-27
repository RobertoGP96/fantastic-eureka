import Link from "next/link";
import { Coins, LineChart, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAccountIcon } from "@/lib/account-icons";
import type { AccountWithBalance } from "@/lib/balances";
import { totalsByCurrency } from "@/lib/balances-core";
import type { DashboardWidget } from "@/lib/dashboard-prefs";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";
import { fmtMinor, fmtRate } from "@/lib/format";
import { activityMapData, incomeCardData } from "@/lib/metrics";
import type { BaseCurrencyInfo } from "@/lib/metrics-core";
import { toTxRow } from "@/lib/tx-rows";
import { ActivityMapCard } from "@/components/activity-map";
import { TxList } from "@/components/tx-list";
import { DenominationAvailability } from "@/components/denomination-availability";
import { IncomeCard } from "@/components/income-card";
import { RateSparkline } from "@/components/rate-sparkline";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Gadgets del dashboard (server components): tarjeta de una cuenta, totales
// por divisa, tasa de un par, resumen de ingresos y mapa de actividad. Se
// instancian desde las preferencias del usuario (src/lib/dashboard-prefs.ts).

function WidgetPlaceholder({ message }: { message: string }) {
  return (
    <Card dashed className="flex h-full items-center justify-center text-center text-sm text-muted">
      {message}
    </Card>
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
    <div className="flex h-full flex-col gap-3">
      <Card asChild className="flex-1">
        <section>
          <div className="flex items-center gap-3">
            <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={`/cuentas/${account.id}`}
                className="block truncate text-sm font-semibold text-heading hover:text-brand-ink"
              >
                {account.name}
              </Link>
              <div className="truncate text-xs text-muted">
                {ACCOUNT_TYPE_LABELS[account.type as AccountType] ??
                  account.type}{" "}
                · {account.currency.code}
              </div>
            </div>
          </div>
          <div
            className={`money mt-3 text-xl font-semibold tracking-tight ${
              negative ? "text-danger" : "text-heading"
            }`}
          >
            {fmtMinor(account.balanceMinor, account.currency)}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={`/registrar?cuenta=${account.id}`}
              className={buttonVariants({ variant: "chip", size: "sm" })}
            >
              <Plus className="size-3.5" />
              Registrar aquí
            </Link>
            <Link
              href={`/cuentas/${account.id}`}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Ver cuenta
            </Link>
          </div>
          {widget.showMovements && (
            <div className="mt-3 border-t border-line-2 pt-1">
              {rows.length > 0 ? (
                <TxList rows={rows} bare />
              ) : (
                <p className="py-3 text-center text-xs text-muted">
                  Sin movimientos todavía.
                </p>
              )}
            </div>
          )}
        </section>
      </Card>
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
    <Card asChild className="h-full">
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-heading">
          <Coins className="size-4 text-brand-ink" />
          Totales por moneda
        </h2>
        <div className="grid grid-cols-2 gap-2 @2xl/main:grid-cols-3">
          {totals.map((total) => (
            <div
              key={total.currency.id}
              className="rounded-xl bg-subtle px-3 py-2.5"
            >
              <div className="text-[11px] font-medium text-muted">
                {total.currency.code}
              </div>
              <div
                className={`money mt-0.5 text-base font-semibold ${
                  total.totalMinor < 0 ? "text-danger" : "text-heading"
                }`}
              >
                {fmtMinor(total.totalMinor, total.currency)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </Card>
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
      // key: el período elegido vive en estado del cliente; sin ella, cambiar
      // «Empieza en» en el personalizador no surtía efecto hasta recargar.
      key={widget.defaultPeriod ?? "month"}
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
    <Card asChild className="flex h-full flex-col justify-center">
      <section>
        <div className="flex items-center gap-3">
          <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
            <LineChart className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <Link
              href={`/tasas/${fromCode}/${toCode}`}
              className="block text-sm font-semibold text-heading hover:text-brand-ink"
            >
              {fromCode} → {toCode}
            </Link>
            <div className="text-xs text-muted">
              {latest !== undefined
                ? `1 ${fromCode} = ${fmtRate(latest)} ${toCode}`
                : "Sin tasas registradas para este par"}
            </div>
          </div>
          {values.length > 1 && <RateSparkline values={values} />}
        </div>
      </section>
    </Card>
  );
}

/** «Mapa de actividad»: movimientos por día del último año. */
export async function ActivityMapWidget({ userId }: { userId: string }) {
  const map = await activityMapData(userId);
  return <ActivityMapCard map={map} />;
}

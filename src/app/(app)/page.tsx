import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Banknote,
  Wallet,
} from "lucide-react";
import { getAccountIcon } from "@/lib/account-icons";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { UpcomingInstallments } from "@/components/upcoming-installments";
import { MonthlyBars } from "@/components/monthly-bars";
import { UserMenu } from "@/components/user-menu";
import { requireSessionUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  latestRatesByCurrency,
  listAccountsWithBalances,
} from "@/lib/balances";
import { dashboardMetrics } from "@/lib/metrics";
import { deltaPct } from "@/lib/metrics-core";
import { fmtMinor } from "@/lib/format";
import { convertMinor } from "@/lib/money";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/registrar?tipo=gasto", icon: ArrowUpRight, label: "Gasto" },
  { href: "/registrar?tipo=ingreso", icon: ArrowDownLeft, label: "Ingreso" },
  {
    href: "/registrar?tipo=transferencia",
    icon: ArrowRightLeft,
    label: "Transferir",
  },
  { href: "/conteo", icon: Banknote, label: "Arqueo" },
];

export default async function HomePage() {
  const user = await requireSessionUser();
  const [accounts, base, rates] = await Promise.all([
    listAccountsWithBalances(user.id),
    prisma.currency.findFirst({ where: { isBase: true, userId: user.id } }),
    latestRatesByCurrency(user.id),
  ]);
  const metrics = base ? await dashboardMetrics(user.id, base) : null;

  let consolidatedMinor = 0;
  const missingRates = new Set<string>(metrics?.missingRates ?? []);
  if (base) {
    for (const account of accounts) {
      if (account.currency.id === base.id) {
        consolidatedMinor += account.balanceMinor;
      } else {
        const rate = rates.get(account.currency.id);
        if (rate) {
          consolidatedMinor += convertMinor(
            account.balanceMinor,
            account.currency,
            base,
            rate.rateScaled
          );
        } else if (account.balanceMinor !== 0) {
          missingRates.add(account.currency.code);
        }
      }
    }
  }

  const current = metrics?.series.at(-1);
  const previous = metrics?.series.at(-2);
  const incomeDelta =
    current && previous
      ? deltaPct(current.incomeMinor, previous.incomeMinor)
      : null;
  const expenseDelta =
    current && previous
      ? deltaPct(current.expenseMinor, previous.expenseMinor)
      : null;
  const hasSeriesData =
    metrics?.series.some((m) => m.incomeMinor > 0 || m.expenseMinor > 0) ??
    false;
  const maxCategory = metrics?.topCategories[0]?.totalMinor ?? 0;

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title={APP_NAME}
        actions={
          <div className="md:hidden">
            <UserMenu userName={user.name} userEmail={user.email} />
          </div>
        }
      >
        <div className="mt-3">
          <div className="text-[11.5px] font-medium tracking-wide text-white/60 uppercase">
            Total consolidado
          </div>
          <div className="mt-0.5 text-[28px] font-bold tracking-[-0.5px]">
            {base ? fmtMinor(consolidatedMinor, base) : "—"}
          </div>
          {missingRates.size > 0 && (
            <div className="mt-1 text-[11.5px] text-white/60">
              Sin tasa para {[...missingRates].join(", ")} ·{" "}
              <Link href="/tasas" className="underline">
                registrar tasa
              </Link>
            </div>
          )}
        </div>
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-6 px-5 pt-5 md:px-0">
        <div className="grid grid-cols-4 gap-2.5 md:max-w-md">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-1.5 rounded-[16px] border border-line bg-white py-3 text-[11px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-chip text-brand">
                  <Icon className="h-4 w-4" />
                </span>
                {action.label}
              </Link>
            );
          })}
        </div>

        {base && current && metrics && (
          <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <div className="rounded-[16px] border border-line bg-white p-3.5">
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Ingresos del mes
              </div>
              <div className="mt-0.5 text-[17px] font-bold text-ok">
                {fmtMinor(current.incomeMinor, base)}
              </div>
              {incomeDelta !== null && previous && (
                <div
                  className={`mt-0.5 text-[11px] font-semibold ${
                    incomeDelta >= 0 ? "text-ok" : "text-danger"
                  }`}
                >
                  {incomeDelta >= 0 ? "+" : ""}
                  {incomeDelta}% vs {previous.label}
                </div>
              )}
            </div>
            <div className="rounded-[16px] border border-line bg-white p-3.5">
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Gastos del mes
              </div>
              <div className="mt-0.5 text-[17px] font-bold text-danger">
                {fmtMinor(current.expenseMinor, base)}
              </div>
              {expenseDelta !== null && previous && (
                <div
                  className={`mt-0.5 text-[11px] font-semibold ${
                    expenseDelta > 0 ? "text-danger" : "text-ok"
                  }`}
                >
                  {expenseDelta >= 0 ? "+" : ""}
                  {expenseDelta}% vs {previous.label}
                </div>
              )}
            </div>
            <Link
              href="/deudas"
              className="rounded-[16px] border border-line bg-white p-3.5 transition-colors hover:border-brand-soft"
            >
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Por cobrar
              </div>
              <div className="mt-0.5 text-[17px] font-bold text-brand">
                {fmtMinor(metrics.receivableMinor, base)}
              </div>
            </Link>
            <Link
              href="/deudas?dir=pagar"
              className="rounded-[16px] border border-line bg-white p-3.5 transition-colors hover:border-brand-soft"
            >
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Por pagar
              </div>
              <div className="mt-0.5 text-[17px] font-bold text-warn">
                {fmtMinor(metrics.payableMinor, base)}
              </div>
            </Link>
          </section>
        )}

        {base && metrics && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-[18px] border border-line bg-white p-4">
              <h2 className="mb-3 text-[13.5px] font-bold text-navy">
                Ingresos vs gastos · últimos 6 meses
              </h2>
              {hasSeriesData ? (
                <MonthlyBars series={metrics.series} currency={base} />
              ) : (
                <p className="py-6 text-center text-[12.5px] text-muted">
                  Registra movimientos para ver la evolución mensual.
                </p>
              )}
            </section>

            {metrics.topCategories.length > 0 && (
              <section className="rounded-[18px] border border-line bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[13.5px] font-bold text-navy">
                    Top gastos del mes
                  </h2>
                  <Link
                    href="/movimientos"
                    className="text-[12px] font-semibold text-brand-mid hover:text-brand"
                  >
                    Ver todo
                  </Link>
                </div>
                <div className="flex flex-col gap-2.5">
                  {metrics.topCategories.map((category) => (
                    <div key={category.name}>
                      <div className="flex items-baseline justify-between text-[12px]">
                        <span className="font-semibold text-ink-soft">
                          {category.name}
                        </span>
                        <span className="font-bold text-navy">
                          {fmtMinor(category.totalMinor, base)}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-app">
                        <div
                          className="grad-progress h-2 rounded-full"
                          style={{
                            width: `${Math.max(
                              4,
                              Math.round(
                                (category.totalMinor /
                                  Math.max(1, maxCategory)) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        <UpcomingInstallments userId={user.id} />

        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-[14.5px] font-bold text-navy">Cuentas</h2>
            <Link
              href="/cuentas/nueva"
              className="text-[12px] font-semibold text-brand-mid hover:text-brand"
            >
              + Nueva cuenta
            </Link>
          </div>

          {accounts.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Sin cuentas todavía"
              description="Crea tu primera cuenta o caja para empezar a registrar movimientos."
              ctaLabel="Crear cuenta"
              ctaHref="/cuentas/nueva"
            />
          ) : (
            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3">
              {accounts.map((account) => {
                const Icon = getAccountIcon(account.icon, account.type);
                const negative = account.balanceMinor < 0;
                return (
                  <Link
                    key={account.id}
                    href={`/cuentas/${account.id}`}
                    className="flex items-center gap-3.5 rounded-[18px] border border-line bg-white p-4 transition-colors hover:border-brand-soft"
                  >
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-chip text-brand">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-semibold text-navy">
                        {account.name}
                      </div>
                      <div className="text-[11.5px] text-muted">
                        {account.currency.code}
                      </div>
                    </div>
                    <div
                      className={`text-[15px] font-bold whitespace-nowrap ${
                        negative ? "text-danger" : "text-navy"
                      }`}
                    >
                      {fmtMinor(account.balanceMinor, account.currency)}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

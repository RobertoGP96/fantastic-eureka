import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Banknote,
  CreditCard,
  Landmark,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { UpcomingInstallments } from "@/components/upcoming-installments";
import { APP_NAME } from "@/lib/config";
import { prisma } from "@/lib/db";
import {
  latestRatesByCurrency,
  listAccountsWithBalances,
} from "@/lib/balances";
import { fmtMinor } from "@/lib/format";
import { convertMinor } from "@/lib/money";

export const dynamic = "force-dynamic";

const TYPE_ICONS: Record<string, LucideIcon> = {
  CASH: Banknote,
  BANK: Landmark,
  DIGITAL: CreditCard,
};

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
  const [accounts, base, rates] = await Promise.all([
    listAccountsWithBalances(),
    prisma.currency.findFirst({ where: { isBase: true } }),
    latestRatesByCurrency(),
  ]);

  let consolidatedMinor = 0;
  const missingRates = new Set<string>();
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

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title={APP_NAME}>
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

        <UpcomingInstallments />

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
                const Icon = TYPE_ICONS[account.type] ?? Wallet;
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

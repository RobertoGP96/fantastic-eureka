import Link from "next/link";
import { Archive, FolderOpen, Plus, Wallet } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  latestRatesByCurrency,
  listAccountsWithBalances,
  type AccountWithBalance,
} from "@/lib/balances";
import { totalsByCurrency } from "@/lib/balances-core";
import { fmtMinor } from "@/lib/format";
import { convertMinor } from "@/lib/money";
import { AccountCard } from "./account-card";

export const dynamic = "force-dynamic";

interface Section {
  key: string;
  name: string | null;
  accounts: AccountWithBalance[];
  subtotalMinor: number | null;
}

export default async function CuentasPage() {
  const user = await requireSessionUser();
  const [accounts, groups, base, rates, archivedCount] = await Promise.all([
    listAccountsWithBalances(user.id),
    prisma.accountGroup.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.currency.findFirst({ where: { isBase: true, userId: user.id } }),
    latestRatesByCurrency(user.id),
    prisma.account.count({ where: { userId: user.id, archived: true } }),
  ]);

  const sections: Section[] =
    groups.length > 0
      ? [
          ...groups.map((group) => ({
            key: group.id,
            name: group.name,
            accounts: accounts.filter((a) => a.group?.id === group.id),
            subtotalMinor: null,
          })),
          {
            key: "none",
            name: "Sin grupo",
            accounts: accounts.filter((a) => !a.group),
            subtotalMinor: null,
          },
        ]
      : [{ key: "all", name: null, accounts, subtotalMinor: null }];

  const visible = sections.filter((section) => section.accounts.length > 0);

  // Subtotal por grupo consolidado a la base; se omite si falta alguna tasa.
  if (base) {
    for (const section of visible) {
      let subtotal = 0;
      let complete = true;
      for (const account of section.accounts) {
        if (account.currency.id === base.id) {
          subtotal += account.balanceMinor;
        } else {
          const rate = rates.get(account.currency.id);
          if (rate) {
            subtotal += convertMinor(
              account.balanceMinor,
              account.currency,
              base,
              rate.rateScaled
            );
          } else if (account.balanceMinor !== 0) {
            complete = false;
            break;
          }
        }
      }
      section.subtotalMinor = complete ? subtotal : null;
    }
  }

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Cuentas" />

      <div className="anim-fade-up flex flex-1 flex-col gap-5 px-5 pt-5 md:px-0">
        <div className="flex justify-end gap-2">
          {archivedCount > 0 && (
            <Link
              href="/cuentas/archivadas"
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-[11px] py-1.5 text-[11.5px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand"
            >
              <Archive className="h-3.5 w-3.5" />
              Archivadas ({archivedCount})
            </Link>
          )}
          <Link
            href="/cuentas/grupos"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-[11px] py-1.5 text-[11.5px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Grupos
          </Link>
          <Link
            href="/cuentas/nueva"
            className="flex items-center gap-1.5 rounded-lg bg-brand px-[11px] py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-brand-mid"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva cuenta
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
          visible.map((section) => {
            // Totales por cada divisa usada en el grupo (sin conversión):
            // visibles aunque falten tasas para el consolidado en base. Si el
            // grupo entero está en la base, el consolidado ya es exacto y los
            // chips serían redundantes.
            const currencyTotals = totalsByCurrency(section.accounts);
            const onlyBase =
              currencyTotals.length === 1 &&
              currencyTotals[0].currency.id === base?.id;
            return (
            <section key={section.key}>
              {section.name && (
                <div className="mb-2 flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-[13.5px] font-bold text-navy">
                      {section.name}
                    </h2>
                    {base && section.subtotalMinor !== null && (
                      <span
                        className="text-[12px] font-semibold text-muted"
                        title={`Consolidado en ${base.code}`}
                      >
                        {onlyBase ? "" : "≈ "}
                        {fmtMinor(section.subtotalMinor, base)}
                      </span>
                    )}
                  </div>
                  {!onlyBase && currencyTotals.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {currencyTotals.map((total) => (
                        <span
                          key={total.currency.id}
                          className={`rounded-full bg-chip px-2.5 py-0.5 text-[11px] font-semibold ${
                            total.totalMinor < 0
                              ? "text-danger"
                              : "text-brand"
                          }`}
                        >
                          {fmtMinor(total.totalMinor, total.currency)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3">
                {section.accounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </section>
            );
          })
        )}
      </div>
    </main>
  );
}

import Link from "next/link";
import { FolderOpen, Plus, Wallet } from "lucide-react";
import { getAccountIcon } from "@/lib/account-icons";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  latestRatesByCurrency,
  listAccountsWithBalances,
  type AccountWithBalance,
} from "@/lib/balances";
import { fmtMinor } from "@/lib/format";
import { convertMinor } from "@/lib/money";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";

export const dynamic = "force-dynamic";

function AccountCard({ account }: { account: AccountWithBalance }) {
  const Icon = getAccountIcon(account.icon, account.type);
  const negative = account.balanceMinor < 0;
  return (
    <Link
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
          {ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type} ·{" "}
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
}

interface Section {
  key: string;
  name: string | null;
  accounts: AccountWithBalance[];
  subtotalMinor: number | null;
}

export default async function CuentasPage() {
  const user = await requireSessionUser();
  const [accounts, groups, base, rates] = await Promise.all([
    listAccountsWithBalances(user.id),
    prisma.accountGroup.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.currency.findFirst({ where: { isBase: true, userId: user.id } }),
    latestRatesByCurrency(user.id),
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
          visible.map((section) => (
            <section key={section.key}>
              {section.name && (
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-[13.5px] font-bold text-navy">
                    {section.name}
                  </h2>
                  {base && section.subtotalMinor !== null && (
                    <span className="text-[12px] font-semibold text-muted">
                      {fmtMinor(section.subtotalMinor, base)}
                    </span>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 lg:grid-cols-3">
                {section.accounts.map((account) => (
                  <AccountCard key={account.id} account={account} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

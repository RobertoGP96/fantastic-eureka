import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Landmark,
  Plus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { listAccountsWithBalances } from "@/lib/balances";
import { fmtMinor } from "@/lib/format";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";

export const dynamic = "force-dynamic";

const TYPE_ICONS: Record<string, LucideIcon> = {
  CASH: Banknote,
  BANK: Landmark,
  DIGITAL: CreditCard,
};

export default async function CuentasPage() {
  const accounts = await listAccountsWithBalances();

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Cuentas" />

      <div className="anim-fade-up flex flex-1 flex-col gap-2.5 px-5 pt-5 md:grid md:flex-none md:grid-cols-2 md:px-0 lg:grid-cols-3">
        {accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Sin cuentas todavía"
            description="Crea tu primera cuenta o caja para empezar a registrar movimientos."
            ctaLabel="Crear cuenta"
            ctaHref="/cuentas/nueva"
          />
        ) : (
          accounts.map((account) => {
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
                    {ACCOUNT_TYPE_LABELS[account.type as AccountType] ??
                      account.type}{" "}
                    · {account.currency.code}
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
          })
        )}
      </div>

      {accounts.length > 0 && (
        <div className="px-5 pt-4 md:px-0">
          <Link
            href="/cuentas/nueva"
            className="flex items-center justify-center gap-2 rounded-[13px] border border-dashed border-muted-2 py-3.5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand"
          >
            <Plus className="h-4 w-4" />
            Nueva cuenta
          </Link>
        </div>
      )}
    </main>
  );
}

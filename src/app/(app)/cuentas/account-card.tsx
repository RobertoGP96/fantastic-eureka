import Link from "next/link";
import { getAccountIcon } from "@/lib/account-icons";
import type { AccountWithBalance } from "@/lib/balances";
import { fmtMinor } from "@/lib/format";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";

export function AccountCard({ account }: { account: AccountWithBalance }) {
  const Icon = getAccountIcon(account.icon, account.type);
  const negative = account.balanceMinor < 0;
  return (
    <Link
      href={`/cuentas/${account.id}`}
      className="flex items-center gap-3.5 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-soft"
    >
      <span
        className={`flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-chip ${
          account.archived ? "text-muted" : "text-brand"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-navy">
            {account.name}
          </span>
          {account.archived && (
            <span className="flex-none rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold text-muted">
              Archivada
            </span>
          )}
        </div>
        <div className="text-xs text-muted">
          {ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type} ·{" "}
          {account.currency.code}
        </div>
      </div>
      <div
        className={`text-base font-bold whitespace-nowrap ${
          negative ? "text-danger" : "text-navy"
        }`}
      >
        {fmtMinor(account.balanceMinor, account.currency)}
      </div>
    </Link>
  );
}

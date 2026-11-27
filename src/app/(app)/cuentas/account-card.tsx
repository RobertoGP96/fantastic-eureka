import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getAccountIcon } from "@/lib/account-icons";
import type { AccountWithBalance } from "@/lib/balances";
import { fmtMinor } from "@/lib/format";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";

// Tesela de una cuenta (/cuentas y /cuentas/archivadas). Es UN solo enlace
// con nombre, tipo · moneda y saldo: los tests E2E localizan la cuenta así.
export function AccountCard({ account }: { account: AccountWithBalance }) {
  const Icon = getAccountIcon(account.icon, account.type);
  const negative = account.balanceMinor < 0;
  return (
    <Link
      href={`/cuentas/${account.id}`}
      className="flex min-w-0 items-center gap-3 rounded-2xl border border-line bg-card p-4 transition-colors hover:border-brand-soft"
    >
      <span
        className={`flex size-10 flex-none items-center justify-center rounded-xl ${
          account.archived ? "bg-subtle text-muted" : "bg-chip text-brand-ink"
        }`}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-heading">
            {account.name}
          </span>
          {account.archived && <Badge className="flex-none">Archivada</Badge>}
        </div>
        <div className="truncate text-xs text-muted">
          {ACCOUNT_TYPE_LABELS[account.type as AccountType] ?? account.type} ·{" "}
          {account.currency.code}
        </div>
      </div>
      <div
        className={`money text-[15px] font-semibold whitespace-nowrap ${
          negative ? "text-danger" : "text-heading"
        }`}
      >
        {fmtMinor(account.balanceMinor, account.currency)}
      </div>
    </Link>
  );
}

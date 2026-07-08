import Link from "next/link";
import { HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { upcomingInstallments } from "@/lib/debts";
import { daysUntil, dueLabel } from "@/lib/dates";
import { fmtMinor } from "@/lib/format";
import { PLAN_KIND_LABELS, type PlanKind } from "@/lib/domain";

export async function UpcomingInstallments({ userId }: { userId: string }) {
  const rows = await upcomingInstallments(userId, 7);
  if (rows.length === 0) return null;

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[14.5px] font-bold text-navy">
          Próximos vencimientos
        </h2>
        <Link
          href="/deudas"
          className="text-[12px] font-semibold text-brand-mid hover:text-brand"
        >
          Ver deudas
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row) => {
          const days = daysUntil(row.dueAt);
          const contactName =
            row.plan.contact?.name ?? row.plan.debt?.contact.name;
          const overdue = days < 0;
          return (
            <Link
              key={row.id}
              href={
                row.plan.debtId
                  ? `/deudas/${row.plan.debtId}`
                  : `/deudas/plan/${row.plan.id}`
              }
              className="flex items-center gap-3 rounded-[16px] border border-line bg-white px-3.5 py-3 transition-colors hover:border-brand-soft"
            >
              <span
                className={`flex h-9 w-9 flex-none items-center justify-center rounded-[12px] ${
                  overdue ? "bg-danger-bg text-danger" : "bg-chip text-brand"
                }`}
              >
                <HandCoins className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-navy">
                  {row.plan.description}
                </div>
                <div className="truncate text-[11.5px] text-muted">
                  {PLAN_KIND_LABELS[row.plan.kind as PlanKind] ?? row.plan.kind}
                  {contactName ? ` · ${contactName}` : ""}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[13px] font-bold text-navy">
                  {fmtMinor(row.amountMinor, row.plan.currency)}
                </span>
                <Badge
                  variant={overdue ? "danger" : days <= 1 ? "warn" : "neutral"}
                >
                  {dueLabel(row.dueAt)}
                </Badge>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

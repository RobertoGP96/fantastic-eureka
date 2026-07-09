import { upcomingInstallments } from "@/lib/debts";
import { daysUntil, dueLabel } from "@/lib/dates";
import { fmtMinor } from "@/lib/format";
import { PLAN_KIND_LABELS, type PlanKind } from "@/lib/domain";
import {
  NotificationsBell,
  type InstallmentNotice,
} from "@/components/notifications-bell";

const MAX_NOTICES = 8;

/** Trae las cuotas por vencer y las sirve serializadas a la campana. */
export async function InstallmentNotifications({
  userId,
}: {
  userId: string;
}) {
  const rows = await upcomingInstallments(userId, 7);

  const items: InstallmentNotice[] = rows.slice(0, MAX_NOTICES).map((row) => {
    const contactName = row.plan.contact?.name ?? row.plan.debt?.contact.name;
    const kindLabel =
      PLAN_KIND_LABELS[row.plan.kind as PlanKind] ?? row.plan.kind;
    return {
      id: row.id,
      href: row.plan.debtId
        ? `/deudas/${row.plan.debtId}`
        : `/deudas/plan/${row.plan.id}`,
      title: row.plan.description,
      subtitle: contactName ? `${kindLabel} · ${contactName}` : kindLabel,
      amountText: fmtMinor(row.amountMinor, row.plan.currency),
      dueText: dueLabel(row.dueAt),
      overdue: daysUntil(row.dueAt) < 0,
    };
  });

  return <NotificationsBell items={items} />;
}

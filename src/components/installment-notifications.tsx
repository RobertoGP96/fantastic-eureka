import { upcomingInstallments, type UpcomingInstallment } from "@/lib/debts";
import { daysUntil, dueLabel } from "@/lib/dates";
import { fmtMinor } from "@/lib/format";
import { PLAN_KIND_LABELS, type PlanKind } from "@/lib/domain";
import {
  NotificationsBell,
  type InstallmentNotice,
} from "@/components/notifications-bell";

const MAX_NOTICES = 8;

/** Cuotas por vencer → avisos serializables para la campana (cliente). */
export function toInstallmentNotices(
  rows: readonly UpcomingInstallment[]
): InstallmentNotice[] {
  return rows.slice(0, MAX_NOTICES).map((row) => {
    const contactName = row.plan.contact?.name ?? row.plan.debt?.contact.name;
    const kindLabel =
      PLAN_KIND_LABELS[row.plan.kind as PlanKind] ?? row.plan.kind;
    return {
      id: row.id,
      href: row.plan.debtId
        ? `/deudas/${row.plan.debtId}`
        : `/mensualidades/${row.plan.id}`,
      title: row.plan.description,
      subtitle: contactName ? `${kindLabel} · ${contactName}` : kindLabel,
      amountText: fmtMinor(row.amountMinor, row.plan.currency),
      dueText: dueLabel(row.dueAt),
      overdue: daysUntil(row.dueAt) < 0,
    };
  });
}

/**
 * Trae las cuotas por vencer y las sirve a la campana. Vive en el layout de
 * escritorio (dentro de <Suspense>), así que NO puede tumbarlo: un fallo de
 * la BD (arranque en frío de Neon) deja la campana vacía en vez de lanzar,
 * porque el error.tsx de (app) no cubre a su propio layout.
 * upcomingInstallments va con cache(): en Inicio comparte consulta con la
 * sección «Próximos vencimientos».
 */
export async function InstallmentNotifications({
  userId,
}: {
  userId: string;
}) {
  let rows: UpcomingInstallment[] = [];
  try {
    rows = await upcomingInstallments(userId, 7);
  } catch (error) {
    console.error("[notifications] No se pudieron cargar las cuotas", error);
  }
  return <NotificationsBell items={toInstallmentNotices(rows)} />;
}

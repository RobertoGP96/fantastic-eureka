import Link from "next/link";
import { HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/section-header";
import type { UpcomingInstallment } from "@/lib/debts";
import { daysUntil, dueLabel } from "@/lib/dates";
import { fmtMinor } from "@/lib/format";
import { dueTone } from "@/lib/plans-core";
import { PLAN_KIND_LABELS, type PlanKind } from "@/lib/domain";

// Sección «Próximos vencimientos» de Inicio. Recibe las filas ya cargadas
// (la página las pide una vez y las comparte con la campana), así Inicio sabe
// ANTES de repartir columnas si la sección existe o no.
// Los tests la localizan por su <section> + encabezado y esperan que cada
// cuota sea UN solo enlace con descripción, contacto, monto y vencimiento.
export function UpcomingInstallments({
  rows,
  className,
}: {
  rows: readonly UpcomingInstallment[];
  className?: string;
}) {
  if (rows.length === 0) return null;

  return (
    <section className={className}>
      <SectionHeader
        title="Próximos vencimientos"
        action={{ href: "/mensualidades", label: "Ver mensualidades" }}
      />
      <Card padding="none" className="divide-y divide-line-2 overflow-hidden">
        {rows.map((row) => {
          const days = daysUntil(row.dueAt);
          const tone = dueTone(days);
          const contactName =
            row.plan.contact?.name ?? row.plan.debt?.contact.name;
          const overdue = days < 0;
          return (
            <Link
              key={row.id}
              href={
                row.plan.debtId
                  ? `/deudas/${row.plan.debtId}`
                  : `/mensualidades/${row.plan.id}`
              }
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle/60"
            >
              <span
                className={`flex size-9 flex-none items-center justify-center rounded-xl ${
                  overdue ? "bg-danger-bg text-danger" : "bg-chip text-brand-ink"
                }`}
              >
                <HandCoins className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-heading">
                  {row.plan.description}
                </div>
                <div className="truncate text-xs text-muted">
                  {PLAN_KIND_LABELS[row.plan.kind as PlanKind] ?? row.plan.kind}
                  {contactName ? ` · ${contactName}` : ""}
                </div>
              </div>
              <div className="flex flex-none flex-col items-end gap-1">
                <span className="money text-sm font-semibold text-heading">
                  {fmtMinor(row.amountMinor, row.plan.currency)}
                </span>
                <Badge variant={tone}>{dueLabel(row.dueAt)}</Badge>
              </div>
            </Link>
          );
        })}
      </Card>
    </section>
  );
}

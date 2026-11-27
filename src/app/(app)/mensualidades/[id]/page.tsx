import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronRight } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { LinkedAccountEditor } from "@/components/linked-account-editor";
import { SettleInstallment } from "@/components/settle-installment";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { debtRemainingMinor } from "@/lib/debts";
import { fmtMinor, fmtMinorParts, minorToInput } from "@/lib/format";
import { daysUntil, dueLabel } from "@/lib/dates";
import { dueTone, nextPending } from "@/lib/plans-core";
import {
  FREQUENCY_LABELS,
  PLAN_KIND_LABELS,
  type Frequency,
  type PlanKind,
} from "@/lib/domain";
import { PlanButtons } from "./plan-buttons";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// Bloques de la columna lateral que en móvil suben por encima de la columna
// principal (ver la rejilla más abajo).
const ASIDE_FIRST = "order-first @4xl/main:order-none";

export default async function MensualidadDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;

  const plan = await prisma.paymentPlan.findFirst({
    where: { id, userId: user.id },
    include: {
      currency: true,
      contact: true,
      debt: { include: { contact: true } },
      installments: { orderBy: { dueAt: "desc" }, take: 24 },
    },
  });
  if (!plan) notFound();

  const pending = nextPending(plan.installments);
  // Conteo aparte: `installments` viene recortado a las 24 más recientes y
  // un plan largo mostraba como mucho «23 cuotas saldadas».
  const [paidCount, debtRemaining] = await Promise.all([
    prisma.installment.count({ where: { planId: plan.id, status: "PAID" } }),
    plan.debtId ? debtRemainingMinor(plan.debtId) : null,
  ]);
  const settleAccountId = plan.accountId ?? plan.debt?.accountId ?? null;
  const contactName = plan.contact?.name ?? plan.debt?.contact.name ?? null;

  const accounts = await prisma.account.findMany({
    where: { userId: user.id, archived: false, currencyId: plan.currencyId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const amountParts = fmtMinorParts(plan.amountMinor, plan.currency);

  return (
    <Page>
      <ScreenHeader
        title={plan.description}
        subtitle={`${PLAN_KIND_LABELS[plan.kind as PlanKind]} · ${
          FREQUENCY_LABELS[plan.frequency as Frequency]
        } · ${contactName ?? "Sin contacto"}`}
        backHref="/mensualidades"
      >
        <Badge variant={plan.active ? "accent" : "neutral"}>
          {plan.active ? "Activa" : "Finalizada"}
        </Badge>
      </ScreenHeader>

      <PageBody>
        <StatGrid cols={plan.endAt ? 3 : 2}>
          <StatCard
            label="Cuota"
            value={amountParts.amount}
            unit={amountParts.code}
          />
          <StatCard label="Cuotas saldadas" value={paidCount} />
          {plan.endAt && (
            // Tercer KPI: en móvil (rejilla de 2) ocupa la fila entera.
            <StatCard
              label="Termina"
              value={DATE_FMT.format(plan.endAt)}
              className="col-span-2 @2xl/main:col-span-1"
            />
          )}
        </StatGrid>

        {/* Principal + lateral. En móvil todo es una sola columna y la
            lateral se «disuelve» (contents) para repartir sus bloques: la
            próxima cuota y sus ajustes arriba (ASIDE_FIRST) y las acciones
            de finalizar/eliminar al final, tras el historial. */}
        <div className="grid grid-cols-1 gap-5 @4xl/main:grid-cols-12">
          <div className="flex min-w-0 flex-col gap-5 @4xl/main:col-span-8">
            {plan.installments.length > 0 && (
              <section>
                <SectionHeader title="Historial de cuotas" />
                <Card
                  padding="none"
                  className="divide-y divide-line-2 overflow-hidden"
                >
                  {plan.installments.map((inst) => (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="text-sm font-medium text-heading">
                          {DATE_FMT.format(inst.dueAt)}
                        </span>
                        {inst.status === "PAID" ? (
                          <Badge variant="ok">Saldada</Badge>
                        ) : inst.status === "SKIPPED" ? (
                          <Badge variant="neutral">Omitida</Badge>
                        ) : (
                          <Badge variant={dueTone(daysUntil(inst.dueAt))}>
                            {dueLabel(inst.dueAt)}
                          </Badge>
                        )}
                      </div>
                      <span className="money text-[15px] font-semibold whitespace-nowrap text-heading">
                        {fmtMinor(inst.amountMinor, plan.currency)}
                      </span>
                    </div>
                  ))}
                </Card>
              </section>
            )}
          </div>

          <div className="contents @4xl/main:col-span-4 @4xl/main:flex @4xl/main:min-w-0 @4xl/main:flex-col @4xl/main:gap-5">
            {/* La cuenta habitual va pegada (hueco menor) a la tarjeta de la
                cuota: es la cuenta que su formulario trae preseleccionada. */}
            {plan.active && (
              <div className={`flex min-w-0 flex-col gap-2.5 ${ASIDE_FIRST}`}>
                {pending && (
                  <Card asChild>
                    <section>
                      <SectionHeader
                        size="sm"
                        title="Próxima cuota"
                        action={
                          <Badge
                            variant={dueTone(daysUntil(pending.dueAt))}
                            className="flex-none"
                          >
                            <CalendarClock className="size-3" />
                            {dueLabel(pending.dueAt)}
                          </Badge>
                        }
                      />
                      <div className="mb-3">
                        <div className="money text-[15px] font-semibold text-heading">
                          {fmtMinor(pending.amountMinor, plan.currency)}
                        </div>
                        <div className="text-xs text-muted">
                          {DATE_FMT.format(pending.dueAt)}
                        </div>
                      </div>
                      {/* key por cuota y cuenta: re-inicializa el formulario al
                          llegar la cuota siguiente o cambiar la cuenta vinculada. */}
                      <SettleInstallment
                        key={`${pending.id}-${settleAccountId ?? "none"}`}
                        installmentId={pending.id}
                        accounts={accounts}
                        defaultAmount={minorToInput(
                          debtRemaining === null
                            ? pending.amountMinor
                            : Math.min(
                                pending.amountMinor,
                                Math.max(debtRemaining, 0)
                              ),
                          plan.currency.decimalPlaces
                        )}
                        currencyCode={plan.currency.code}
                        kind={plan.kind}
                        defaultAccountId={settleAccountId}
                      />
                    </section>
                  </Card>
                )}
                <Card padding="none" className="px-4 py-3">
                  <LinkedAccountEditor
                    kind="plan"
                    targetId={plan.id}
                    accounts={accounts}
                    currentAccountId={plan.accountId}
                    currencyCode={plan.currency.code}
                  />
                </Card>
              </div>
            )}

            {plan.debt && (
              <Card
                asChild
                interactive
                padding="none"
                className={`flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink-soft hover:text-heading ${ASIDE_FIRST}`}
              >
                <Link href={`/deudas/${plan.debt.id}`}>
                  <span className="min-w-0 truncate">
                    Ver deuda de {plan.debt.contact.name}
                  </span>
                  <ChevronRight className="size-4 flex-none text-muted" />
                </Link>
              </Card>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {plan.active && <PlanButtons planId={plan.id} />}
              <DeleteEntityButton kind="plan" targetId={plan.id} />
            </div>
          </div>
        </div>
      </PageBody>
    </Page>
  );
}

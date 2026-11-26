import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronRight, HandCoins, UserRound } from "lucide-react";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { EntityAvatar } from "@/components/entity-avatar";
import { LinkedAccountEditor } from "@/components/linked-account-editor";
import { PageBody, SplitLayout } from "@/components/page-body";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { SettleInstallment } from "@/components/settle-installment";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { debtRemainingMinor } from "@/lib/debts";
import { fmtMinor, minorToInput } from "@/lib/format";
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

const ASIDE_LINK =
  "press flex items-center gap-3 rounded-2xl border border-line bg-card px-3.5 py-3 hover:border-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

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
  const contact = plan.contact ?? plan.debt?.contact ?? null;

  const accounts = await prisma.account.findMany({
    where: { userId: user.id, archived: false, currencyId: plan.currencyId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title={plan.description} backHref="/mensualidades">
        <div className="mt-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="money text-[28px] font-bold tracking-[-0.5px]">
                {fmtMinor(plan.amountMinor, plan.currency)}
              </div>
              <div className="mt-1 text-sm text-white/80">
                {PLAN_KIND_LABELS[plan.kind as PlanKind]} ·{" "}
                {FREQUENCY_LABELS[plan.frequency as Frequency]}
              </div>
            </div>
            <Badge variant="neutral" className="bg-white/15 text-white">
              {plan.active ? "Activa" : "Finalizada"}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
            <span className="flex items-center gap-1">
              <UserRound className="size-3" />
              {contact?.name ?? "Sin contacto"}
            </span>
            <span>
              {paidCount} cuota{paidCount === 1 ? "" : "s"} saldada
              {paidCount === 1 ? "" : "s"}
            </span>
            {plan.endAt && <span>Termina {DATE_FMT.format(plan.endAt)}</span>}
          </div>
        </div>
      </ScreenHeader>

      <PageBody>
        <SplitLayout
          aside={
            <>
              {plan.active && (
                <LinkedAccountEditor
                  kind="plan"
                  targetId={plan.id}
                  accounts={accounts}
                  currentAccountId={plan.accountId}
                  currencyCode={plan.currency.code}
                />
              )}

              {contact && (
                <Link href={`/contactos/${contact.id}`} className={ASIDE_LINK}>
                  <EntityAvatar name={contact.name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted">Contacto</div>
                    <div className="truncate text-sm font-semibold text-heading">
                      {contact.name}
                    </div>
                  </div>
                  <ChevronRight className="size-4 flex-none text-muted" />
                </Link>
              )}

              {plan.debt && (
                <Link href={`/deudas/${plan.debt.id}`} className={ASIDE_LINK}>
                  <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                    <HandCoins className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1 truncate text-sm font-semibold text-heading">
                    Ver deuda de {plan.debt.contact.name}
                  </div>
                  <ChevronRight className="size-4 flex-none text-muted" />
                </Link>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                {plan.active && <PlanButtons planId={plan.id} />}
                <DeleteEntityButton kind="plan" targetId={plan.id} />
              </div>
            </>
          }
          main={
            <>
              {plan.active && pending && (
                <Section title="Próxima cuota">
                  <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="money text-base font-bold text-heading">
                          {fmtMinor(pending.amountMinor, plan.currency)}
                        </div>
                        <div className="text-xs text-muted">
                          {DATE_FMT.format(pending.dueAt)}
                        </div>
                      </div>
                      <Badge variant={dueTone(daysUntil(pending.dueAt))}>
                        <CalendarClock className="size-3" />
                        {dueLabel(pending.dueAt)}
                      </Badge>
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
                  </div>
                </Section>
              )}

              {plan.installments.length > 0 && (
                <Section title="Historial de cuotas">
                  <div className="anim-stagger flex flex-col gap-1.5">
                    {plan.installments.map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm"
                      >
                        <span className="text-muted">
                          {DATE_FMT.format(inst.dueAt)}
                        </span>
                        <div className="flex items-center gap-2.5">
                          <span className="money font-semibold text-ink-soft">
                            {fmtMinor(inst.amountMinor, plan.currency)}
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
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          }
        />
      </PageBody>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronRight, HandCoins } from "lucide-react";
import { DebtPaymentForm } from "@/components/debt-payment-form";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { EntityAvatar } from "@/components/entity-avatar";
import { PanelDrawer } from "@/components/form-drawer";
import { LinkedAccountEditor } from "@/components/linked-account-editor";
import { PageBody, SplitLayout } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { SettleInstallment } from "@/components/settle-installment";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtMinor, minorToInput } from "@/lib/format";
import { daysUntil, dueLabel } from "@/lib/dates";
import { dueTone } from "@/lib/plans-core";
import {
  DEBT_DIRECTION_LABELS,
  type DebtDirection,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

const PAYMENT_PANEL = "abono";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function DeudaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireSessionUser();
  const { id } = await params;

  const debt = await prisma.debt.findFirst({
    where: { id, userId: user.id },
    include: {
      contact: true,
      currency: true,
      payments: { orderBy: { paidAt: "desc" } },
      plans: {
        include: {
          installments: {
            where: { status: "PENDING" },
            orderBy: { dueAt: "asc" },
          },
        },
      },
    },
  });
  if (!debt) notFound();

  const paid = debt.payments.reduce((acc, p) => acc + p.amountMinor, 0);
  const remaining = debt.totalMinor - paid;
  const pct = Math.min(
    100,
    Math.round((paid / Math.max(1, debt.totalMinor)) * 100)
  );
  const activePlans = debt.plans.filter((plan) => plan.active);
  const pendingInstallments = activePlans
    .flatMap((plan) =>
      plan.installments.map((inst) => ({
        ...inst,
        planKind: plan.kind,
        planAccountId: plan.accountId,
      }))
    )
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  // Enlace a la mensualidad cuando la deuda se cobra/paga por cuotas.
  const planId = activePlans[0]?.id ?? null;

  const accounts = await prisma.account.findMany({
    where: { userId: user.id, archived: false, currencyId: debt.currencyId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const isOpen = debt.status === "OPEN";
  const receivable = debt.direction === "RECEIVABLE";

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title={debt.contact.name} backHref="/deudas">
        <div className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-white/80">
              {debt.description}
            </span>
            <Badge variant="neutral" className="bg-white/15 text-white">
              {DEBT_DIRECTION_LABELS[debt.direction as DebtDirection]}
            </Badge>
          </div>
          <div className="money mt-2 text-[28px] font-bold tracking-[-0.5px]">
            {isOpen ? fmtMinor(remaining, debt.currency) : "Saldada"}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20 md:max-w-md">
            <div
              className="anim-grow-x h-2 rounded-full bg-white/90"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-xs text-white/80">
            Abonado {fmtMinor(paid, debt.currency)} de{" "}
            {fmtMinor(debt.totalMinor, debt.currency)} ({pct}%)
          </div>
        </div>
      </ScreenHeader>

      <PageBody>
        <SplitLayout
          asideFirst
          aside={
            <>
              {isOpen && (
                <div className="flex flex-col gap-2">
                  <PanelButton
                    panel={PAYMENT_PANEL}
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  >
                    <HandCoins className="size-[18px]" />
                    Registrar abono
                  </PanelButton>
                  {/* La cuenta habitual va junto a la acción que la usa. */}
                  <LinkedAccountEditor
                    kind="debt"
                    targetId={debt.id}
                    accounts={accounts}
                    currentAccountId={debt.accountId}
                    currencyCode={debt.currency.code}
                  />
                </div>
              )}

              <Link
                href={`/contactos/${debt.contact.id}`}
                className="press flex items-center gap-3 rounded-2xl border border-line bg-card px-3.5 py-3 hover:border-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <EntityAvatar
                  name={debt.contact.name}
                  tone={receivable ? "ok" : "warn"}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">Contacto</div>
                  <div className="truncate text-sm font-semibold text-heading">
                    {debt.contact.name}
                  </div>
                </div>
                <ChevronRight className="size-4 flex-none text-muted" />
              </Link>
            </>
          }
          main={
            <>
              {isOpen && pendingInstallments.length > 0 && (
                <Section
                  title="Cuotas pendientes"
                  action={
                    planId && (
                      <Link
                        href={`/mensualidades/${planId}`}
                        className="flex items-center gap-0.5 text-xs font-semibold text-brand-ink hover:underline"
                      >
                        Ver mensualidad
                        <ChevronRight className="size-3.5" />
                      </Link>
                    )
                  }
                >
                  <div className="flex flex-col gap-2.5">
                    {pendingInstallments.map((inst) => {
                      const days = daysUntil(inst.dueAt);
                      return (
                        <div
                          key={inst.id}
                          className="flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="money text-sm font-bold text-heading">
                                {fmtMinor(inst.amountMinor, debt.currency)}
                              </div>
                              <div className="text-xs text-muted">
                                {DATE_FMT.format(inst.dueAt)}
                              </div>
                            </div>
                            <Badge variant={dueTone(days)}>
                              <CalendarClock className="size-3" />
                              {dueLabel(inst.dueAt)}
                            </Badge>
                          </div>
                          {/* key: re-inicializa la preselección si cambia la cuenta vinculada */}
                          <SettleInstallment
                            key={inst.planAccountId ?? debt.accountId ?? "none"}
                            installmentId={inst.id}
                            accounts={accounts}
                            defaultAmount={minorToInput(
                              Math.min(inst.amountMinor, remaining),
                              debt.currency.decimalPlaces
                            )}
                            currencyCode={debt.currency.code}
                            kind={inst.planKind}
                            defaultAccountId={
                              inst.planAccountId ?? debt.accountId
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              <Section title="Historial de abonos">
                {debt.payments.length === 0 ? (
                  <p className="rounded-2xl border border-line bg-card px-4 py-5 text-center text-sm text-muted">
                    Todavía no hay abonos.
                  </p>
                ) : (
                  <div className="anim-stagger flex flex-col gap-1.5">
                    {debt.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm"
                      >
                        <span className="text-muted">
                          {DATE_FMT.format(payment.paidAt)}
                        </span>
                        <span className="money font-semibold text-ok">
                          +{fmtMinor(payment.amountMinor, debt.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <div className="flex justify-end">
                <DeleteEntityButton kind="debt" targetId={debt.id} />
              </div>
            </>
          }
        />
      </PageBody>

      {isOpen && (
        <PanelDrawer
          panel={PAYMENT_PANEL}
          title="Registrar abono"
          description={`${receivable ? "Cobro de" : "Pago a"} ${debt.contact.name}`}
        >
          <DebtPaymentForm
            debtId={debt.id}
            accounts={accounts}
            currencyCode={debt.currency.code}
            remainingLabel={fmtMinor(remaining, debt.currency)}
            defaultAccountId={debt.accountId}
          />
        </PanelDrawer>
      )}
    </main>
  );
}

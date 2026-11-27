import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronRight, HandCoins } from "lucide-react";
import { DebtPaymentForm } from "@/components/debt-payment-form";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { EntityAvatar } from "@/components/entity-avatar";
import { PanelDrawer } from "@/components/form-drawer";
import { LinkedAccountEditor } from "@/components/linked-account-editor";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { ProgressBar } from "@/components/progress-bar";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { SettleInstallment } from "@/components/settle-installment";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtMinor, fmtMinorParts, minorToInput } from "@/lib/format";
import { daysUntil, dueLabel } from "@/lib/dates";
import { dueTone } from "@/lib/plans-core";
import {
  DEBT_DIRECTION_LABELS,
  type DebtDirection,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

/** Nombre del drawer de abono (`/deudas/[id]#panel=abono`). */
const PAYMENT_PANEL = "abono";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

// En escritorio hay dos columnas (principal + lateral). En móvil las dos se
// «disuelven» (contents) y sus bloques se intercalan en UNA columna con este
// orden: resumen → cuotas → abono → historial → contacto → eliminar. La cuota
// va antes que el abono libre (quien entra a cobrar la cuota de hoy no debe
// toparse primero con la otra acción) y lo destructivo queda al final.
// Clases literales: Tailwind no ve las compuestas.
const COLUMN =
  "contents @4xl/main:flex @4xl/main:min-w-0 @4xl/main:flex-col @4xl/main:gap-5";
const MOBILE_ORDER = {
  summary: "order-1 @4xl/main:order-none",
  installments: "order-2 @4xl/main:order-none",
  payment: "order-3 @4xl/main:order-none",
  history: "order-4 @4xl/main:order-none",
  contact: "order-5 @4xl/main:order-none",
  remove: "order-6 @4xl/main:order-none",
} as const;

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
  const remainingParts = fmtMinorParts(remaining, debt.currency);

  return (
    <Page>
      <ScreenHeader
        title={debt.contact.name}
        subtitle={debt.description}
        backHref="/deudas"
      >
        <Badge>{DEBT_DIRECTION_LABELS[debt.direction as DebtDirection]}</Badge>
      </ScreenHeader>

      <PageBody>
        {/* Principal (8) + lateral (4). Las columnas son <div>: los tests
            localizan «Cuotas pendientes» por su <section>, que no puede
            quedar dentro de otra. Orden en móvil: ver MOBILE_ORDER. */}
        <div className="grid grid-cols-1 gap-5 @4xl/main:grid-cols-12">
          <div className={`${COLUMN} @4xl/main:col-span-8`}>
            {isOpen && pendingInstallments.length > 0 && (
              <Section
                title="Cuotas pendientes"
                className={MOBILE_ORDER.installments}
                action={
                  planId
                    ? {
                        href: `/mensualidades/${planId}`,
                        label: "Ver mensualidad",
                      }
                    : undefined
                }
              >
                <Card
                  padding="none"
                  className="divide-y divide-line-2 overflow-hidden"
                >
                  {pendingInstallments.map((inst) => {
                    const days = daysUntil(inst.dueAt);
                    return (
                      <div
                        key={inst.id}
                        className="flex flex-col gap-3 px-4 py-3 @4xl/main:flex-row @4xl/main:items-center @4xl/main:gap-5"
                      >
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 @4xl/main:justify-start">
                          <div className="min-w-0">
                            <div className="money text-[15px] font-semibold text-heading">
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
                        <div className="@4xl/main:w-80 @4xl/main:flex-none">
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
                      </div>
                    );
                  })}
                </Card>
              </Section>
            )}

            {/* Siempre presente: sin cuotas ni abonos la columna principal
                quedaría vacía junto a la lateral. */}
            <Section title="Historial de abonos" className={MOBILE_ORDER.history}>
              {debt.payments.length === 0 ? (
                <Card className="py-6 text-center text-sm text-muted">
                  Sin abonos todavía.
                </Card>
              ) : (
                <Card
                  padding="none"
                  className="divide-y divide-line-2 overflow-hidden"
                >
                  {debt.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-heading">
                        {DATE_FMT.format(payment.paidAt)}
                      </span>
                      <span className="money text-[15px] font-semibold whitespace-nowrap text-ok">
                        +{fmtMinor(payment.amountMinor, debt.currency)}
                      </span>
                    </div>
                  ))}
                </Card>
              )}
            </Section>
          </div>

          <div className={`${COLUMN} @4xl/main:col-span-4`}>
            {/* La frase «Abonado X de Y (N%)» aparece UNA sola vez en la
                página y en un único elemento (la pista de la tarjeta): los
                tests la buscan con getByText. */}
            <StatCard
              label="Pendiente"
              size="lg"
              value={isOpen ? remainingParts.amount : "Saldada"}
              unit={isOpen ? remainingParts.code : undefined}
              tone={isOpen ? "default" : "ok"}
              hint={`Abonado ${fmtMinor(paid, debt.currency)} de ${fmtMinor(debt.totalMinor, debt.currency)} (${pct}%)`}
              className={MOBILE_ORDER.summary}
            >
              <ProgressBar percent={pct} />
            </StatCard>

            {isOpen && (
              <Card className={MOBILE_ORDER.payment}>
                {/* El abono libre se registra en un drawer. */}
                <PanelButton
                  panel={PAYMENT_PANEL}
                  className={buttonVariants({ className: "w-full" })}
                >
                  <HandCoins className="size-4" />
                  Registrar abono
                </PanelButton>
                {/* La cuenta habitual va aquí, pegada a la acción que la
                    usa, en vez de en una sección propia. */}
                <div className="mt-3 border-t border-line-2 pt-3">
                  <LinkedAccountEditor
                    kind="debt"
                    targetId={debt.id}
                    accounts={accounts}
                    currentAccountId={debt.accountId}
                    currencyCode={debt.currency.code}
                  />
                </div>
              </Card>
            )}

            <Card
              asChild
              interactive
              padding="none"
              className={`flex items-center gap-3 px-4 py-3 ${MOBILE_ORDER.contact}`}
            >
              <Link href={`/contactos/${debt.contact.id}`}>
                <EntityAvatar
                  name={debt.contact.name}
                  tone={receivable ? "ok" : "warn"}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted">Contacto</div>
                  <div className="truncate text-sm font-medium text-heading">
                    {debt.contact.name}
                  </div>
                </div>
                <ChevronRight className="size-4 flex-none text-muted" />
              </Link>
            </Card>

            <div className={`flex justify-end ${MOBILE_ORDER.remove}`}>
              <DeleteEntityButton kind="debt" targetId={debt.id} />
            </div>
          </div>
        </div>
      </PageBody>

      {isOpen && (
        <PanelDrawer
          panel={PAYMENT_PANEL}
          title="Registrar abono"
          description={`${receivable ? "Cobro de" : "Pago a"} ${debt.contact.name}`}
        >
          {/* key: re-inicializa la preselección si cambia la cuenta vinculada */}
          <DebtPaymentForm
            key={debt.accountId ?? "none"}
            debtId={debt.id}
            accounts={accounts}
            currencyCode={debt.currency.code}
            remainingLabel={fmtMinor(remaining, debt.currency)}
            defaultAccountId={debt.accountId}
          />
        </PanelDrawer>
      )}
    </Page>
  );
}

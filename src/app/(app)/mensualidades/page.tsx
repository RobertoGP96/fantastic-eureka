import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Plus,
} from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { StatGrid } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedLinks } from "@/components/ui/segmented";
import { SettleInstallment } from "@/components/settle-installment";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtMinor, minorToInput } from "@/lib/format";
import { daysUntil, dueLabel } from "@/lib/dates";
import {
  comparePlansByUrgency,
  dueTone,
  monthlyCommitmentByCurrency,
  nextPending,
} from "@/lib/plans-core";
import {
  FREQUENCY_LABELS,
  PLAN_KIND_LABELS,
  type Frequency,
  type PlanKind,
} from "@/lib/domain";
import {
  TotalsStatCard,
  type CurrencyTotal,
} from "../deudas/totals-stat-card";

export const dynamic = "force-dynamic";

// Una cuota se salda desde la propia lista si ya venció o vence dentro de
// esta ventana: es lo que permite despachar varias mensualidades de una vez.
const SETTLE_WINDOW_DAYS = 7;

const FILTERS = [
  { value: "todas", label: "Todas", href: "/mensualidades" },
  { value: "pagar", label: "Que pago", href: "/mensualidades?tipo=pagar" },
  { value: "cobrar", label: "Que cobro", href: "/mensualidades?tipo=cobrar" },
] as const;

export default async function MensualidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const user = await requireSessionUser();
  const { tipo } = await searchParams;
  const kindFilter =
    tipo === "pagar" ? "PAY" : tipo === "cobrar" ? "COLLECT" : null;

  const [plans, accounts] = await Promise.all([
    prisma.paymentPlan.findMany({
      where: { userId: user.id },
      include: {
        currency: true,
        contact: { select: { name: true } },
        debt: {
          select: {
            id: true,
            totalMinor: true,
            accountId: true,
            contact: { select: { name: true } },
            payments: { select: { amountMinor: true } },
          },
        },
        installments: {
          select: { id: true, dueAt: true, amountMinor: true, status: true },
          orderBy: { dueAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.account.findMany({
      where: { userId: user.id, archived: false },
      select: { id: true, name: true, currencyId: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const visible = kindFilter
    ? plans.filter((plan) => plan.kind === kindFilter)
    : plans;

  const rows = visible.map((plan) => {
    const next = nextPending(plan.installments);
    const days = next ? daysUntil(next.dueAt) : null;
    return {
      plan,
      next,
      days,
      nextDueAt: next?.dueAt ?? null,
      description: plan.description,
      paidCount: plan.installments.filter((inst) => inst.status === "PAID")
        .length,
      overdue: plan.installments.some(
        (inst) => inst.status === "PENDING" && daysUntil(inst.dueAt) < 0
      ),
      canSettle: days !== null && days <= SETTLE_WINDOW_DAYS,
    };
  });

  const active = rows
    .filter((row) => row.plan.active)
    .sort(comparePlansByUrgency);
  const ended = rows.filter((row) => !row.plan.active);

  // Compromiso mensual: el equivalente a un mes de cada plan activo,
  // separado por dirección porque uno sale de las cuentas y el otro entra.
  const activePlans = active.map((row) => row.plan);
  const currencyById = new Map(plans.map((p) => [p.currencyId, p.currency]));
  const totalsFor = (kind: PlanKind): CurrencyTotal[] =>
    monthlyCommitmentByCurrency(
      activePlans.filter((p) => p.kind === kind)
    ).flatMap((total) => {
      const currency = currencyById.get(total.currencyId);
      return currency ? [{ amountMinor: total.amountMinor, currency }] : [];
    });
  const payTotals = totalsFor("PAY");
  const collectTotals = totalsFor("COLLECT");
  // Con una sola dirección (lo normal al filtrar) solo hay un KPI: en móvil
  // ocupa las dos columnas en vez de dejar media fila vacía.
  const loneStat =
    payTotals.length === 0 || collectTotals.length === 0
      ? "col-span-2 @2xl/main:col-span-1"
      : undefined;
  const overdueCount = active.filter((row) => row.overdue).length;
  // En escritorio el formulario de saldar va a la derecha de su fila. Si
  // alguna lo lleva, TODAS reservan esa columna: así los montos quedan
  // alineados entre filas con y sin formulario.
  const settleColumn = active.some((row) => row.canSettle);

  return (
    <Page>
      <ScreenHeader
        title="Mensualidades"
        subtitle={`${active.length} activa${active.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Link
              href="/deudas"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Deudas
            </Link>
            <Link
              href="/mensualidades/nueva"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-3.5" />
              Nueva mensualidad
            </Link>
          </>
        }
      >
        {overdueCount > 0 && (
          <Badge variant="danger">{overdueCount} con cuota vencida</Badge>
        )}
      </ScreenHeader>

      <PageBody>
        {(payTotals.length > 0 || collectTotals.length > 0) && (
          <StatGrid cols={2}>
            <TotalsStatCard
              label="Pago al mes"
              totals={payTotals}
              className={loneStat}
            />
            <TotalsStatCard
              label="Cobro al mes"
              totals={collectTotals}
              className={loneStat}
            />
          </StatGrid>
        )}

        <SegmentedLinks
          ariaLabel="Filtrar mensualidades"
          options={FILTERS}
          current={
            kindFilter === "PAY"
              ? "pagar"
              : kindFilter === "COLLECT"
                ? "cobrar"
                : "todas"
          }
          className="self-start"
        />

        {active.length === 0 && ended.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Sin mensualidades"
            description="Renta, suscripciones, cuotas fijas… crea una y te avisamos de cada vencimiento."
            ctaLabel="Nueva mensualidad"
            ctaHref="/mensualidades/nueva"
          />
        ) : (
          active.length > 0 && (
            <Card padding="none" className="divide-y divide-line-2 overflow-hidden">
              {active.map((row) => {
                const { plan, next, days, canSettle } = row;
                const contactName =
                  plan.contact?.name ?? plan.debt?.contact.name ?? null;
                const collect = plan.kind === "COLLECT";
                const Icon = collect ? ArrowDownLeft : ArrowUpRight;
                const planAccounts = accounts.filter(
                  (account) => account.currencyId === plan.currencyId
                );
                // En un plan de deuda no se puede cobrar más de lo pendiente:
                // el monto propuesto se recorta igual que en /deudas/[id].
                const debtRemaining = plan.debt
                  ? plan.debt.totalMinor -
                    plan.debt.payments.reduce((sum, p) => sum + p.amountMinor, 0)
                  : null;
                const settleAccountId = plan.accountId ?? plan.debt?.accountId ?? null;
                return (
                  // Cada plan es un <article> con UN solo enlace (los tests
                  // E2E lo localizan así); el formulario de saldar va FUERA
                  // del enlace: debajo en móvil, a la derecha en escritorio.
                  <article
                    key={plan.id}
                    className={
                      settleColumn
                        ? "@4xl/main:grid @4xl/main:grid-cols-[minmax(0,1fr)_20rem]"
                        : undefined
                    }
                  >
                    {/* Rejilla propia por fila: en móvil, qué + monto arriba y
                        las etiquetas debajo; en escritorio, tres columnas. El
                        mínimo de la del monto (7rem) mantiene las columnas
                        alineadas de una fila a otra. */}
                    <Link
                      href={`/mensualidades/${plan.id}`}
                      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-subtle/60 @4xl/main:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(7rem,auto)] @4xl/main:items-center @4xl/main:gap-x-5"
                    >
                      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
                        <span
                          className={`flex size-9 flex-none items-center justify-center rounded-xl ${
                            row.overdue
                              ? "bg-danger-bg text-danger"
                              : collect
                                ? "bg-ok-bg text-ok"
                                : "bg-chip text-brand-ink"
                          }`}
                        >
                          <Icon className="size-[18px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-heading">
                            {plan.description}
                          </div>
                          <div className="truncate text-xs text-muted">
                            {contactName ?? "Sin contacto"}
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5 pl-12 @4xl/main:col-span-1 @4xl/main:col-start-2 @4xl/main:row-start-1 @4xl/main:pl-0">
                        <Badge variant="neutral">
                          {FREQUENCY_LABELS[plan.frequency as Frequency]}
                        </Badge>
                        {next && days !== null && (
                          <Badge variant={dueTone(days)}>
                            <CalendarClock className="size-3" />
                            {dueLabel(next.dueAt)}
                          </Badge>
                        )}
                        {row.paidCount > 0 && (
                          <span className="text-xs text-muted">
                            {row.paidCount} saldada
                            {row.paidCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>

                      <div className="money col-start-2 row-start-1 text-right text-[15px] font-semibold whitespace-nowrap text-heading @4xl/main:col-start-3">
                        {fmtMinor(plan.amountMinor, plan.currency)}
                      </div>
                    </Link>

                    {canSettle && next && (
                      <div className="bg-subtle/50 px-4 py-3 @4xl/main:flex @4xl/main:flex-col @4xl/main:justify-center @4xl/main:bg-transparent @4xl/main:pl-0">
                        {/* key por cuota y cuenta: al saldar llega la cuota
                            siguiente y el formulario debe re-inicializarse (si
                            no, heredaba el monto editado de la anterior). */}
                        <SettleInstallment
                          key={`${next.id}-${settleAccountId ?? "none"}`}
                          installmentId={next.id}
                          accounts={planAccounts}
                          defaultAmount={minorToInput(
                            debtRemaining === null
                              ? next.amountMinor
                              : Math.min(next.amountMinor, Math.max(debtRemaining, 0)),
                            plan.currency.decimalPlaces
                          )}
                          currencyCode={plan.currency.code}
                          kind={plan.kind}
                          defaultAccountId={settleAccountId}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </Card>
          )
        )}

        {ended.length > 0 && (
          <section>
            <SectionHeader title="Finalizadas" />
            <Card padding="none" className="divide-y divide-line-2 overflow-hidden">
              {ended.map(({ plan, paidCount }) => {
                const contactName =
                  plan.contact?.name ?? plan.debt?.contact.name ?? null;
                const Icon = plan.kind === "COLLECT" ? ArrowDownLeft : ArrowUpRight;
                return (
                  <Link
                    key={plan.id}
                    href={`/mensualidades/${plan.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle/60"
                  >
                    <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-subtle text-ink-soft">
                      <Icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-heading">
                        {plan.description}
                      </div>
                      <div className="truncate text-xs text-muted">
                        {PLAN_KIND_LABELS[plan.kind as PlanKind]}
                        {contactName ? ` · ${contactName}` : ""} · {paidCount}{" "}
                        saldada{paidCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <div className="flex flex-none flex-col items-end gap-1">
                      <span className="money text-[15px] font-semibold whitespace-nowrap text-heading">
                        {fmtMinor(plan.amountMinor, plan.currency)}
                      </span>
                      <Badge variant="neutral">Finalizada</Badge>
                    </div>
                  </Link>
                );
              })}
            </Card>
          </section>
        )}
      </PageBody>
    </Page>
  );
}

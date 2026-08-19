import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  HandCoins,
  Plus,
  UserRound,
} from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
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

export const dynamic = "force-dynamic";

// Una cuota se salda desde la propia lista si ya venció o vence dentro de
// esta ventana: es lo que permite despachar varias mensualidades de una vez.
const SETTLE_WINDOW_DAYS = 7;

const FILTERS = [
  { value: null, label: "Todas" },
  { value: "pagar", label: "Que pago" },
  { value: "cobrar", label: "Que cobro" },
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
        debt: { select: { id: true, contact: { select: { name: true } } } },
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
    return {
      plan,
      next,
      nextDueAt: next?.dueAt ?? null,
      description: plan.description,
      paidCount: plan.installments.filter((inst) => inst.status === "PAID")
        .length,
      overdue: plan.installments.some(
        (inst) => inst.status === "PENDING" && daysUntil(inst.dueAt) < 0
      ),
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
  const totalsText = (kind: PlanKind) =>
    monthlyCommitmentByCurrency(activePlans.filter((p) => p.kind === kind))
      .map((total) => {
        const currency = currencyById.get(total.currencyId);
        return currency ? fmtMinor(total.amountMinor, currency) : null;
      })
      .filter(Boolean)
      .join(" · ");
  const payText = totalsText("PAY");
  const collectText = totalsText("COLLECT");
  const overdueCount = active.filter((row) => row.overdue).length;

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title="Mensualidades"
        actions={
          <Link
            href="/mensualidades/nueva"
            className="flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-white/25"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva
          </Link>
        }
      >
        {(payText || collectText) && (
          <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2.5">
            {payText && (
              <div>
                <div className="text-[11px] tracking-wide text-white/60 uppercase">
                  Pago al mes
                </div>
                <div className="text-[21px] font-bold tracking-[-0.4px]">
                  {payText}
                </div>
              </div>
            )}
            {collectText && (
              <div>
                <div className="text-[11px] tracking-wide text-white/60 uppercase">
                  Cobro al mes
                </div>
                <div className="text-[21px] font-bold tracking-[-0.4px]">
                  {collectText}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px]">
          <span className="rounded-md bg-white/15 px-2 py-[3px] font-semibold text-white">
            {active.length} activa{active.length === 1 ? "" : "s"}
          </span>
          {overdueCount > 0 && (
            <span className="rounded-md bg-danger-bg px-2 py-[3px] font-semibold text-danger">
              {overdueCount} con cuota vencida
            </span>
          )}
        </div>
      </ScreenHeader>

      <div className="anim-fade-up flex flex-1 flex-col gap-5 px-5 pt-5 md:max-w-2xl md:px-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {FILTERS.map((filter) => {
              const selected = (tipo ?? null) === filter.value;
              return (
                <Link
                  key={filter.label}
                  href={
                    filter.value
                      ? `/mensualidades?tipo=${filter.value}`
                      : "/mensualidades"
                  }
                  className={`rounded-lg px-[11px] py-1.5 text-[11.5px] font-semibold transition-colors ${
                    selected
                      ? "bg-brand text-white"
                      : "bg-chip text-brand hover:bg-brand-soft/30"
                  }`}
                >
                  {filter.label}
                </Link>
              );
            })}
          </div>
          <Link
            href="/deudas"
            className="flex items-center gap-1 rounded-lg border border-line bg-white px-[11px] py-1.5 text-[11.5px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand"
          >
            <HandCoins className="h-3.5 w-3.5" />
            Deudas
          </Link>
        </div>

        {active.length === 0 && ended.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Sin mensualidades"
            description="Renta, suscripciones, cuotas fijas… crea una y te avisamos de cada vencimiento."
            ctaLabel="Nueva mensualidad"
            ctaHref="/mensualidades/nueva"
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {active.map((row) => {
              const { plan, next } = row;
              const days = next ? daysUntil(next.dueAt) : null;
              const contactName =
                plan.contact?.name ?? plan.debt?.contact.name ?? null;
              const collect = plan.kind === "COLLECT";
              const Icon = collect ? ArrowDownLeft : ArrowUpRight;
              const canSettle =
                next !== null && days !== null && days <= SETTLE_WINDOW_DAYS;
              const planAccounts = accounts.filter(
                (account) => account.currencyId === plan.currencyId
              );
              return (
                <article
                  key={plan.id}
                  className={`overflow-hidden rounded-[18px] border bg-white ${
                    row.overdue ? "border-danger/35" : "border-line"
                  }`}
                >
                  <Link
                    href={`/mensualidades/${plan.id}`}
                    className="flex items-start gap-3.5 p-4 transition-colors hover:bg-chip/30"
                  >
                    <span
                      className={`flex h-10 w-10 flex-none items-center justify-center rounded-[13px] ${
                        row.overdue
                          ? "bg-danger-bg text-danger"
                          : collect
                            ? "bg-ok-bg text-ok"
                            : "bg-chip text-brand"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="truncate text-[14px] font-semibold text-navy">
                          {plan.description}
                        </span>
                        <span className="text-[15px] font-bold whitespace-nowrap text-navy">
                          {fmtMinor(plan.amountMinor, plan.currency)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-muted">
                        <UserRound className="h-3 w-3 flex-none" />
                        <span className="truncate">
                          {contactName ?? "Sin contacto"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge variant="neutral">
                          {FREQUENCY_LABELS[plan.frequency as Frequency]}
                        </Badge>
                        {next && days !== null && (
                          <Badge variant={dueTone(days)}>
                            <CalendarClock className="h-3 w-3" />
                            {dueLabel(next.dueAt)}
                          </Badge>
                        )}
                        {row.paidCount > 0 && (
                          <span className="text-[11px] text-muted-2">
                            {row.paidCount} saldada
                            {row.paidCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 flex-none text-muted-2" />
                  </Link>

                  {canSettle && next && (
                    <div className="border-t border-line-2 bg-app/60 px-4 py-3">
                      {/* key: re-inicializa la preselección si cambia la cuenta */}
                      <SettleInstallment
                        key={plan.accountId ?? "none"}
                        installmentId={next.id}
                        accounts={planAccounts}
                        defaultAmount={minorToInput(
                          next.amountMinor,
                          plan.currency.decimalPlaces
                        )}
                        currencyCode={plan.currency.code}
                        kind={plan.kind}
                        defaultAccountId={plan.accountId}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {ended.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Finalizadas
            </h2>
            <div className="flex flex-col gap-2">
              {ended.map(({ plan, paidCount }) => {
                const contactName =
                  plan.contact?.name ?? plan.debt?.contact.name ?? null;
                return (
                  <Link
                    key={plan.id}
                    href={`/mensualidades/${plan.id}`}
                    className="flex items-center gap-3 rounded-[16px] border border-line bg-white px-3.5 py-3 opacity-80 transition-colors hover:border-brand-soft hover:opacity-100"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-navy">
                        {plan.description}
                      </div>
                      <div className="truncate text-[11.5px] text-muted">
                        {PLAN_KIND_LABELS[plan.kind as PlanKind]}
                        {contactName ? ` · ${contactName}` : ""} · {paidCount}{" "}
                        saldada{paidCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <span className="text-[13px] font-bold whitespace-nowrap text-navy">
                      {fmtMinor(plan.amountMinor, plan.currency)}
                    </span>
                    <ChevronRight className="h-4 w-4 flex-none text-muted-2" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

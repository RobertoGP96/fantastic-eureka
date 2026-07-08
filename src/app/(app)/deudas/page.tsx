import Link from "next/link";
import { CalendarClock, ChevronRight, HandCoins, Plus } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtMinor } from "@/lib/format";
import { daysUntil, dueLabel } from "@/lib/dates";
import {
  FREQUENCY_LABELS,
  PLAN_KIND_LABELS,
  type Frequency,
  type PlanKind,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function DeudasPage({
  searchParams,
}: {
  searchParams: Promise<{ dir?: string }>;
}) {
  const user = await requireSessionUser();
  const { dir } = await searchParams;
  const direction = dir === "pagar" ? "PAYABLE" : "RECEIVABLE";

  const [debts, standalonePlans] = await Promise.all([
    prisma.debt.findMany({
      where: { userId: user.id, direction, status: "OPEN" },
      include: {
        contact: true,
        currency: true,
        payments: { select: { amountMinor: true } },
        plans: {
          where: { active: true },
          include: {
            installments: {
              where: { status: "PENDING" },
              orderBy: { dueAt: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.paymentPlan.findMany({
      where: { userId: user.id, active: true, debtId: null },
      include: {
        currency: true,
        contact: true,
        installments: {
          where: { status: "PENDING" },
          orderBy: { dueAt: "asc" },
          take: 1,
        },
      },
      orderBy: { nextDueAt: "asc" },
    }),
  ]);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Deudas y cobros" />

      <div className="anim-fade-up flex flex-1 flex-col gap-5 px-5 pt-5 md:max-w-2xl md:px-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Link
              href="/deudas"
              className={`rounded-lg px-[11px] py-1.5 text-[11.5px] font-semibold transition-colors ${
                direction === "RECEIVABLE"
                  ? "bg-brand text-white"
                  : "bg-chip text-brand hover:bg-brand-soft/30"
              }`}
            >
              Por cobrar
            </Link>
            <Link
              href="/deudas?dir=pagar"
              className={`rounded-lg px-[11px] py-1.5 text-[11.5px] font-semibold transition-colors ${
                direction === "PAYABLE"
                  ? "bg-brand text-white"
                  : "bg-chip text-brand hover:bg-brand-soft/30"
              }`}
            >
              Por pagar
            </Link>
          </div>
          <div className="flex gap-2">
            <Link
              href="/deudas/nueva"
              className="flex items-center gap-1 rounded-lg bg-brand px-[11px] py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-brand-mid"
            >
              <Plus className="h-3.5 w-3.5" />
              Deuda
            </Link>
            <Link
              href="/deudas/plan/nuevo"
              className="flex items-center gap-1 rounded-lg border border-line bg-white px-[11px] py-1.5 text-[11.5px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand"
            >
              <Plus className="h-3.5 w-3.5" />
              Mensualidad
            </Link>
          </div>
        </div>

        {debts.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={
              direction === "RECEIVABLE"
                ? "Nada por cobrar"
                : "Nada por pagar"
            }
            description="Registra una deuda para llevar el control de abonos y vencimientos."
            ctaLabel="Nueva deuda"
            ctaHref="/deudas/nueva"
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {debts.map((debt) => {
              const paid = debt.payments.reduce(
                (acc, p) => acc + p.amountMinor,
                0
              );
              const remaining = debt.totalMinor - paid;
              const nextInstallment = debt.plans
                .flatMap((plan) => plan.installments)
                .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())[0];
              const days = nextInstallment
                ? daysUntil(nextInstallment.dueAt)
                : null;
              return (
                <Link
                  key={debt.id}
                  href={`/deudas/${debt.id}`}
                  className="flex items-center gap-3.5 rounded-[18px] border border-line bg-white p-4 transition-colors hover:border-brand-soft"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold text-navy">
                      {debt.contact.name}
                    </div>
                    <div className="truncate text-[11.5px] text-muted">
                      {debt.description}
                    </div>
                    {nextInstallment && days !== null && (
                      <div className="mt-1.5">
                        <Badge
                          variant={
                            days < 0 ? "danger" : days <= 1 ? "warn" : "neutral"
                          }
                        >
                          <CalendarClock className="h-3 w-3" />
                          {dueLabel(nextInstallment.dueAt)}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[15px] font-bold whitespace-nowrap text-navy">
                      {fmtMinor(remaining, debt.currency)}
                    </span>
                    <span className="text-[10.5px] text-muted">pendiente</span>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-none text-muted-2" />
                </Link>
              );
            })}
          </div>
        )}

        {standalonePlans.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Mensualidades activas
            </h2>
            <div className="flex flex-col gap-2">
              {standalonePlans.map((plan) => {
                const pending = plan.installments[0];
                const days = pending ? daysUntil(pending.dueAt) : null;
                return (
                  <Link
                    key={plan.id}
                    href={`/deudas/plan/${plan.id}`}
                    className="flex items-center gap-3 rounded-[16px] border border-line bg-white px-3.5 py-3 transition-colors hover:border-brand-soft"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-chip text-brand">
                      <CalendarClock className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-navy">
                        {plan.description}
                      </div>
                      <div className="truncate text-[11.5px] text-muted">
                        {PLAN_KIND_LABELS[plan.kind as PlanKind]} ·{" "}
                        {FREQUENCY_LABELS[plan.frequency as Frequency]}
                        {plan.contact ? ` · ${plan.contact.name}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[13px] font-bold text-navy">
                        {fmtMinor(plan.amountMinor, plan.currency)}
                      </span>
                      {pending && days !== null && (
                        <Badge
                          variant={
                            days < 0 ? "danger" : days <= 1 ? "warn" : "neutral"
                          }
                        >
                          {dueLabel(pending.dueAt)}
                        </Badge>
                      )}
                    </div>
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

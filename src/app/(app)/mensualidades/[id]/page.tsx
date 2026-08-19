import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronRight, UserRound } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { LinkedAccountEditor } from "@/components/linked-account-editor";
import { SettleInstallment } from "@/components/settle-installment";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
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
  const paidCount = plan.installments.filter(
    (inst) => inst.status === "PAID"
  ).length;
  const contactName = plan.contact?.name ?? plan.debt?.contact.name ?? null;

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
              <div className="text-[26px] font-bold tracking-[-0.5px]">
                {fmtMinor(plan.amountMinor, plan.currency)}
              </div>
              <div className="mt-1 text-[12.5px] text-white/70">
                {PLAN_KIND_LABELS[plan.kind as PlanKind]} ·{" "}
                {FREQUENCY_LABELS[plan.frequency as Frequency]}
              </div>
            </div>
            <Badge variant="neutral" className="bg-white/15 text-white">
              {plan.active ? "Activa" : "Finalizada"}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-white/60">
            <span className="flex items-center gap-1">
              <UserRound className="h-3 w-3" />
              {contactName ?? "Sin contacto"}
            </span>
            <span>
              {paidCount} cuota{paidCount === 1 ? "" : "s"} saldada
              {paidCount === 1 ? "" : "s"}
            </span>
            {plan.endAt && <span>Termina {DATE_FMT.format(plan.endAt)}</span>}
          </div>
        </div>
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-5 px-5 pt-5 md:max-w-xl md:px-0">
        {plan.active && pending && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Próxima cuota
            </h2>
            <div className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[15px] font-bold text-navy">
                    {fmtMinor(pending.amountMinor, plan.currency)}
                  </div>
                  <div className="text-[11.5px] text-muted">
                    {DATE_FMT.format(pending.dueAt)}
                  </div>
                </div>
                <Badge variant={dueTone(daysUntil(pending.dueAt))}>
                  <CalendarClock className="h-3 w-3" />
                  {dueLabel(pending.dueAt)}
                </Badge>
              </div>
              {/* key: re-inicializa la preselección si cambia la cuenta */}
              <SettleInstallment
                key={plan.accountId ?? "none"}
                installmentId={pending.id}
                accounts={accounts}
                defaultAmount={minorToInput(
                  pending.amountMinor,
                  plan.currency.decimalPlaces
                )}
                currencyCode={plan.currency.code}
                kind={plan.kind}
                defaultAccountId={plan.accountId}
              />
            </div>
          </section>
        )}

        {plan.active && (
          <LinkedAccountEditor
            kind="plan"
            targetId={plan.id}
            accounts={accounts}
            currentAccountId={plan.accountId}
            currencyCode={plan.currency.code}
          />
        )}

        {plan.debt && (
          <Link
            href={`/deudas/${plan.debt.id}`}
            className="flex items-center justify-between rounded-[16px] border border-line bg-white px-4 py-3 text-[12.5px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand"
          >
            Ver deuda de {plan.debt.contact.name}
            <ChevronRight className="h-4 w-4 text-muted-2" />
          </Link>
        )}

        {plan.installments.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Historial de cuotas
            </h2>
            <div className="flex flex-col gap-1.5">
              {plan.installments.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center justify-between rounded-[13px] border border-line bg-white px-3.5 py-2.5 text-[12.5px]"
                >
                  <span className="text-muted">
                    {DATE_FMT.format(inst.dueAt)}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <span className="font-semibold text-ink-soft">
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
          </section>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {plan.active && <PlanButtons planId={plan.id} />}
          <DeleteEntityButton kind="plan" targetId={plan.id} />
        </div>
      </div>
    </main>
  );
}

import { notFound } from "next/navigation";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { LinkedAccountEditor } from "@/components/linked-account-editor";
import { SettleInstallment } from "@/components/settle-installment";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtMinor, minorToInput } from "@/lib/format";
import { daysUntil, dueLabel } from "@/lib/dates";
import {
  DEBT_DIRECTION_LABELS,
  type DebtDirection,
} from "@/lib/domain";
import { PaymentForm } from "./payment-form";

export const dynamic = "force-dynamic";

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
  const pendingInstallments = debt.plans
    .filter((plan) => plan.active)
    .flatMap((plan) =>
      plan.installments.map((inst) => ({
        ...inst,
        planKind: plan.kind,
        planAccountId: plan.accountId,
      }))
    )
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  const accounts = await prisma.account.findMany({
    where: { userId: user.id, archived: false, currencyId: debt.currencyId },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const isOpen = debt.status === "OPEN";

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title={debt.contact.name} backHref="/deudas">
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-white/70">
              {debt.description}
            </span>
            <Badge variant="neutral" className="bg-white/15 text-white">
              {DEBT_DIRECTION_LABELS[debt.direction as DebtDirection]}
            </Badge>
          </div>
          <div className="mt-2 text-[26px] font-bold tracking-[-0.5px]">
            {isOpen ? fmtMinor(remaining, debt.currency) : "Saldada"}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-2 rounded-full bg-white/90"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11.5px] text-white/60">
            Abonado {fmtMinor(paid, debt.currency)} de{" "}
            {fmtMinor(debt.totalMinor, debt.currency)} ({pct}%)
          </div>
        </div>
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-5 px-5 pt-5 md:max-w-2xl md:px-0">
        {isOpen && pendingInstallments.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Cuotas pendientes
            </h2>
            <div className="flex flex-col gap-2.5">
              {pendingInstallments.map((inst) => {
                const days = daysUntil(inst.dueAt);
                return (
                  <div
                    key={inst.id}
                    className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[13.5px] font-bold text-navy">
                          {fmtMinor(inst.amountMinor, debt.currency)}
                        </div>
                        <div className="text-[11.5px] text-muted">
                          {DATE_FMT.format(inst.dueAt)}
                        </div>
                      </div>
                      <Badge
                        variant={
                          days < 0 ? "danger" : days <= 1 ? "warn" : "neutral"
                        }
                      >
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
                      defaultAccountId={inst.planAccountId ?? debt.accountId}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {isOpen && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Registrar abono
            </h2>
            {/* key: re-inicializa la preselección si cambia la cuenta vinculada */}
            <PaymentForm
              key={debt.accountId ?? "none"}
              debtId={debt.id}
              accounts={accounts}
              currencyCode={debt.currency.code}
              defaultAccountId={debt.accountId}
            />
          </section>
        )}

        {isOpen && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Cuenta vinculada
            </h2>
            <LinkedAccountEditor
              kind="debt"
              targetId={debt.id}
              accounts={accounts}
              currentAccountId={debt.accountId}
              currencyCode={debt.currency.code}
            />
          </section>
        )}

        {debt.payments.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Historial de abonos
            </h2>
            <div className="flex flex-col gap-1.5">
              {debt.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-[13px] border border-line bg-white px-3.5 py-2.5 text-[12.5px]"
                >
                  <span className="text-muted">
                    {DATE_FMT.format(payment.paidAt)}
                  </span>
                  <span className="font-semibold text-ok">
                    +{fmtMinor(payment.amountMinor, debt.currency)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-end">
          <DeleteEntityButton kind="debt" targetId={debt.id} />
        </div>
      </div>
    </main>
  );
}

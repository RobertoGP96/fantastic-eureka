import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  HandCoins,
  Plus,
  Repeat,
} from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtMinor } from "@/lib/format";
import { daysUntil, dueLabel } from "@/lib/dates";
import { dueTone, nextPending } from "@/lib/plans-core";
import {
  DEBT_STATUS_LABELS,
  type DebtStatus,
  type DebtDirection,
} from "@/lib/domain";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: null, label: "Todas" },
  { value: "cobrar", label: "Por cobrar" },
  { value: "pagar", label: "Por pagar" },
] as const;

/** Iniciales del contacto para el avatar de la tarjeta. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export default async function DeudasPage({
  searchParams,
}: {
  searchParams: Promise<{ dir?: string }>;
}) {
  const user = await requireSessionUser();
  const { dir } = await searchParams;
  // Sin filtro por defecto: se ven TODAS las deudas, en ambas direcciones.
  const direction: DebtDirection | null =
    dir === "pagar" ? "PAYABLE" : dir === "cobrar" ? "RECEIVABLE" : null;

  // Sin filtro de estado: las saldadas/canceladas se quedan en el historial.
  const debts = await prisma.debt.findMany({
    where: { userId: user.id, ...(direction ? { direction } : {}) },
    include: {
      contact: { select: { name: true } },
      currency: true,
      payments: { select: { amountMinor: true } },
      plans: {
        where: { active: true },
        select: {
          installments: {
            where: { status: "PENDING" },
            select: { dueAt: true, status: true },
            orderBy: { dueAt: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = debts.map((debt) => {
    const paid = debt.payments.reduce((acc, p) => acc + p.amountMinor, 0);
    const next = nextPending(debt.plans.flatMap((plan) => plan.installments));
    return {
      debt,
      paid,
      remaining: debt.totalMinor - paid,
      pct: Math.min(100, Math.round((paid / Math.max(1, debt.totalMinor)) * 100)),
      next,
    };
  });

  const open = rows.filter((row) => row.debt.status === "OPEN");
  const closed = rows.filter((row) => row.debt.status !== "OPEN");

  // Totales del pendiente por moneda, separados por dirección.
  const totalsText = (wanted: DebtDirection) => {
    const totals = new Map<string, { amount: number; currency: typeof debts[number]["currency"] }>();
    for (const row of open) {
      if (row.debt.direction !== wanted) continue;
      const entry = totals.get(row.debt.currencyId);
      if (entry) entry.amount += row.remaining;
      else
        totals.set(row.debt.currencyId, {
          amount: row.remaining,
          currency: row.debt.currency,
        });
    }
    return [...totals.values()]
      .sort((a, b) => b.amount - a.amount)
      .map((total) => fmtMinor(total.amount, total.currency))
      .join(" · ");
  };
  const receivableText = totalsText("RECEIVABLE");
  const payableText = totalsText("PAYABLE");

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title="Deudas"
        actions={
          <Link
            href="/deudas/nueva"
            className="flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-white/25"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva
          </Link>
        }
      >
        {(receivableText || payableText) && (
          <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2.5">
            {receivableText && (
              <div>
                <div className="text-[11px] tracking-wide text-white/60 uppercase">
                  Me deben
                </div>
                <div className="text-[21px] font-bold tracking-[-0.4px]">
                  {receivableText}
                </div>
              </div>
            )}
            {payableText && (
              <div>
                <div className="text-[11px] tracking-wide text-white/60 uppercase">
                  Debo
                </div>
                <div className="text-[21px] font-bold tracking-[-0.4px]">
                  {payableText}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="mt-3 text-[11.5px]">
          <span className="rounded-md bg-white/15 px-2 py-[3px] font-semibold text-white">
            {open.length} abierta{open.length === 1 ? "" : "s"}
          </span>
        </div>
      </ScreenHeader>

      <div className="anim-fade-up flex flex-1 flex-col gap-5 px-5 pt-5 md:max-w-2xl md:px-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {FILTERS.map((filter) => {
              const selected = (dir ?? null) === filter.value;
              return (
                <Link
                  key={filter.label}
                  href={filter.value ? `/deudas?dir=${filter.value}` : "/deudas"}
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
            href="/mensualidades"
            className="flex items-center gap-1 rounded-lg border border-line bg-white px-[11px] py-1.5 text-[11.5px] font-semibold text-ink-soft transition-colors hover:border-brand-soft hover:text-brand"
          >
            <Repeat className="h-3.5 w-3.5" />
            Mensualidades
          </Link>
        </div>

        {open.length === 0 && closed.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Sin deudas registradas"
            description="Anota lo que te deben o lo que debes para llevar el control de abonos y vencimientos."
            ctaLabel="Nueva deuda"
            ctaHref="/deudas/nueva"
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {open.map(({ debt, paid, remaining, pct, next }) => {
              const days = next ? daysUntil(next.dueAt) : null;
              const receivable = debt.direction === "RECEIVABLE";
              return (
                <Link
                  key={debt.id}
                  href={`/deudas/${debt.id}`}
                  className="flex flex-col gap-2.5 rounded-[18px] border border-line bg-white p-4 transition-colors hover:border-brand-soft"
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-[12.5px] font-bold ${
                        receivable
                          ? "bg-ok-bg text-ok"
                          : "bg-warn-bg text-warn"
                      }`}
                    >
                      {initials(debt.contact.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <span className="truncate text-[14px] font-semibold text-navy">
                          {debt.contact.name}
                        </span>
                        <span className="text-[15px] font-bold whitespace-nowrap text-navy">
                          {fmtMinor(remaining, debt.currency)}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="truncate text-[11.5px] text-muted">
                          {debt.description}
                        </span>
                        <span className="text-[10.5px] whitespace-nowrap text-muted">
                          {receivable ? "por cobrar" : "por pagar"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 flex-none text-muted-2" />
                  </div>

                  {paid > 0 && (
                    <div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-line-2">
                        <div
                          className={`h-1.5 rounded-full ${receivable ? "bg-ok" : "bg-brand-mid"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[10.5px] text-muted-2">
                        Abonado {fmtMinor(paid, debt.currency)} de{" "}
                        {fmtMinor(debt.totalMinor, debt.currency)} ({pct}%)
                      </div>
                    </div>
                  )}

                  {next && days !== null && (
                    <div>
                      <Badge variant={dueTone(days)}>
                        <CalendarClock className="h-3 w-3" />
                        Próxima cuota · {dueLabel(next.dueAt)}
                      </Badge>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {closed.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Historial
            </h2>
            <div className="flex flex-col gap-2">
              {closed.map(({ debt }) => (
                <Link
                  key={debt.id}
                  href={`/deudas/${debt.id}`}
                  className="flex items-center gap-3 rounded-[16px] border border-line bg-white px-3.5 py-3 opacity-80 transition-colors hover:border-brand-soft hover:opacity-100"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-navy">
                      {debt.contact.name}
                    </div>
                    <div className="truncate text-[11.5px] text-muted">
                      {debt.description}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[13px] font-bold whitespace-nowrap text-navy">
                      {fmtMinor(debt.totalMinor, debt.currency)}
                    </span>
                    <Badge variant={debt.status === "PAID" ? "ok" : "neutral"}>
                      {DEBT_STATUS_LABELS[debt.status as DebtStatus] ??
                        debt.status}
                    </Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 flex-none text-muted-2" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

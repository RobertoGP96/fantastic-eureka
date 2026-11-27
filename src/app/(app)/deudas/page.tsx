import Link from "next/link";
import { CalendarClock, HandCoins, Plus } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { StatGrid } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ProgressBar } from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SegmentedLinks } from "@/components/ui/segmented";
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
import { TotalsStatCard, type CurrencyTotal } from "./totals-stat-card";

export const dynamic = "force-dynamic";

const FILTERS = [
  { value: "todas", label: "Todas", href: "/deudas" },
  { value: "cobrar", label: "Por cobrar", href: "/deudas?dir=cobrar" },
  { value: "pagar", label: "Por pagar", href: "/deudas?dir=pagar" },
] as const;

/** Iniciales del contacto para el avatar de la fila. */
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

  // Pendiente por moneda de una dirección, de mayor a menor.
  const totalsFor = (wanted: DebtDirection): CurrencyTotal[] => {
    const totals = new Map<string, CurrencyTotal>();
    for (const row of open) {
      if (row.debt.direction !== wanted) continue;
      const entry = totals.get(row.debt.currencyId);
      if (entry) entry.amountMinor += row.remaining;
      else
        totals.set(row.debt.currencyId, {
          amountMinor: row.remaining,
          currency: row.debt.currency,
        });
    }
    return [...totals.values()].sort((a, b) => b.amountMinor - a.amountMinor);
  };
  const receivableTotals = totalsFor("RECEIVABLE");
  const payableTotals = totalsFor("PAYABLE");
  // Con una sola dirección (lo normal al filtrar) solo hay un KPI: en móvil
  // ocupa las dos columnas en vez de dejar media fila vacía.
  const loneStat =
    receivableTotals.length === 0 || payableTotals.length === 0
      ? "col-span-2 @2xl/main:col-span-1"
      : undefined;

  return (
    <Page>
      <ScreenHeader
        title="Deudas"
        subtitle={`${open.length} abierta${open.length === 1 ? "" : "s"}`}
        actions={
          <>
            <Link
              href="/mensualidades"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Mensualidades
            </Link>
            <Link
              href="/deudas/nueva"
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-3.5" />
              Nueva deuda
            </Link>
          </>
        }
      />

      <PageBody>
        {(receivableTotals.length > 0 || payableTotals.length > 0) && (
          <StatGrid cols={2}>
            <TotalsStatCard
              label="Me deben"
              totals={receivableTotals}
              className={loneStat}
            />
            <TotalsStatCard
              label="Debo"
              totals={payableTotals}
              className={loneStat}
            />
          </StatGrid>
        )}

        <SegmentedLinks
          ariaLabel="Filtrar deudas"
          options={FILTERS}
          current={
            direction === "PAYABLE"
              ? "pagar"
              : direction === "RECEIVABLE"
                ? "cobrar"
                : "todas"
          }
          className="self-start"
        />

        {open.length === 0 && closed.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title="Sin deudas registradas"
            description="Anota lo que te deben o lo que debes para llevar el control de abonos y vencimientos."
            ctaLabel="Nueva deuda"
            ctaHref="/deudas/nueva"
          />
        ) : (
          open.length > 0 && (
            <Card padding="none" className="divide-y divide-line-2 overflow-hidden">
              {open.map(({ debt, paid, remaining, pct, next }) => {
                const days = next ? daysUntil(next.dueAt) : null;
                const receivable = debt.direction === "RECEIVABLE";
                return (
                  // Cada deuda es UN solo enlace con todo su texto dentro (los
                  // tests E2E la localizan por el nombre del contacto). Rejilla:
                  // en móvil, quién + pendiente arriba y el avance debajo; en
                  // escritorio, tres columnas en una fila. La del pendiente
                  // tiene un mínimo holgado (9rem): cada fila es su propia
                  // rejilla y así las columnas coinciden de una fila a otra.
                  <Link
                    key={debt.id}
                    href={`/deudas/${debt.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2.5 px-4 py-3 transition-colors hover:bg-subtle/60 @4xl/main:grid-cols-[minmax(0,2fr)_minmax(0,1.6fr)_minmax(9rem,auto)] @4xl/main:items-center @4xl/main:gap-x-5"
                  >
                    <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
                      {/* aria-hidden: las iniciales repiten el nombre. */}
                      <span
                        aria-hidden="true"
                        className={`flex size-9 flex-none items-center justify-center rounded-full text-xs font-semibold ${
                          receivable
                            ? "bg-ok-bg text-ok"
                            : "bg-warn-bg text-warn"
                        }`}
                      >
                        {initials(debt.contact.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-heading">
                          {debt.contact.name}
                        </div>
                        <div className="truncate text-xs text-muted">
                          {debt.description}
                        </div>
                      </div>
                    </div>

                    {(paid > 0 || next) && (
                      <div className="col-span-2 row-start-2 flex min-w-0 flex-col items-start gap-2 pl-12 @4xl/main:col-span-1 @4xl/main:col-start-2 @4xl/main:row-start-1 @4xl/main:pl-0">
                        {paid > 0 && (
                          <div className="w-full">
                            {/* La frase entera en UN elemento: los tests la
                                buscan tal cual. */}
                            <div className="text-xs text-muted">
                              {`Abonado ${fmtMinor(paid, debt.currency)} de ${fmtMinor(debt.totalMinor, debt.currency)} (${pct}%)`}
                            </div>
                            <ProgressBar percent={pct} className="mt-1.5" />
                          </div>
                        )}
                        {next && days !== null && (
                          // whitespace-normal: es la etiqueta más larga de la
                          // fila («… · Vencida hace 12 días») y en móviles de
                          // 320 px no cabe en una línea.
                          <Badge
                            variant={dueTone(days)}
                            className="whitespace-normal"
                          >
                            <CalendarClock className="size-3 flex-none" />
                            Próxima cuota · {dueLabel(next.dueAt)}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="col-start-2 row-start-1 text-right @4xl/main:col-start-3">
                      <div className="money text-[15px] font-semibold whitespace-nowrap text-heading">
                        {fmtMinor(remaining, debt.currency)}
                      </div>
                      {/* En minúsculas en el DOM: los tests lo comprueban así. */}
                      <div className="text-xs text-muted">
                        {receivable ? "por cobrar" : "por pagar"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </Card>
          )
        )}

        {closed.length > 0 && (
          <section>
            <SectionHeader title="Historial" />
            <Card padding="none" className="divide-y divide-line-2 overflow-hidden">
              {closed.map(({ debt }) => (
                <Link
                  key={debt.id}
                  href={`/deudas/${debt.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle/60"
                >
                  {/* Avatar neutro: cerrada ya no hay nada por cobrar ni pagar. */}
                  <span
                    aria-hidden="true"
                    className="flex size-9 flex-none items-center justify-center rounded-full bg-subtle text-xs font-semibold text-ink-soft"
                  >
                    {initials(debt.contact.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-heading">
                      {debt.contact.name}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {debt.description}
                    </div>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1">
                    <span className="money text-[15px] font-semibold whitespace-nowrap text-heading">
                      {fmtMinor(debt.totalMinor, debt.currency)}
                    </span>
                    <Badge variant={debt.status === "PAID" ? "ok" : "neutral"}>
                      {DEBT_STATUS_LABELS[debt.status as DebtStatus] ??
                        debt.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </Card>
          </section>
        )}
      </PageBody>
    </Page>
  );
}

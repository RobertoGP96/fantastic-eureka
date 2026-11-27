import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Banknote,
  Calculator,
  Wallet,
} from "lucide-react";
import { getAccountIcon } from "@/lib/account-icons";
import { BrandMark } from "@/components/brand-mark";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ProgressBar } from "@/components/progress-bar";
import { UpcomingInstallments } from "@/components/upcoming-installments";
import { toInstallmentNotices } from "@/components/installment-notifications";
import { NotificationsBell } from "@/components/notifications-bell";
import { MonthlyBars, MonthlyBarsLegend } from "@/components/monthly-bars";
import { UserMenu } from "@/components/user-menu";
import { DashboardCustomizer } from "@/components/dashboard-customizer";
import { Card } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  latestRatesByCurrency,
  listAccountsWithBalances,
} from "@/lib/balances";
import { consolidatedTotalMinor } from "@/lib/balances-core";
import { buildFlowKpis } from "@/lib/dashboard-kpis";
import {
  packDashboardRows,
  SECTION_WIDTH,
  type RowSpan,
} from "@/lib/dashboard-layout";
import {
  parseDashboardPrefs,
  type DashboardSectionKey,
} from "@/lib/dashboard-prefs";
import {
  AccountCardWidget,
  ActivityMapWidget,
  CurrencyTotalsWidget,
  IncomeCardWidget,
  RatePairWidget,
} from "@/components/dashboard-widgets";
import { BentoPanel } from "@/components/bento-panel";
import { upcomingInstallments } from "@/lib/debts";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/domain";
import { dashboardMetrics } from "@/lib/metrics";
import { fmtMinor, fmtMinorParts } from "@/lib/format";
import { invertRateScaled } from "@/lib/money";
import { pairRateSeries } from "@/lib/rates";
import { pairKey } from "@/lib/rate-resolve";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/registrar?tipo=gasto", icon: ArrowUpRight, label: "Gasto" },
  { href: "/registrar?tipo=ingreso", icon: ArrowDownLeft, label: "Ingreso" },
  {
    href: "/registrar?tipo=transferencia",
    icon: ArrowRightLeft,
    label: "Transferir",
  },
  { href: "/conteo", icon: Banknote, label: "Arqueo" },
  { href: "/calculadora", icon: Calculator, label: "Calcular" },
];

// Columnas de cada celda dentro de una fila de 12 (ver dashboard-layout.ts).
// Cadenas literales: el escáner de Tailwind no ve clases construidas al vuelo.
const SPAN: Record<RowSpan, string> = {
  12: "min-w-0 @4xl/main:col-span-12",
  8: "min-w-0 @4xl/main:col-span-8",
  6: "min-w-0 @4xl/main:col-span-6",
  4: "min-w-0 @4xl/main:col-span-4",
};

const MONTH_NAME = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
});

/** Sección de Inicio: recibe la clase de su celda en la fila. */
type SectionRender = (className?: string) => ReactNode;

export default async function HomePage() {
  const user = await requireSessionUser();

  // La base se resuelve primero (consulta mínima) para que las métricas entren
  // en el mismo Promise.all y no sumen su latencia en serie.
  const base = await prisma.currency.findFirst({
    where: { isBase: true, userId: user.id },
  });
  const [accounts, metrics, userRow, currencies, rates, upcoming] =
    await Promise.all([
      listAccountsWithBalances(user.id),
      base ? dashboardMetrics(user.id, base) : Promise.resolve(null),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { dashboardPrefs: true },
      }),
      prisma.currency.findMany({
        where: { userId: user.id, active: true },
        orderBy: [{ isBase: "desc" }, { code: "asc" }],
        select: { id: true, code: true },
      }),
      // cache(): dashboardMetrics ya la resolvió por dentro; no repite consulta.
      latestRatesByCurrency(user.id),
      // La página carga las cuotas (y no el componente) para saber ANTES de
      // repartir columnas si «Próximos vencimientos» existe. cache(): la
      // campana del layout comparte esta misma consulta.
      upcomingInstallments(user.id, 7),
    ]);
  const prefs = parseDashboardPrefs(userRow?.dashboardPrefs);

  // Serie de tasas solo si algún gadget la usa; si el par no tiene serie
  // directa se muestra la inversa invirtiendo cada punto.
  const rateSeries = prefs.widgets.some((w) => w.type === "ratePair")
    ? await pairRateSeries(user.id)
    : null;
  const pairValues = (fromId: string, toId: string): number[] => {
    if (!rateSeries) return [];
    const direct = rateSeries.get(pairKey(fromId, toId));
    if (direct) return direct.map((p) => p.rateScaled);
    const inverse = rateSeries.get(pairKey(toId, fromId));
    if (!inverse) return [];
    // invertRateScaled LANZA si la inversa redondea a 0 (tasas > 20 000, p.
    // ej. BTC→USD). Sin este catch Inicio entero fallaba y, como el
    // personalizador vive aquí, el gadget no se podía quitar.
    try {
      return inverse.map((p) => invertRateScaled(p.rateScaled));
    } catch {
      return [];
    }
  };

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const currencyById = new Map(currencies.map((c) => [c.id, c]));
  // Cuentas que lista la sección Cuentas (los gadgets no se filtran).
  const visibleAccounts = prefs.accountIds
    ? accounts.filter((a) => prefs.accountIds!.includes(a.id))
    : accounts;

  // Monedas sin tasa: avisa si sus movimientos quedan fuera de las métricas.
  const missingRates = new Set<string>(metrics?.missingRates ?? []);

  // KPIs: saldo consolidado + flujo del mes (ingresos, gastos, neto).
  const flow = metrics ? buildFlowKpis(metrics.series) : null;
  const total = base ? consolidatedTotalMinor(accounts, base, rates) : null;
  const onlyBase = base
    ? accounts.every((a) => a.currency.id === base.id)
    : true;
  const deltaHint = flow?.previousLabel ? `vs. ${flow.previousLabel}` : null;

  const hasSeriesData =
    metrics?.series.some((m) => m.incomeMinor > 0 || m.expenseMinor > 0) ??
    false;
  const maxCategory = metrics?.topCategories[0]?.totalMinor ?? 0;

  // Gadgets del panel bento, en el orden del array de preferencias.
  const widgetNodes = prefs.widgets.map((widget) => {
    if (widget.type === "accountCard") {
      return (
        <AccountCardWidget
          key={`widget-${widget.id}`}
          userId={user.id}
          widget={widget}
          account={
            widget.accountId ? accountById.get(widget.accountId) : undefined
          }
        />
      );
    }
    if (widget.type === "currencyTotals") {
      return (
        <CurrencyTotalsWidget key={`widget-${widget.id}`} accounts={accounts} />
      );
    }
    if (widget.type === "incomeCard") {
      return (
        <IncomeCardWidget
          key={`widget-${widget.id}`}
          userId={user.id}
          widget={widget}
          base={base}
        />
      );
    }
    if (widget.type === "activityMap") {
      return (
        <ActivityMapWidget key={`widget-${widget.id}`} userId={user.id} />
      );
    }
    // Lo que queda es ratePair: un tipo NUEVO necesita su rama arriba.
    const from = currencyById.get(widget.fromCurrencyId ?? "");
    const to = currencyById.get(widget.toCurrencyId ?? "");
    if (!from || !to) {
      return (
        <Card
          key={`widget-${widget.id}`}
          dashed
          className="text-xs text-muted"
        >
          Este gadget de tasa usa una moneda oculta o eliminada. Edítalo o
          quítalo desde «Personalizar».
        </Card>
      );
    }
    return (
      <RatePairWidget
        key={`widget-${widget.id}`}
        fromCode={from.code}
        toCode={to.code}
        values={pairValues(from.id, to.id)}
      />
    );
  });

  // Cada sección personalizable como función que recibe la clase de su celda;
  // las que no aplican (sin datos) NO se registran, así el empaquetado de
  // filas nunca reserva columnas para un hueco.
  const sections: Partial<Record<DashboardSectionKey, SectionRender>> = {};

  if (prefs.widgets.length > 0) {
    sections.widgetPanel = () => (
      <BentoPanel prefs={prefs}>{widgetNodes}</BentoPanel>
    );
  }

  // Móvil: cinco teselas con icono; escritorio: fila de botones compactos.
  sections.quickActions = (className) => (
    <nav
      aria-label="Accesos rápidos"
      className={cn(
        "grid grid-cols-5 gap-2 @3xl/main:flex @3xl/main:flex-wrap",
        className
      )}
    >
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-card px-1 py-2.5 text-[11px] font-medium text-ink-soft transition-colors hover:bg-subtle hover:text-heading @3xl/main:flex-row @3xl/main:gap-2 @3xl/main:px-3.5 @3xl/main:py-2 @3xl/main:text-sm"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-chip text-brand-ink @3xl/main:size-auto @3xl/main:bg-transparent">
              <Icon className="size-4" />
            </span>
            {action.label}
          </Link>
        );
      })}
    </nav>
  );

  if (base && metrics) {
    sections.monthlyChart = (className) => (
      <Card asChild className={className}>
        <section>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-heading">
                Ingresos vs gastos
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Últimos 6 meses · {base.code}
              </p>
            </div>
            <MonthlyBarsLegend />
          </div>
          {hasSeriesData ? (
            <MonthlyBars series={metrics.series} currency={base} />
          ) : (
            <p className="py-8 text-center text-sm text-muted">
              Registra movimientos para ver la evolución mensual.
            </p>
          )}
        </section>
      </Card>
    );
  }

  if (base && metrics && metrics.topCategories.length > 0) {
    sections.topCategories = (className) => (
      <Card asChild className={className}>
        <section>
          <SectionHeader
            size="sm"
            title="Top gastos del mes"
            action={{ href: "/movimientos", label: "Ver todo" }}
          />
          <div className="flex flex-col gap-3">
            {metrics.topCategories.map((category) => (
              <div key={category.name}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-ink-soft">
                    {category.name}
                  </span>
                  <span className="money flex-none font-semibold text-heading">
                    {fmtMinor(category.totalMinor, base)}
                  </span>
                </div>
                <ProgressBar
                  className="mt-1.5"
                  percent={(category.totalMinor / Math.max(1, maxCategory)) * 100}
                  minPercent={4}
                />
              </div>
            ))}
          </div>
        </section>
      </Card>
    );
  }

  if (upcoming.length > 0) {
    sections.upcomingInstallments = (className) => (
      <UpcomingInstallments rows={upcoming} className={className} />
    );
  }

  sections.accounts = (className) => (
    <section className={className}>
      <SectionHeader
        title="Cuentas"
        action={{ href: "/cuentas/nueva", label: "+ Nueva cuenta" }}
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Sin cuentas todavía"
          description="Crea tu primera cuenta o caja para empezar a registrar movimientos."
          ctaLabel="Crear cuenta"
          ctaHref="/cuentas/nueva"
        />
      ) : visibleAccounts.length === 0 ? (
        <Card className="py-5 text-center text-sm text-muted">
          Todas las cuentas están ocultas. Elige cuáles mostrar en
          «Personalizar Inicio».
        </Card>
      ) : (
        // Cada cuenta es UN solo enlace (nombre, tipo · moneda y saldo): los
        // tests E2E la localizan así.
        <Card padding="none" className="divide-y divide-line-2 overflow-hidden">
          {visibleAccounts.map((account) => {
            const Icon = getAccountIcon(account.icon, account.type);
            const negative = account.balanceMinor < 0;
            return (
              <Link
                key={account.id}
                href={`/cuentas/${account.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-subtle/60"
              >
                <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                  <Icon className="size-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-heading">
                    {account.name}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {ACCOUNT_TYPE_LABELS[account.type as AccountType] ??
                      account.type}{" "}
                    · {account.currency.code}
                  </div>
                </div>
                <div
                  className={`money text-[15px] font-semibold whitespace-nowrap ${
                    negative ? "text-danger" : "text-heading"
                  }`}
                >
                  {fmtMinor(account.balanceMinor, account.currency)}
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </section>
  );

  // Orden y visibilidad del usuario → filas de 12 columnas en escritorio
  // (8/4, 6/6 o 12). En móvil cada fila es una sola columna.
  const visibleKeys = prefs.sections
    .filter((section) => section.visible)
    .map((section) => section.key as DashboardSectionKey)
    .filter((key) => sections[key] !== undefined);
  const rows = packDashboardRows(visibleKeys, (key) => SECTION_WIDTH[key]);

  const totalParts =
    base && total ? fmtMinorParts(total.totalMinor, base) : null;

  return (
    <Page>
      <ScreenHeader
        title="Inicio"
        subtitle={
          base ? (
            <span className="inline-block first-letter:uppercase">
              {MONTH_NAME.format(new Date())} · cifras en {base.code}
            </span>
          ) : (
            "Tu resumen de cuentas, movimientos y compromisos"
          )
        }
        leading={
          <BrandMark className="size-9 flex-none md:hidden" idPrefix="fe-home" />
        }
        actions={
          <>
            <DashboardCustomizer
              prefs={prefs}
              accounts={accounts.map((account) => ({
                id: account.id,
                name: account.name,
                type: account.type,
                currencyCode: account.currency.code,
              }))}
              currencies={currencies}
            />
            {/* En escritorio la campana y el usuario viven en la barra
                superior y la barra lateral. */}
            <div className="flex items-center gap-1 md:hidden">
              <NotificationsBell items={toInstallmentNotices(upcoming)} />
              <UserMenu userName={user.name} userEmail={user.email} />
            </div>
          </>
        }
      />

      <PageBody className="gap-6">
        {missingRates.size > 0 && (
          <p className="rounded-xl bg-warn-bg px-3.5 py-2.5 text-xs font-medium text-warn">
            Sin tasa para {[...missingRates].join(", ")}: sus montos no entran
            en estas cifras.{" "}
            <Link href="/tasas" className="underline">
              Registrar tasa
            </Link>
          </p>
        )}

        {!base && (
          <Card className="text-sm text-muted">
            Define una moneda base en{" "}
            <Link href="/monedas" className="font-semibold text-brand-ink">
              Monedas
            </Link>{" "}
            para ver el saldo total y las métricas del mes.
          </Card>
        )}

        {base && total && totalParts && (
          <StatGrid cols={4}>
            <StatCard
              label="Saldo total"
              value={
                total.complete
                  ? `${onlyBase ? "" : "≈ "}${totalParts.amount}`
                  : "—"
              }
              unit={total.complete ? totalParts.code : undefined}
              tone={total.complete && total.totalMinor < 0 ? "danger" : "default"}
              hint={
                !total.complete ? (
                  <>
                    Falta la tasa de {total.missing.join(", ")} ·{" "}
                    <Link href="/tasas" className="font-semibold text-brand-ink">
                      registrar
                    </Link>
                  </>
                ) : metrics &&
                  (metrics.receivableMinor > 0 || metrics.payableMinor > 0) ? (
                  <>
                    {metrics.receivableMinor > 0 && (
                      <span className="block">
                        Por cobrar {fmtMinor(metrics.receivableMinor, base)}
                      </span>
                    )}
                    {metrics.payableMinor > 0 && (
                      <span className="block">
                        Por pagar {fmtMinor(metrics.payableMinor, base)}
                      </span>
                    )}
                  </>
                ) : (
                  `${accounts.length} ${accounts.length === 1 ? "cuenta" : "cuentas"}`
                )
              }
            />
            {flow && (
              <>
                <StatCard
                  label="Ingresos del mes"
                  value={fmtMinorParts(flow.income.valueMinor, base).amount}
                  unit={base.code}
                  delta={flow.income.delta}
                  deltaGood={flow.income.deltaGood}
                  hint={flow.income.delta !== null ? deltaHint : null}
                  sparkline={flow.income.series}
                />
                <StatCard
                  label="Gastos del mes"
                  value={fmtMinorParts(flow.expense.valueMinor, base).amount}
                  unit={base.code}
                  delta={flow.expense.delta}
                  deltaGood={flow.expense.deltaGood}
                  hint={flow.expense.delta !== null ? deltaHint : null}
                  sparkline={flow.expense.series}
                  sparklineColor="var(--color-chart-2)"
                />
                <StatCard
                  label="Neto del mes"
                  value={fmtMinorParts(flow.net.valueMinor, base).amount}
                  unit={base.code}
                  tone={flow.net.valueMinor < 0 ? "danger" : "default"}
                  delta={flow.net.delta}
                  deltaGood={flow.net.deltaGood}
                  hint={flow.net.delta !== null ? deltaHint : null}
                  sparkline={flow.net.series}
                />
              </>
            )}
          </StatGrid>
        )}

        {rows.map((row) =>
          row.cells.length === 1 ? (
            <Fragment key={row.cells[0].key}>
              {sections[row.cells[0].key]!()}
            </Fragment>
          ) : (
            <div
              key={row.cells.map((cell) => cell.key).join("+")}
              className="grid gap-6 @4xl/main:grid-cols-12 @4xl/main:gap-5"
            >
              {row.cells.map((cell) => (
                <Fragment key={cell.key}>
                  {sections[cell.key]!(SPAN[cell.span])}
                </Fragment>
              ))}
            </div>
          )
        )}
      </PageBody>
    </Page>
  );
}

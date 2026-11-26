import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Banknote,
  Calculator,
  Wallet,
} from "lucide-react";
import { getAccountIcon } from "@/lib/account-icons";
import { CardGrid, PageBody } from "@/components/page-body";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { EmptyState } from "@/components/empty-state";
import { UpcomingInstallments } from "@/components/upcoming-installments";
import { InstallmentNotifications } from "@/components/installment-notifications";
import { MonthlyBars } from "@/components/monthly-bars";
import { UserMenu } from "@/components/user-menu";
import { DashboardCustomizer } from "@/components/dashboard-customizer";
import { requireSessionUser } from "@/lib/auth";
import { APP_NAME } from "@/lib/config";
import { prisma } from "@/lib/db";
import { listAccountsWithBalances } from "@/lib/balances";
import {
  parseDashboardPrefs,
  type DashboardSectionKey,
} from "@/lib/dashboard-prefs";
import {
  AccountCardWidget,
  CurrencyTotalsWidget,
  IncomeCardWidget,
  RatePairWidget,
} from "@/components/dashboard-widgets";
import { BentoPanel } from "@/components/bento-panel";
import { dashboardMetrics } from "@/lib/metrics";
import { deltaPct } from "@/lib/metrics-core";
import { fmtMinor } from "@/lib/format";
import { invertRateScaled } from "@/lib/money";
import { panelHref } from "@/lib/panel-core";
import { pairRateSeries } from "@/lib/rates";
import { pairKey } from "@/lib/rate-resolve";

export const dynamic = "force-dynamic";

// El alta de cuenta ya no tiene página propia: es un drawer de /cuentas.
const NEW_ACCOUNT_HREF = panelHref("/cuentas", "nueva-cuenta");

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

// Secciones que en escritorio comparten fila (grid de 2 columnas) cuando
// quedan consecutivas en el orden elegido por el usuario.
const HALF_SECTIONS = new Set<DashboardSectionKey>([
  "monthlyChart",
  "topCategories",
]);

export default async function HomePage() {
  const user = await requireSessionUser();

  // La base se resuelve primero (consulta mínima) para que las métricas entren
  // en el mismo Promise.all y no sumen su latencia en serie.
  const base = await prisma.currency.findFirst({
    where: { isBase: true, userId: user.id },
  });
  const [accounts, metrics, userRow, currencies] = await Promise.all([
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

  const current = metrics?.series.at(-1);
  const previous = metrics?.series.at(-2);
  const incomeDelta =
    current && previous
      ? deltaPct(current.incomeMinor, previous.incomeMinor)
      : null;
  const expenseDelta =
    current && previous
      ? deltaPct(current.expenseMinor, previous.expenseMinor)
      : null;
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
    const from = currencyById.get(widget.fromCurrencyId ?? "");
    const to = currencyById.get(widget.toCurrencyId ?? "");
    if (!from || !to) {
      return (
        <div
          key={`widget-${widget.id}`}
          className="rounded-2xl border border-dashed border-line bg-card p-4 text-xs text-muted"
        >
          Este gadget de tasa usa una moneda oculta o eliminada. Edítalo o
          quítalo desde «Personalizar».
        </div>
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

  // Cada sección personalizable como nodo independiente; null = no aplica
  // (sin datos) y se omite sin dejar hueco.
  const sectionNodes: Record<DashboardSectionKey, ReactNode | null> = {
    widgetPanel:
      prefs.widgets.length > 0 ? (
        <BentoPanel key="widgetPanel" prefs={prefs}>
          {widgetNodes}
        </BentoPanel>
      ) : null,
    quickActions: (
      // A todo el ancho. En móvil, icono sobre etiqueta; con sitio de sobra
      // (@4xl) cada acción se tumba: icono a la izquierda y texto mayor.
      <div key="quickActions" className="grid grid-cols-5 gap-2 @4xl:gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="press flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-card py-3 text-[11px] font-semibold text-ink-soft hover:border-brand-soft hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none @4xl:flex-row @4xl:justify-center @4xl:gap-2.5 @4xl:px-3 @4xl:py-3.5 @4xl:text-sm"
            >
              <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                <Icon className="size-4" />
              </span>
              {action.label}
            </Link>
          );
        })}
      </div>
    ),
    monthlyChart:
      base && metrics ? (
        <section
          key="monthlyChart"
          className="rounded-2xl border border-line bg-card p-4"
        >
          <h2 className="mb-3 text-sm font-bold text-heading">
            Ingresos vs gastos · últimos 6 meses
          </h2>
          {hasSeriesData ? (
            <MonthlyBars series={metrics.series} currency={base} />
          ) : (
            <p className="py-6 text-center text-sm text-muted">
              Registra movimientos para ver la evolución mensual.
            </p>
          )}
        </section>
      ) : null,
    topCategories:
      base && metrics && metrics.topCategories.length > 0 ? (
        <section
          key="topCategories"
          className="rounded-2xl border border-line bg-card p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-heading">
              Top gastos del mes
            </h2>
            <Link
              href="/movimientos"
              className="text-xs font-semibold text-brand-ink hover:underline"
            >
              Ver todo
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {metrics.topCategories.map((category) => (
              <div key={category.name}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-ink-soft">
                    {category.name}
                  </span>
                  <span className="money font-bold text-heading">
                    {fmtMinor(category.totalMinor, base)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-app">
                  <div
                    className="grad-progress anim-grow-x h-2 rounded-full"
                    style={{
                      width: `${Math.max(
                        4,
                        Math.round(
                          (category.totalMinor / Math.max(1, maxCategory)) * 100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null,
    upcomingInstallments: (
      <UpcomingInstallments key="upcomingInstallments" userId={user.id} />
    ),
    accounts: (
      <Section
        key="accounts"
        title="Cuentas"
        action={
          <Link
            href={NEW_ACCOUNT_HREF}
            className="text-xs font-semibold text-brand-ink hover:underline"
          >
            + Nueva cuenta
          </Link>
        }
      >
        {accounts.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Sin cuentas todavía"
            description="Crea tu primera cuenta o caja para empezar a registrar movimientos."
            ctaLabel="Crear cuenta"
            ctaHref={NEW_ACCOUNT_HREF}
          />
        ) : visibleAccounts.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card px-4 py-5 text-center text-sm text-muted">
            Todas las cuentas están ocultas. Elige cuáles mostrar en
            «Personalizar Inicio».
          </p>
        ) : (
          <CardGrid>
            {visibleAccounts.map((account) => {
              const Icon = getAccountIcon(account.icon, account.type);
              const negative = account.balanceMinor < 0;
              return (
                <Link
                  key={account.id}
                  href={`/cuentas/${account.id}`}
                  className="press flex items-center gap-3.5 rounded-2xl border border-line bg-card p-4 hover:border-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-heading">
                      {account.name}
                    </div>
                    <div className="text-xs text-muted">
                      {account.currency.code}
                    </div>
                  </div>
                  <div
                    className={`money text-base font-bold whitespace-nowrap ${
                      negative ? "text-danger" : "text-heading"
                    }`}
                  >
                    {fmtMinor(account.balanceMinor, account.currency)}
                  </div>
                </Link>
              );
            })}
          </CardGrid>
        )}
      </Section>
    ),
  };

  // Renderiza en el orden elegido; las secciones "media" consecutivas
  // (gráfico y top gastos) comparten fila en escritorio como antes.
  const blocks: ReactNode[] = [];
  let halfRun: ReactNode[] = [];
  let halfRunKey = "";
  const flushHalfRun = () => {
    if (halfRun.length === 0) return;
    blocks.push(
      halfRun.length === 1 ? (
        halfRun[0]
      ) : (
        // Por container query: con el sidebar abierto el ancho real del
        // contenido es bastante menor que el del viewport.
        <div key={`half-${halfRunKey}`} className="grid gap-6 @3xl:grid-cols-2">
          {halfRun}
        </div>
      )
    );
    halfRun = [];
    halfRunKey = "";
  };
  for (const section of prefs.sections) {
    if (!section.visible) continue;
    const node = sectionNodes[section.key as DashboardSectionKey];
    if (!node) continue;
    if (HALF_SECTIONS.has(section.key as DashboardSectionKey)) {
      halfRun.push(node);
      halfRunKey = halfRunKey ? halfRunKey : section.key;
    } else {
      flushHalfRun();
      blocks.push(node);
    }
  }
  flushHalfRun();

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title={APP_NAME}
        actions={
          <div className="flex items-center gap-2.5">
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
            <InstallmentNotifications userId={user.id} />
            <div className="md:hidden">
              <UserMenu userName={user.name} userEmail={user.email} />
            </div>
          </div>
        }
      >
        <div className="mt-3">
          {missingRates.size > 0 && (
            <div className="mt-1 text-xs text-white/80">
              Sin tasa para {[...missingRates].join(", ")} ·{" "}
              <Link href="/tasas" className="underline">
                registrar tasa
              </Link>
            </div>
          )}
          {base && current && metrics && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {[
                {
                  label: "Ingresos mes",
                  value: fmtMinor(current.incomeMinor, base),
                  delta: incomeDelta,
                  deltaGood: incomeDelta !== null && incomeDelta >= 0,
                },
                {
                  label: "Gastos mes",
                  value: fmtMinor(current.expenseMinor, base),
                  delta: expenseDelta,
                  deltaGood: expenseDelta !== null && expenseDelta <= 0,
                },
                {
                  label: "Neto mes",
                  value: fmtMinor(
                    current.incomeMinor - current.expenseMinor,
                    base
                  ),
                  delta: null,
                  deltaGood: true,
                },
                ...(metrics.receivableMinor > 0
                  ? [
                      {
                        label: "Por cobrar",
                        value: fmtMinor(metrics.receivableMinor, base),
                        delta: null,
                        deltaGood: true,
                      },
                    ]
                  : []),
                ...(metrics.payableMinor > 0
                  ? [
                      {
                        label: "Por pagar",
                        value: fmtMinor(metrics.payableMinor, base),
                        delta: null,
                        deltaGood: true,
                      },
                    ]
                  : []),
              ].map((chip) => (
                <div
                  key={chip.label}
                  className="rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-sm"
                >
                  <div className="text-[11px] font-medium tracking-wide text-white/80 uppercase">
                    {chip.label}
                  </div>
                  <div className="text-sm font-bold whitespace-nowrap">
                    {chip.value}
                    {chip.delta !== null && (
                      <span
                        className={`ml-1.5 text-[11px] font-semibold ${
                          chip.deltaGood ? "text-brand-soft" : "text-[#f2a9b4]"
                        }`}
                      >
                        {chip.delta >= 0 ? "+" : ""}
                        {chip.delta}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScreenHeader>

      <PageBody className="gap-6">{blocks}</PageBody>
    </main>
  );
}

import { History } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { SectionHeader } from "@/components/section-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { ProgressBar } from "@/components/progress-bar";
import { TxList } from "@/components/tx-list";
import { Card } from "@/components/ui/card";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { latestRatesByCurrency } from "@/lib/balances";
import { toTxRow } from "@/lib/tx-rows";
import { fmtMinor, fmtMinorParts } from "@/lib/format";
import { convertMinor } from "@/lib/money";
import { buildTxWhere, firstParam, resolveMonthParam } from "@/lib/report";
import { FilterBar } from "./filter-bar";

export const dynamic = "force-dynamic";

// La lista muestra como mucho estos movimientos; los totales NO dependen de
// este límite (se agregan aparte sobre todo el filtro).
const LIST_LIMIT = 200;

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireSessionUser();
  const filters = {
    mes: resolveMonthParam(firstParam(params.mes)),
    cuenta: firstParam(params.cuenta) ?? "",
    categoria: firstParam(params.categoria) ?? "",
    tipo: firstParam(params.tipo) ?? "",
  };
  const where = buildTxWhere(user.id, filters);

  const [
    transactions,
    totalCount,
    totals,
    accounts,
    allCategories,
    currencies,
    rates,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        account: { select: { name: true } },
        counterAccount: { select: { name: true } },
        currency: { select: { id: true, code: true, decimalPlaces: true } },
        counterCurrency: { select: { code: true, decimalPlaces: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: LIST_LIMIT,
    }),
    prisma.transaction.count({ where }),
    // Totales sobre TODO el filtro, no sobre las filas listadas: con más de
    // 200 movimientos los totales se quedaban cortos sin avisar.
    prisma.transaction.groupBy({
      by: ["kind", "currencyId", "categoryId"],
      where: { AND: [where, { kind: { in: ["INCOME", "EXPENSE"] } }] },
      _sum: { amountMinor: true },
    }),
    prisma.account.findMany({
      where: { archived: false, userId: user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    // Todas (también las ocultas): los totales nombran categorías inactivas.
    prisma.category.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.currency.findMany({
      where: { userId: user.id },
      select: { id: true, code: true, decimalPlaces: true, isBase: true },
    }),
    latestRatesByCurrency(user.id),
  ]);
  const categories = allCategories.filter((category) => category.active);
  const categoryNames = new Map(allCategories.map((c) => [c.id, c.name]));
  const currencyById = new Map(currencies.map((c) => [c.id, c]));
  const base = currencies.find((currency) => currency.isBase) ?? null;

  // Totales y reporte por categoría convertidos a moneda base con la tasa vigente.
  let expenseMinor = 0;
  let incomeMinor = 0;
  const byCategory = new Map<string, number>();
  const missingRates = new Set<string>();

  if (base) {
    for (const group of totals) {
      const currency = currencyById.get(group.currencyId);
      const sumMinor = group._sum.amountMinor ?? 0;
      if (!currency || sumMinor === 0) continue;
      let converted = sumMinor;
      if (currency.id !== base.id) {
        const rate = rates.get(currency.id);
        if (!rate) {
          missingRates.add(currency.code);
          continue;
        }
        converted = convertMinor(sumMinor, currency, base, rate.rateScaled);
      }
      if (group.kind === "EXPENSE") {
        expenseMinor += converted;
        const name =
          (group.categoryId && categoryNames.get(group.categoryId)) ||
          "Sin categoría";
        byCategory.set(name, (byCategory.get(name) ?? 0) + converted);
      } else {
        incomeMinor += converted;
      }
    }
  }

  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCategory = topCategories[0]?.[1] ?? 0;

  // Orden cronológico ascendente (el más reciente al final). Con filtro de
  // cuenta, las filas se pintan desde SU perspectiva: una transferencia
  // recibida entra en positivo y en la moneda de esa cuenta.
  const perspective = filters.cuenta || undefined;
  const rows = transactions
    .map((tx) => toTxRow(tx, perspective, tx.counterCurrency ?? undefined))
    .reverse();
  const hiddenCount = totalCount - transactions.length;

  // Aviso de monedas sin tasa: un solo nodo que va al pie de «Gastos por
  // categoría» o, si esa tarjeta no existe, bajo los totales.
  const missingRatesNote = missingRates.size > 0 && (
    <p className="rounded-xl bg-warn-bg px-3.5 py-2.5 text-xs font-medium text-warn">
      Los montos en {[...missingRates].join(", ")} no se incluyen en los
      totales por falta de tasa.
    </p>
  );

  const categoryCard = base && topCategories.length > 0 && (
    <Card>
      <SectionHeader size="sm" title="Gastos por categoría" />
      <div className="flex flex-col gap-3">
        {topCategories.map(([name, total]) => (
          <div key={name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-ink-soft">{name}</span>
              <span className="money flex-none font-semibold text-heading">
                {fmtMinor(total, base)}
              </span>
            </div>
            <ProgressBar
              className="mt-1.5"
              percent={(total / Math.max(1, maxCategory)) * 100}
              minPercent={4}
            />
          </div>
        ))}
      </div>
    </Card>
  );

  const list =
    rows.length === 0 ? (
      <EmptyState
        icon={History}
        title="Sin movimientos"
        description="No hay movimientos con estos filtros. Prueba otro mes o registra uno nuevo."
        ctaLabel="Registrar"
        ctaHref="/registrar"
      />
    ) : (
      <>
        {hiddenCount > 0 && (
          <p className="text-xs text-muted">
            Se muestran los {transactions.length} movimientos más recientes de{" "}
            {totalCount}. Los totales incluyen todos; para verlos uno a uno
            acota el filtro o exporta el CSV.
          </p>
        )}
        <TxList rows={rows} />
      </>
    );

  return (
    <Page>
      <ScreenHeader
        title="Movimientos"
        subtitle={`${totalCount} ${totalCount === 1 ? "movimiento" : "movimientos"}`}
        backHref="/mas"
      />

      <PageBody>
        <FilterBar
          filters={filters}
          accounts={accounts}
          categories={categories}
        />

        {base && (expenseMinor > 0 || incomeMinor > 0) && (
          <StatGrid cols={2}>
            <StatCard
              label="Gastos"
              value={fmtMinorParts(expenseMinor, base).amount}
              unit={base.code}
            />
            <StatCard
              label="Ingresos"
              value={fmtMinorParts(incomeMinor, base).amount}
              unit={base.code}
              tone="ok"
            />
          </StatGrid>
        )}

        {categoryCard ? (
          <div className="grid gap-5 @4xl/main:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-3 @4xl/main:col-span-8">
              {list}
            </div>
            {/* order-first: en móvil el resumen por categoría va ANTES de la
                lista; en escritorio es la columna lateral. */}
            <div className="order-first flex min-w-0 flex-col gap-3 @4xl/main:order-none @4xl/main:col-span-4">
              {categoryCard}
              {missingRatesNote}
            </div>
          </div>
        ) : (
          // Sin gastos que desglosar no hay columna lateral: la lista ocupa
          // todo el ancho.
          <>
            {missingRatesNote}
            <div className="flex flex-col gap-3">{list}</div>
          </>
        )}
      </PageBody>
    </Page>
  );
}

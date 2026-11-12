import { History } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";
import { TxList } from "@/components/tx-list";
import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { latestRatesByCurrency } from "@/lib/balances";
import { toTxRow } from "@/lib/tx-rows";
import { fmtMinor } from "@/lib/format";
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

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Movimientos" backHref="/mas" />

      <div className="anim-fade-up flex flex-1 flex-col gap-4 px-5 pt-5 md:max-w-2xl md:px-0">
        <FilterBar
          filters={filters}
          accounts={accounts}
          categories={categories}
        />

        {base && (expenseMinor > 0 || incomeMinor > 0) && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-line bg-white p-3.5">
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Gastos
              </div>
              <div className="mt-0.5 text-lg font-bold text-danger">
                {fmtMinor(expenseMinor, base)}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-3.5">
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Ingresos
              </div>
              <div className="mt-0.5 text-lg font-bold text-ok">
                {fmtMinor(incomeMinor, base)}
              </div>
            </div>
          </div>
        )}

        {missingRates.size > 0 && (
          <p className="text-xs text-muted">
            Los montos en {[...missingRates].join(", ")} no se incluyen en los
            totales por falta de tasa.
          </p>
        )}

        {base && topCategories.length > 0 && (
          <section className="rounded-2xl border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-bold text-navy">
              Gastos por categoría
            </h2>
            <div className="flex flex-col gap-2.5">
              {topCategories.map(([name, total]) => (
                <div key={name}>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-semibold text-ink-soft">{name}</span>
                    <span className="font-bold text-navy">
                      {fmtMinor(total, base)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-app">
                    <div
                      className="grad-progress h-2 rounded-full"
                      style={{
                        width: `${Math.max(4, Math.round((total / Math.max(1, maxCategory)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {rows.length === 0 ? (
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
                Se muestran los {transactions.length} movimientos más recientes
                de {totalCount}. Los totales incluyen todos; para verlos uno a
                uno acota el filtro o exporta el CSV.
              </p>
            )}
            <TxList rows={rows} />
          </>
        )}
      </div>
    </main>
  );
}

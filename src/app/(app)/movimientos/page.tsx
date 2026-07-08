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
import { buildTxWhere, currentMonthParam } from "@/lib/report";
import { FilterBar } from "./filter-bar";

export const dynamic = "force-dynamic";

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{
    mes?: string;
    cuenta?: string;
    categoria?: string;
    tipo?: string;
  }>;
}) {
  const params = await searchParams;
  const user = await requireSessionUser();
  const filters = {
    mes: params.mes ?? currentMonthParam(),
    cuenta: params.cuenta ?? "",
    categoria: params.categoria ?? "",
    tipo: params.tipo ?? "",
  };

  const [transactions, accounts, categories, base, rates] = await Promise.all([
    prisma.transaction.findMany({
      where: buildTxWhere(user.id, filters),
      include: {
        account: { select: { name: true } },
        counterAccount: { select: { name: true } },
        currency: { select: { id: true, code: true, decimalPlaces: true } },
        counterCurrency: { select: { code: true, decimalPlaces: true } },
        category: { select: { name: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
    prisma.account.findMany({
      where: { archived: false, userId: user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({
      where: { active: true, userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.currency.findFirst({ where: { isBase: true, userId: user.id } }),
    latestRatesByCurrency(user.id),
  ]);

  // Totales y reporte por categoría convertidos a moneda base con la tasa vigente.
  let expenseMinor = 0;
  let incomeMinor = 0;
  const byCategory = new Map<string, number>();
  const missingRates = new Set<string>();

  if (base) {
    for (const tx of transactions) {
      if (tx.kind !== "EXPENSE" && tx.kind !== "INCOME") continue;
      let converted = tx.amountMinor;
      if (tx.currency.id !== base.id) {
        const rate = rates.get(tx.currency.id);
        if (!rate) {
          missingRates.add(tx.currency.code);
          continue;
        }
        converted = convertMinor(
          tx.amountMinor,
          tx.currency,
          base,
          rate.rateScaled
        );
      }
      if (tx.kind === "EXPENSE") {
        expenseMinor += converted;
        const name = tx.category?.name ?? "Sin categoría";
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

  const rows = transactions.map((tx) => toTxRow(tx));

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
            <div className="rounded-[16px] border border-line bg-white p-3.5">
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Gastos
              </div>
              <div className="mt-0.5 text-[17px] font-bold text-danger">
                {fmtMinor(expenseMinor, base)}
              </div>
            </div>
            <div className="rounded-[16px] border border-line bg-white p-3.5">
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">
                Ingresos
              </div>
              <div className="mt-0.5 text-[17px] font-bold text-ok">
                {fmtMinor(incomeMinor, base)}
              </div>
            </div>
          </div>
        )}

        {missingRates.size > 0 && (
          <p className="text-[11.5px] text-muted">
            Los montos en {[...missingRates].join(", ")} no se incluyen en los
            totales por falta de tasa.
          </p>
        )}

        {base && topCategories.length > 0 && (
          <section className="rounded-[18px] border border-line bg-white p-4">
            <h2 className="mb-3 text-[13.5px] font-bold text-navy">
              Gastos por categoría
            </h2>
            <div className="flex flex-col gap-2.5">
              {topCategories.map(([name, total]) => (
                <div key={name}>
                  <div className="flex items-baseline justify-between text-[12px]">
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
          <TxList rows={rows} />
        )}
      </div>
    </main>
  );
}

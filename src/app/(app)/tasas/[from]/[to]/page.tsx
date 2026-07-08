import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { RateLineChart } from "@/components/rate-line-chart";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtRate } from "@/lib/format";
import { invertRateScaled } from "@/lib/money";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function TasaDetallePage({
  params,
}: {
  params: Promise<{ from: string; to: string }>;
}) {
  const user = await requireSessionUser();
  const { from, to } = await params;
  const fromCode = decodeURIComponent(from).toUpperCase();
  const toCode = decodeURIComponent(to).toUpperCase();

  const [fromCurrency, toCurrency] = await Promise.all([
    prisma.currency.findFirst({ where: { userId: user.id, code: fromCode } }),
    prisma.currency.findFirst({ where: { userId: user.id, code: toCode } }),
  ]);
  if (!fromCurrency || !toCurrency || fromCurrency.id === toCurrency.id) {
    notFound();
  }

  const history = await prisma.exchangeRate.findMany({
    where: {
      userId: user.id,
      fromCurrencyId: fromCurrency.id,
      toCurrencyId: toCurrency.id,
    },
    orderBy: { effectiveAt: "asc" },
  });

  const latest = history.at(-1) ?? null;
  const previous = history.at(-2) ?? null;

  // Variación frente al registro anterior (puntos escalados → %).
  const deltaScaled =
    latest && previous ? latest.rateScaled - previous.rateScaled : null;
  const deltaPct =
    deltaScaled !== null && previous && previous.rateScaled > 0
      ? (deltaScaled / previous.rateScaled) * 100
      : null;

  let inverseScaled: number | null = null;
  if (latest) {
    try {
      inverseScaled = invertRateScaled(latest.rateScaled);
    } catch {
      inverseScaled = null;
    }
  }

  const chartPoints = history.map((rate) => ({
    t: rate.effectiveAt.getTime(),
    rateScaled: rate.rateScaled,
  }));

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title={`${fromCode} → ${toCode}`} backHref="/tasas">
        {latest ? (
          <div className="mt-2">
            <div className="money text-[30px] font-bold tracking-[-0.8px]">
              {fmtRate(latest.rateScaled)}{" "}
              <span className="text-[15px] font-semibold text-white/80">
                {toCode}
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-white/70">
              1 {fromCode} = {fmtRate(latest.rateScaled)} {toCode} ·{" "}
              {DATE_FMT.format(latest.effectiveAt)}
              {inverseScaled !== null && (
                <>
                  {" "}
                  · inverso: 1 {toCode} = {fmtRate(inverseScaled)} {fromCode}
                </>
              )}
            </p>
          </div>
        ) : (
          <p className="mt-1 text-[12.5px] text-white/70">
            Sin tasas registradas para este par.
          </p>
        )}
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-6 px-5 pt-5 md:max-w-xl md:px-0">
        {history.length === 0 ? (
          <div className="rounded-[16px] border border-line bg-white px-4 py-6 text-center text-[12.5px] text-muted">
            Este par no tiene tasas registradas todavía.{" "}
            <Link href="/tasas" className="font-semibold text-brand underline">
              Registra la primera en Tasas
            </Link>
            .
          </div>
        ) : (
          <>
            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[14.5px] font-bold text-navy">Evolución</h2>
                {deltaScaled !== null && deltaPct !== null && (
                  <span
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                      deltaScaled === 0
                        ? "bg-chip text-ink-soft"
                        : deltaScaled > 0
                          ? "bg-ok-bg text-ok"
                          : "bg-danger-bg text-danger"
                    }`}
                  >
                    {deltaScaled > 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : deltaScaled < 0 ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : null}
                    {deltaScaled > 0 ? "+" : ""}
                    {deltaPct.toFixed(2).replace(/\.?0+$/, "")}% vs anterior
                  </span>
                )}
              </div>
              <div className="rounded-[18px] border border-line bg-white p-4">
                {history.length === 1 ? (
                  <p className="py-6 text-center text-[12.5px] text-muted">
                    Solo hay un registro — el gráfico aparecerá cuando el par
                    tenga al menos dos tasas.
                  </p>
                ) : (
                  <RateLineChart
                    points={chartPoints}
                    fromCode={fromCode}
                    toCode={toCode}
                  />
                )}
                <p className="mt-2 text-center text-[11px] text-muted">
                  {history.length}{" "}
                  {history.length === 1 ? "registro" : "registros"} · desde{" "}
                  {DATE_FMT.format(history[0].effectiveAt)}
                </p>
              </div>
            </section>

            <section>
              <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
                Histórico del par
              </h2>
              <div className="flex flex-col gap-1.5">
                {[...history].reverse().map((rate) => (
                  <div
                    key={rate.id}
                    className="flex items-center justify-between rounded-[13px] border border-line bg-white px-3.5 py-2.5 text-[12.5px]"
                  >
                    <span className="money flex items-center gap-1.5 font-semibold text-ink-soft">
                      {fromCode}
                      <ArrowRight className="h-3 w-3 text-muted-2" />
                      {fmtRate(rate.rateScaled)} {toCode}
                    </span>
                    <span className="text-muted">
                      {DATE_FMT.format(rate.effectiveAt)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

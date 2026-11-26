import { notFound } from "next/navigation";
import { ArrowRight, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { EMPTY_STATE_CTA } from "@/components/empty-state";
import { PanelDrawer } from "@/components/form-drawer";
import { PageBody, SplitLayout } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { RateForm } from "@/components/rate-form";
import { RateLineChart } from "@/components/rate-line-chart";
import { HEADER_ACTION, ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { fmtRate } from "@/lib/format";
import { invertRateScaled } from "@/lib/money";
import { NEW_RATE_PANEL } from "../../panels";

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

  // Todas las monedas de una vez: salen el par de la URL y, además, las
  // opciones del formulario «Registrar tasa» que hospeda esta página.
  const currencies = await prisma.currency.findMany({
    where: { userId: user.id },
    orderBy: [{ isBase: "desc" }, { code: "asc" }],
    select: { id: true, code: true, active: true },
  });
  const fromCurrency = currencies.find((c) => c.code === fromCode);
  const toCurrency = currencies.find((c) => c.code === toCode);
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

  // Opciones del formulario: las activas y, aunque estén ocultas, las dos
  // de este par (si no, no se podría registrar su tasa desde aquí).
  const formCurrencies = currencies
    .filter(
      (c) => c.active || c.id === fromCurrency.id || c.id === toCurrency.id
    )
    .map((c) => ({ id: c.id, code: c.code }));

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title={`${fromCode} → ${toCode}`}
        backHref="/tasas"
        actions={
          <PanelButton panel={NEW_RATE_PANEL} className={HEADER_ACTION}>
            <Plus className="size-3.5" />
            Nueva
          </PanelButton>
        }
      >
        {latest ? (
          <div className="mt-2">
            <div className="money text-[28px] font-bold tracking-[-0.5px]">
              {fmtRate(latest.rateScaled)}{" "}
              <span className="text-base font-semibold text-white/80">
                {toCode}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-white/80">
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
          <p className="mt-1 text-sm text-white/80">
            Sin tasas registradas para este par.
          </p>
        )}
      </ScreenHeader>

      <PageBody className="gap-6">
        {history.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card px-4 py-6 text-center">
            <p className="text-sm text-muted">
              Este par no tiene tasas registradas todavía.
            </p>
            <PanelButton panel={NEW_RATE_PANEL} className={EMPTY_STATE_CTA}>
              Registrar tasa
            </PanelButton>
          </div>
        ) : (
          <SplitLayout
            main={
              <Section
                title="Evolución"
                action={
                  deltaScaled !== null &&
                  deltaPct !== null && (
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        deltaScaled === 0
                          ? "bg-chip text-ink-soft"
                          : deltaScaled > 0
                            ? "bg-ok-bg text-ok"
                            : "bg-danger-bg text-danger"
                      }`}
                    >
                      {deltaScaled > 0 ? (
                        <TrendingUp className="size-3.5" />
                      ) : deltaScaled < 0 ? (
                        <TrendingDown className="size-3.5" />
                      ) : null}
                      {deltaScaled > 0 ? "+" : ""}
                      {deltaPct.toFixed(2).replace(/\.?0+$/, "")}% vs anterior
                    </span>
                  )
                }
              >
                <div className="rounded-2xl border border-line bg-card p-4">
                  {history.length === 1 ? (
                    <p className="py-6 text-center text-sm text-muted">
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
              </Section>
            }
            aside={
              <Section title="Histórico del par">
                <div className="anim-stagger flex flex-col gap-1.5">
                  {[...history].reverse().map((rate) => (
                    <div
                      key={rate.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm"
                    >
                      <span className="money flex items-center gap-1.5 font-semibold text-ink-soft">
                        {fromCode}
                        <ArrowRight className="size-3 text-muted" />
                        {fmtRate(rate.rateScaled)} {toCode}
                      </span>
                      <span className="flex-none text-muted">
                        {DATE_FMT.format(rate.effectiveAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            }
          />
        )}
      </PageBody>

      <PanelDrawer
        panel={NEW_RATE_PANEL}
        title="Registrar tasa"
        description={`Nueva tasa para ${fromCode} → ${toCode}`}
      >
        <RateForm
          currencies={formCurrencies}
          defaultFromId={fromCurrency.id}
          defaultToId={toCurrency.id}
        />
      </PanelDrawer>
    </main>
  );
}

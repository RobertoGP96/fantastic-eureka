import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { EMPTY_STATE_CTA } from "@/components/empty-state";
import { PanelDrawer } from "@/components/form-drawer";
import { CardGrid, PageBody, SplitLayout } from "@/components/page-body";
import { PanelButton } from "@/components/panel-button";
import { RateForm } from "@/components/rate-form";
import { RateSparkline } from "@/components/rate-sparkline";
import { HEADER_ACTION, ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth";
import { pairRateSeries } from "@/lib/rates";
import { fmtRate } from "@/lib/format";
import { Converter } from "./converter";
import { NEW_RATE_PANEL } from "./panels";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function TasasPage() {
  const user = await requireSessionUser();
  const [currencies, series] = await Promise.all([
    prisma.currency.findMany({
      where: { userId: user.id },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
    }),
    pairRateSeries(user.id),
  ]);

  const activeCurrencies = currencies.filter((c) => c.active);
  const base = activeCurrencies.find((c) => c.isBase);
  const codeById = new Map(currencies.map((c) => [c.id, c.code]));
  const activeIds = new Set(activeCurrencies.map((c) => c.id));

  // Pares vigentes (solo entre monedas activas) con su tendencia reciente,
  // ordenados por fecha.
  const currentPairs = [...series.entries()]
    .map(([key, points]) => {
      const [fromId, toId] = key.split("→");
      const latest = points[points.length - 1];
      return {
        key,
        fromId,
        toId,
        fromCode: codeById.get(fromId),
        toCode: codeById.get(toId),
        rateScaled: latest.rateScaled,
        effectiveAt: latest.effectiveAt,
        // Últimos 12 puntos para el sparkline de la tarjeta.
        trend: points.slice(-12).map((p) => p.rateScaled),
      };
    })
    .filter(
      (p) =>
        p.fromCode &&
        p.toCode &&
        activeIds.has(p.fromId) &&
        activeIds.has(p.toId)
    )
    .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime());

  const converterPairs = [...series.entries()].map(([key, points]) => {
    const [fromId, toId] = key.split("→");
    return { fromId, toId, rateScaled: points[points.length - 1].rateScaled };
  });

  // Últimos registros entre todos los pares (histórico plano).
  const history = [...series.entries()]
    .flatMap(([key, points]) => {
      const [fromId, toId] = key.split("→");
      const fromCode = codeById.get(fromId);
      const toCode = codeById.get(toId);
      if (!fromCode || !toCode) return [];
      return points.map((p) => ({
        fromCode,
        toCode,
        rateScaled: p.rateScaled,
        effectiveAt: p.effectiveAt,
      }));
    })
    .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime())
    .slice(0, 15);

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader
        title="Tasas de cambio"
        backHref="/mas"
        actions={
          <PanelButton panel={NEW_RATE_PANEL} className={HEADER_ACTION}>
            <Plus className="size-3.5" />
            Nueva
          </PanelButton>
        }
      >
        {base && (
          <p className="mt-1 text-sm text-white/80">
            Moneda base: {base.code} · se cambia en{" "}
            <Link href="/monedas" className="underline">
              Monedas
            </Link>
          </p>
        )}
      </ScreenHeader>

      <PageBody className="gap-6">
        {/* asideFirst: en estrecho el conversor (compacto) va arriba, a mano;
            con sitio pasa a la columna lateral. */}
        <SplitLayout
          asideFirst
          aside={
            <Section title="Conversor rápido">
              <Converter
                currencies={activeCurrencies.map((c) => ({
                  id: c.id,
                  code: c.code,
                  decimalPlaces: c.decimalPlaces,
                }))}
                pairs={converterPairs}
                baseId={base?.id ?? null}
              />
            </Section>
          }
          main={
            <>
              <Section title="Pares vigentes">
                {currentPairs.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card px-4 py-6 text-center">
                    <p className="text-sm text-muted">
                      Sin tasas registradas todavía. Registra la primera — el
                      par inverso se resuelve solo.
                    </p>
                    <PanelButton
                      panel={NEW_RATE_PANEL}
                      className={EMPTY_STATE_CTA}
                    >
                      Registrar tasa
                    </PanelButton>
                  </div>
                ) : (
                  <>
                    <p className="-mt-1.5 mb-2.5 text-xs text-muted">
                      Toca un par para ver su evolución en detalle.
                    </p>
                    {/* Tarjetas pequeñas: dos columnas en cuanto caben (la
                        columna principal es más estrecha que la página). */}
                    <CardGrid className="@lg:grid-cols-2">
                      {currentPairs.map((pair) => (
                        <Link
                          key={pair.key}
                          href={`/tasas/${pair.fromCode}/${pair.toCode}`}
                          className="press rounded-2xl border border-line bg-card p-4 hover:border-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-heading">
                                {pair.fromCode}
                                <ArrowRight className="size-3.5 text-muted" />
                                {pair.toCode}
                              </div>
                              <div className="money mt-1 text-xl font-bold tracking-[-0.5px] text-brand-ink">
                                {fmtRate(pair.rateScaled)}
                              </div>
                            </div>
                            <RateSparkline values={pair.trend} />
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            1 {pair.fromCode} = {fmtRate(pair.rateScaled)}{" "}
                            {pair.toCode} · {DATE_FMT.format(pair.effectiveAt)}
                          </div>
                        </Link>
                      ))}
                    </CardGrid>
                  </>
                )}
              </Section>

              {history.length > 0 && (
                <Section title="Histórico">
                  <div className="anim-stagger flex flex-col gap-1.5">
                    {history.map((rate, i) => (
                      <div
                        key={`${rate.fromCode}-${rate.toCode}-${rate.effectiveAt.getTime()}-${i}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm"
                      >
                        <span className="money font-semibold text-ink-soft">
                          1 {rate.fromCode} = {fmtRate(rate.rateScaled)}{" "}
                          {rate.toCode}
                        </span>
                        <span className="flex-none text-muted">
                          {DATE_FMT.format(rate.effectiveAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          }
        />
      </PageBody>

      <PanelDrawer
        panel={NEW_RATE_PANEL}
        title="Registrar tasa"
        description="Las tasas se guardan por pares de monedas."
      >
        <RateForm
          currencies={activeCurrencies.map((c) => ({
            id: c.id,
            code: c.code,
          }))}
        />
      </PanelDrawer>
    </main>
  );
}

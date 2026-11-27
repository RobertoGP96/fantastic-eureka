import Link from "next/link";
import { ArrowRight, Coins, Plus } from "lucide-react";
import { CardGrid, SplitLayout } from "@/components/content-grid";
import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { RateForm } from "@/components/rate-form";
import { RateSparkline } from "@/components/rate-sparkline";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { SectionHeader } from "@/components/section-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <Page>
      <ScreenHeader
        title="Tasas de cambio"
        subtitle={base ? `Moneda base: ${base.code}` : undefined}
        backHref="/mas"
        actions={
          <>
            <Link
              href="/monedas"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Coins className="size-3.5" />
              Monedas
            </Link>
            <PanelButton
              panel={NEW_RATE_PANEL}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="size-3.5" />
              Nueva
            </PanelButton>
          </>
        }
      />

      <PageBody>
        {/* asideFirst: en estrecho el conversor (compacto) va arriba, a mano;
            con sitio pasa a la columna lateral. */}
        <SplitLayout
          asideFirst
          aside={
            <Card asChild>
              <section>
                <SectionHeader size="sm" title="Conversor rápido" />
                <Converter
                  currencies={activeCurrencies.map((c) => ({
                    id: c.id,
                    code: c.code,
                    decimalPlaces: c.decimalPlaces,
                  }))}
                  pairs={converterPairs}
                  baseId={base?.id ?? null}
                />
              </section>
            </Card>
          }
          main={
            <>
              <Section
                title="Pares vigentes"
                description={
                  currentPairs.length > 0
                    ? "Toca un par para ver su evolución en detalle."
                    : undefined
                }
              >
                {currentPairs.length === 0 ? (
                  <Card
                    dashed
                    className="flex flex-col items-center gap-3 py-6 text-center"
                  >
                    <p className="text-sm text-muted">
                      Sin tasas registradas todavía. Registra la primera — el
                      par inverso se resuelve solo.
                    </p>
                    <PanelButton
                      panel={NEW_RATE_PANEL}
                      className={buttonVariants({ size: "sm" })}
                    >
                      Registrar tasa
                    </PanelButton>
                  </Card>
                ) : (
                  <CardGrid cols={2}>
                    {currentPairs.map((pair) => (
                      // Cada par es UN solo enlace a su detalle.
                      <Card key={pair.key} asChild interactive>
                        <Link
                          href={`/tasas/${pair.fromCode}/${pair.toCode}`}
                          className="flex items-center gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1 text-xs font-medium text-muted">
                              {pair.fromCode}
                              <ArrowRight className="size-3" />
                              {pair.toCode}
                            </div>
                            <div className="money mt-1 text-[15px] font-semibold text-heading">
                              1 {pair.fromCode} = {fmtRate(pair.rateScaled)}{" "}
                              {pair.toCode}
                            </div>
                            <div className="mt-0.5 text-xs text-muted">
                              {DATE_FMT.format(pair.effectiveAt)}
                            </div>
                          </div>
                          <RateSparkline values={pair.trend} />
                        </Link>
                      </Card>
                    ))}
                  </CardGrid>
                )}
              </Section>

              {history.length > 0 && (
                <Section title="Histórico">
                  <Card
                    padding="none"
                    className="divide-y divide-line-2 overflow-hidden"
                  >
                    {history.map((rate, i) => (
                      <div
                        key={`${rate.fromCode}-${rate.toCode}-${rate.effectiveAt.getTime()}-${i}`}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="money min-w-0 text-sm font-medium text-heading">
                          1 {rate.fromCode} = {fmtRate(rate.rateScaled)}{" "}
                          {rate.toCode}
                        </span>
                        <span className="flex-none text-xs text-muted">
                          {DATE_FMT.format(rate.effectiveAt)}
                        </span>
                      </div>
                    ))}
                  </Card>
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
    </Page>
  );
}

import { notFound } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { SplitLayout } from "@/components/content-grid";
import { PanelDrawer } from "@/components/form-drawer";
import { Page, PageBody } from "@/components/page";
import { PanelButton } from "@/components/panel-button";
import { RateForm } from "@/components/rate-form";
import { RateLineChart } from "@/components/rate-line-chart";
import { ScreenHeader } from "@/components/screen-header";
import { Section } from "@/components/section";
import { SectionHeader } from "@/components/section-header";
import { StatCard, StatGrid } from "@/components/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  // Variación frente al registro anterior (puntos escalados → %), con dos
  // decimales como mucho: es el chip de la tarjeta «Tasa vigente».
  const deltaScaled =
    latest && previous ? latest.rateScaled - previous.rateScaled : null;
  const deltaPct =
    deltaScaled !== null && previous && previous.rateScaled > 0
      ? Number(((deltaScaled / previous.rateScaled) * 100).toFixed(2))
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
    <Page>
      <ScreenHeader
        title={`${fromCode} → ${toCode}`}
        subtitle={
          latest
            ? `1 ${fromCode} = ${fmtRate(latest.rateScaled)} ${toCode} · ${DATE_FMT.format(latest.effectiveAt)}`
            : "Sin tasas registradas para este par."
        }
        backHref="/tasas"
        actions={
          <PanelButton
            panel={NEW_RATE_PANEL}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="size-3.5" />
            Nueva
          </PanelButton>
        }
      />

      <PageBody>
        {!latest ? (
          <Card
            dashed
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <p className="text-sm text-muted">
              Este par no tiene tasas registradas todavía.
            </p>
            <PanelButton
              panel={NEW_RATE_PANEL}
              className={buttonVariants({ size: "sm" })}
            >
              Registrar tasa
            </PanelButton>
          </Card>
        ) : (
          <>
            {/* Sin inverso representable (tasa enorme) la tarjeta se omite y
                la rejilla pasa a dos columnas. Con las tres, en móvil la tasa
                vigente ocupa la fila entera. */}
            <StatGrid cols={inverseScaled !== null ? 3 : 2}>
              <StatCard
                label="Tasa vigente"
                value={fmtRate(latest.rateScaled)}
                unit={toCode}
                delta={deltaPct}
                hint={deltaPct !== null ? "vs anterior" : undefined}
                className={
                  inverseScaled !== null
                    ? "col-span-2 @2xl/main:col-span-1"
                    : undefined
                }
              />
              {inverseScaled !== null && (
                <StatCard
                  label="Inverso"
                  value={fmtRate(inverseScaled)}
                  unit={fromCode}
                  hint={`1 ${toCode} = ${fmtRate(inverseScaled)} ${fromCode}`}
                />
              )}
              <StatCard
                label="Registros"
                value={history.length}
                hint={`desde ${DATE_FMT.format(history[0].effectiveAt)}`}
              />
            </StatGrid>

            <SplitLayout
              main={
                <Card asChild>
                  <section>
                    <SectionHeader size="sm" title="Evolución" />
                    {history.length === 1 ? (
                      <p className="py-6 text-center text-sm text-muted">
                        Solo hay un registro — el gráfico aparecerá cuando el
                        par tenga al menos dos tasas.
                      </p>
                    ) : (
                      <RateLineChart
                        points={chartPoints}
                        fromCode={fromCode}
                        toCode={toCode}
                      />
                    )}
                  </section>
                </Card>
              }
              aside={
                <Section title="Histórico del par">
                  <Card
                    padding="none"
                    className="divide-y divide-line-2 overflow-hidden"
                  >
                    {[...history].reverse().map((rate) => (
                      <div
                        key={rate.id}
                        className="flex items-center justify-between gap-3 px-4 py-3"
                      >
                        <span className="money flex min-w-0 items-center gap-1.5 text-sm font-medium text-heading">
                          {fromCode}
                          <ArrowRight className="size-3 flex-none text-muted" />
                          {fmtRate(rate.rateScaled)} {toCode}
                        </span>
                        <span className="flex-none text-xs text-muted">
                          {DATE_FMT.format(rate.effectiveAt)}
                        </span>
                      </div>
                    ))}
                  </Card>
                </Section>
              }
            />
          </>
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
    </Page>
  );
}

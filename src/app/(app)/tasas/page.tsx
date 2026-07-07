import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { latestPairRates } from "@/lib/rates";
import { fmtRate } from "@/lib/format";
import { RateForm } from "./rate-form";
import { Converter } from "./converter";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function TasasPage() {
  const [currencies, pairs, history] = await Promise.all([
    prisma.currency.findMany({
      where: { active: true },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
    }),
    latestPairRates(),
    prisma.exchangeRate.findMany({
      include: {
        fromCurrency: { select: { code: true } },
        toCurrency: { select: { code: true } },
      },
      orderBy: { effectiveAt: "desc" },
      take: 15,
    }),
  ]);

  const base = currencies.find((c) => c.isBase);
  const codeById = new Map(currencies.map((c) => [c.id, c.code]));

  // Pares vigentes (solo entre monedas activas), ordenados por fecha.
  const currentPairs = [...pairs.entries()]
    .map(([key, rate]) => {
      const [fromId, toId] = key.split("→");
      return {
        key,
        fromCode: codeById.get(fromId),
        toCode: codeById.get(toId),
        rateScaled: rate.rateScaled,
        effectiveAt: rate.effectiveAt,
      };
    })
    .filter((p) => p.fromCode && p.toCode)
    .sort((a, b) => b.effectiveAt.getTime() - a.effectiveAt.getTime());

  const converterPairs = [...pairs.entries()].map(([key, rate]) => {
    const [fromId, toId] = key.split("→");
    return { fromId, toId, rateScaled: rate.rateScaled };
  });

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Tasas de cambio" backHref="/mas">
        {base && (
          <p className="mt-1 text-[12.5px] text-white/70">
            Moneda base: {base.code} · se cambia en{" "}
            <Link href="/monedas" className="underline">
              Monedas
            </Link>
          </p>
        )}
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-6 px-5 pt-5 md:max-w-xl md:px-0">
        <section>
          <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
            Registrar tasa
          </h2>
          <RateForm
            currencies={currencies.map((c) => ({ id: c.id, code: c.code }))}
          />
        </section>

        <section>
          <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
            Pares vigentes
          </h2>
          {currentPairs.length === 0 ? (
            <div className="rounded-[16px] border border-line bg-white px-4 py-6 text-center text-[12.5px] text-muted">
              Sin tasas registradas todavía. Registra la primera arriba — el
              par inverso se resuelve solo.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {currentPairs.map((pair) => (
                <div
                  key={pair.key}
                  className="rounded-[18px] border border-line bg-white p-4"
                >
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-navy">
                    {pair.fromCode}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-2" />
                    {pair.toCode}
                  </div>
                  <div className="money mt-1 text-[20px] font-bold tracking-[-0.5px] text-brand">
                    {fmtRate(pair.rateScaled)}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted">
                    1 {pair.fromCode} = {fmtRate(pair.rateScaled)}{" "}
                    {pair.toCode} · {DATE_FMT.format(pair.effectiveAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
            Conversor rápido
          </h2>
          <Converter
            currencies={currencies.map((c) => ({
              id: c.id,
              code: c.code,
              decimalPlaces: c.decimalPlaces,
            }))}
            pairs={converterPairs}
            baseId={base?.id ?? null}
          />
        </section>

        {history.length > 0 && (
          <section>
            <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
              Histórico
            </h2>
            <div className="flex flex-col gap-1.5">
              {history.map((rate) => (
                <div
                  key={rate.id}
                  className="flex items-center justify-between rounded-[13px] border border-line bg-white px-3.5 py-2.5 text-[12.5px]"
                >
                  <span className="money font-semibold text-ink-soft">
                    1 {rate.fromCurrency.code} = {fmtRate(rate.rateScaled)}{" "}
                    {rate.toCurrency.code}
                  </span>
                  <span className="text-muted">
                    {DATE_FMT.format(rate.effectiveAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

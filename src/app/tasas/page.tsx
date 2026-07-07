import { ScreenHeader } from "@/components/screen-header";
import { prisma } from "@/lib/db";
import { latestRatesByCurrency } from "@/lib/balances";
import { fmtRate } from "@/lib/format";
import { RATE_SCALE } from "@/lib/money";
import { RateForm } from "./rate-form";
import { Converter } from "./converter";

export const dynamic = "force-dynamic";

const DATE_FMT = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function TasasPage() {
  const [currencies, rates, history] = await Promise.all([
    prisma.currency.findMany({
      where: { active: true },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
    }),
    latestRatesByCurrency(),
    prisma.exchangeRate.findMany({
      include: { currency: { select: { code: true } } },
      orderBy: { effectiveAt: "desc" },
      take: 15,
    }),
  ]);

  const base = currencies.find((c) => c.isBase);
  const nonBase = currencies.filter((c) => !c.isBase);

  const converterCurrencies = currencies.map((c) => ({
    id: c.id,
    code: c.code,
    decimalPlaces: c.decimalPlaces,
    rateScaled: c.isBase ? RATE_SCALE : (rates.get(c.id)?.rateScaled ?? null),
  }));

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Tasas de cambio" backHref="/mas">
        {base && (
          <p className="mt-1 text-[12.5px] text-white/70">
            Moneda base: {base.code} · {base.name}
          </p>
        )}
      </ScreenHeader>

      <div className="anim-fade-up flex flex-col gap-6 px-5 pt-5 md:max-w-xl md:px-0">
        {!base ? (
          <div className="rounded-[16px] border border-line bg-white px-4 py-6 text-center text-[13px] text-muted">
            No hay moneda base configurada. Ejecuta el seed de la base de datos.
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
                Tasas vigentes
              </h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {nonBase.map((currency) => {
                  const rate = rates.get(currency.id);
                  return (
                    <div
                      key={currency.id}
                      className="rounded-[18px] border border-line bg-white p-4"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-[13.5px] font-semibold text-navy">
                          {currency.code}
                        </span>
                        <span className="text-[11px] text-muted">
                          {currency.name}
                        </span>
                      </div>
                      {rate ? (
                        <>
                          <div className="mt-1.5 text-[20px] font-bold tracking-[-0.5px] text-brand">
                            {fmtRate(rate.rateScaled)}{" "}
                            <span className="text-[12px] font-semibold text-muted">
                              {base.code}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted">
                            1 {currency.code} = {fmtRate(rate.rateScaled)}{" "}
                            {base.code} · {DATE_FMT.format(rate.effectiveAt)}
                          </div>
                        </>
                      ) : (
                        <div className="mt-1.5 text-[13px] text-muted">
                          Sin tasa registrada
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
                Registrar tasa
              </h2>
              <RateForm
                currencies={nonBase.map((c) => ({
                  id: c.id,
                  code: c.code,
                  name: c.name,
                }))}
                baseCode={base.code}
              />
            </section>

            <section>
              <h2 className="mb-2.5 text-[14.5px] font-bold text-navy">
                Conversor rápido
              </h2>
              <Converter currencies={converterCurrencies} />
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
                      <span className="font-semibold text-ink-soft">
                        1 {rate.currency.code} = {fmtRate(rate.rateScaled)}{" "}
                        {base.code}
                      </span>
                      <span className="text-muted">
                        {DATE_FMT.format(rate.effectiveAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

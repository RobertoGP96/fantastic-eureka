import type { MonthBucket } from "@/lib/metrics-core";
import { fmtMinor, type DisplayCurrency } from "@/lib/format";

// Barras CSS puras (sin librería de gráficas), alturas normalizadas al máximo
// global de la serie. Un solo acento: ingresos en verde-azul y gastos en gris;
// el mes en curso va a pleno color y los anteriores atenuados, para que la
// vista caiga primero en «cómo va este mes».

/** Leyenda de las dos series (va en la cabecera de la tarjeta). */
export function MonthlyBarsLegend() {
  return (
    <div className="flex flex-none items-center gap-3 text-[11px] text-muted">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-chart-1" />
        Ingresos
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-full bg-chart-2" />
        Gastos
      </span>
    </div>
  );
}

export function MonthlyBars({
  series,
  currency,
}: {
  series: MonthBucket[];
  currency: DisplayCurrency;
}) {
  const max = Math.max(
    1,
    ...series.map((m) => Math.max(m.incomeMinor, m.expenseMinor))
  );
  const height = (value: number) =>
    value <= 0 ? 0 : Math.max(3, Math.round((value / max) * 100));
  const currentKey = series.at(-1)?.key;

  return (
    <div
      role="img"
      aria-label={`Ingresos y gastos de los últimos ${series.length} meses`}
      className="relative"
    >
      {/* Rejilla recesiva: tres líneas punteadas y la base. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex h-32 flex-col justify-between"
      >
        <span className="border-t border-dotted border-line" />
        <span className="border-t border-dotted border-line" />
        <span className="border-t border-dotted border-line" />
        <span className="border-t border-line" />
      </div>

      <div className="relative flex items-end gap-1.5">
        {series.map((m) => {
          const current = m.key === currentKey;
          return (
            <div
              key={m.key}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <div className="flex h-32 w-full items-end justify-center gap-1">
                <div
                  className={`w-2.5 rounded-t-md @2xl/main:w-4 ${
                    current ? "bg-chart-1" : "bg-chart-1/35"
                  }`}
                  style={{ height: `${height(m.incomeMinor)}%` }}
                  title={`Ingresos ${m.label}: ${fmtMinor(m.incomeMinor, currency)}`}
                />
                <div
                  className={`w-2.5 rounded-t-md @2xl/main:w-4 ${
                    current ? "bg-chart-2" : "bg-chart-track"
                  }`}
                  style={{ height: `${height(m.expenseMinor)}%` }}
                  title={`Gastos ${m.label}: ${fmtMinor(m.expenseMinor, currency)}`}
                />
              </div>
              <span
                className={`text-[11px] capitalize ${
                  current
                    ? "font-semibold text-heading"
                    : "font-medium text-muted"
                }`}
              >
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

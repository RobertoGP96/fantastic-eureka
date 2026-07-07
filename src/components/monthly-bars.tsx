import type { MonthBucket } from "@/lib/metrics-core";
import { fmtMinor, type DisplayCurrency } from "@/lib/format";

// Barras CSS puras (sin librería de gráficas): ingresos en verde, gastos en
// rojo, alturas normalizadas al máximo global de la serie.
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
    value <= 0 ? 0 : Math.max(4, Math.round((value / max) * 100));

  return (
    <div>
      <div className="flex h-36 items-end gap-1.5">
        {series.map((m) => (
          <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex h-28 w-full items-end justify-center gap-1">
              <div
                className="w-3 rounded-t-[4px] bg-ok"
                style={{ height: `${height(m.incomeMinor)}%` }}
                title={`Ingresos ${m.label}: ${fmtMinor(m.incomeMinor, currency)}`}
              />
              <div
                className="w-3 rounded-t-[4px] bg-danger"
                style={{ height: `${height(m.expenseMinor)}%` }}
                title={`Gastos ${m.label}: ${fmtMinor(m.expenseMinor, currency)}`}
              />
            </div>
            <span className="text-[10px] font-medium text-muted capitalize">
              {m.label}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ok" />
          Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" />
          Gastos
        </span>
      </div>
    </div>
  );
}

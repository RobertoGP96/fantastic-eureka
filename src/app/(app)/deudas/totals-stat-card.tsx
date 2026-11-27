import { StatCard } from "@/components/stat-card";
import { fmtMinor, fmtMinorParts, type DisplayCurrency } from "@/lib/format";

export interface CurrencyTotal {
  amountMinor: number;
  currency: DisplayCurrency;
}

/**
 * KPI de un total repartido en varias monedas (pendiente de las deudas,
 * compromiso de las mensualidades). No hay conversión entre ellas, así que no
 * se suman: la primera es la cifra y las demás van debajo, una por línea.
 * Sin totales no pinta nada. Lo comparten /deudas y /mensualidades.
 */
export function TotalsStatCard({
  label,
  totals,
  className,
}: {
  label: string;
  totals: readonly CurrencyTotal[];
  className?: string;
}) {
  const [first, ...rest] = totals;
  if (!first) return null;

  const { amount, code } = fmtMinorParts(first.amountMinor, first.currency);
  return (
    <StatCard
      label={label}
      value={amount}
      unit={code}
      className={className}
      hint={
        rest.length > 0
          ? rest.map((total) => (
              <span
                key={total.currency.code}
                className="money block text-sm font-medium text-ink-soft"
              >
                {fmtMinor(total.amountMinor, total.currency)}
              </span>
            ))
          : undefined
      }
    />
  );
}

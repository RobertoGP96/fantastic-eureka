import { StatCard } from "@/components/stat-card";
import { fmtMinor, fmtMinorParts, type DisplayCurrency } from "@/lib/format";

export interface CurrencyTotal {
  amountMinor: number;
  currency: DisplayCurrency;
}

/**
 * KPI de un total repartido en varias monedas (pendiente de las deudas,
 * compromiso de las mensualidades, saldo con un contacto). No hay conversión
 * entre ellas, así que no se suman: la primera es la cifra y las demás van
 * debajo, una por línea. Sin totales no pinta nada. Lo comparten /deudas,
 * /mensualidades y la ficha de contacto.
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

/**
 * Clase para las dos `TotalsStatCard` de un `StatGrid cols={2}`: si solo una
 * tiene totales (la otra no pinta nada), en móvil ocupa las dos columnas en
 * vez de dejar media fila vacía.
 */
export function loneStatClass(
  a: readonly CurrencyTotal[],
  b: readonly CurrencyTotal[]
): string | undefined {
  return a.length === 0 || b.length === 0
    ? "col-span-2 @2xl/main:col-span-1"
    : undefined;
}

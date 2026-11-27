import { Sparkline } from "@/components/sparkline";

// Tendencia reciente de una tasa en las tarjetas del listado: trazo en
// brand-mid (de-énfasis) y punto final en brand con anillo del color de la
// tarjeta para que se lea sobre la línea. Envoltorio fino sobre Sparkline:
// sus tests fijan estos colores y la geometría (alto 30, margen 5).
interface RateSparklineProps {
  /** Tasas escaladas (×10 000) en orden cronológico ascendente. */
  values: number[];
  width?: number;
  height?: number;
}

export function RateSparkline({
  values,
  width = 96,
  height = 30,
}: RateSparklineProps) {
  return (
    <Sparkline
      values={values}
      width={width}
      height={height}
      color="var(--color-brand-mid)"
      dotColor="var(--color-brand)"
    />
  );
}

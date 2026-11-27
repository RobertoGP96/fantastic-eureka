// Mini-gráfico de tendencia en SVG puro (sin librería de gráficas). Lo usan
// las tarjetas KPI (modo `fluid`, a todo el ancho) y, a través de
// RateSparkline, las tarjetas de tasas (tamaño fijo con punto final).
interface SparklineProps {
  /** Valores en orden cronológico ascendente. */
  values: number[];
  width?: number;
  height?: number;
  /** Color del trazo (cualquier color CSS o var(--color-…)). */
  color?: string;
  /** Color del punto final; por defecto, el del trazo. */
  dotColor?: string;
  /** Punto en el último valor. En modo `fluid` no se pinta: se deformaría. */
  dot?: boolean;
  /** Se estira al ancho del contenedor conservando el grosor del trazo. */
  fluid?: boolean;
  /** Relleno suave bajo la línea. */
  area?: boolean;
  className?: string;
}

export function Sparkline({
  values,
  width = 96,
  height = 30,
  color = "var(--color-chart-1)",
  dotColor,
  dot = true,
  fluid = false,
  area = false,
  className = "shrink-0",
}: SparklineProps) {
  // Con menos de dos puntos no hay tendencia que dibujar.
  if (values.length < 2) return null;

  const showDot = dot && !fluid;
  // Aire para el punto final y el grosor del trazo.
  const pad = showDot ? 5 : 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const stepX = (width - pad * 2) / (values.length - 1);
  const points = values.map((value, i) => {
    // Serie plana → línea centrada en vez de pegada al borde.
    const norm = span === 0 ? 0.5 : (value - min) / span;
    return {
      x: pad + i * stepX,
      y: pad + (1 - norm) * (height - pad * 2),
    };
  });
  const polyline = points
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const last = points[points.length - 1];
  const first = points[0];

  return (
    <svg
      width={fluid ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={fluid ? "none" : undefined}
      aria-hidden="true"
      className={className}
    >
      {area && (
        <polygon
          points={`${first.x.toFixed(1)},${height} ${polyline} ${last.x.toFixed(1)},${height}`}
          fill={color}
          fillOpacity="0.08"
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={fluid ? 1.5 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect={fluid ? "non-scaling-stroke" : undefined}
      />
      {showDot && (
        <circle
          cx={last.x}
          cy={last.y}
          r="4"
          fill={dotColor ?? color}
          stroke="var(--color-card)"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

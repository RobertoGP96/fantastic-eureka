// Sparkline SVG puro (sin librería de gráficas): tendencia reciente de una
// tasa en las tarjetas del listado. Trazo en brand-mid (de-énfasis) y punto
// final en brand con anillo blanco para que se lea sobre la línea.
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
  // Con menos de dos puntos no hay tendencia que dibujar.
  if (values.length < 2) return null;

  const pad = 5; // aire para el punto final y el grosor del trazo
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

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--color-brand-mid)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={last.x}
        cy={last.y}
        r="4"
        fill="var(--color-brand)"
        stroke="var(--color-card)"
        strokeWidth="2"
      />
    </svg>
  );
}

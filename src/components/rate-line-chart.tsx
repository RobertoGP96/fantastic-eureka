"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtRate } from "@/lib/format";

// Gráfico lineal SVG puro (sin librería de charts) para el histórico de una
// tasa: línea 2px con lavado de área al 10%, rejilla recesiva, etiqueta
// directa solo en el último punto y capa hover con crosshair + tooltip.

export interface RatePoint {
  /** Fecha efectiva en epoch ms (serializable de servidor a cliente). */
  t: number;
  /** Tasa escalada ×10 000. */
  rateScaled: number;
}

interface RateLineChartProps {
  points: RatePoint[]; // orden cronológico ascendente
  fromCode: string;
  toCode: string;
}

const HEIGHT = 220;
const MARGIN = { top: 14, right: 18, bottom: 26, left: 8 };

const TICK_DATE = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
});
const FULL_DATE = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/** Paso "bonito" (1/2/5×10^n) para los ticks del eje Y, en unidades escaladas. */
const niceStep = (raw: number): number => {
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const norm = raw / magnitude;
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return Math.max(1, factor * magnitude);
};

export function RateLineChart({
  points,
  fromCode,
  toCode,
}: RateLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    if (width === 0 || points.length === 0) return null;

    const values = points.map((p) => p.rateScaled);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    // Acolchado vertical del 8% (mínimo 1 unidad escalada) para que la línea
    // no toque los bordes; también resuelve las series planas.
    const pad = Math.max(1, Math.round((rawMax - rawMin) * 0.08));
    const yMin = Math.max(0, rawMin - pad);
    const yMax = rawMax + pad;

    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const tSpan = t1 - t0;

    const innerW = Math.max(1, width - MARGIN.left - MARGIN.right);
    const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

    const x = (t: number) =>
      // Un solo punto → centrado; varios → escala proporcional al tiempo.
      tSpan === 0
        ? MARGIN.left + innerW / 2
        : MARGIN.left + ((t - t0) / tSpan) * innerW;
    const y = (value: number) =>
      MARGIN.top + (1 - (value - yMin) / (yMax - yMin)) * innerH;

    const coords = points.map((p) => ({
      x: x(p.t),
      y: y(p.rateScaled),
    }));

    const linePath = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(" ");
    const baselineY = MARGIN.top + innerH;
    const areaPath =
      coords.length > 1
        ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${baselineY} L${coords[0].x.toFixed(1)},${baselineY} Z`
        : null;

    // Ticks Y en números redondos dentro del dominio acolchado.
    const step = niceStep((yMax - yMin) / 3);
    const ticks: number[] = [];
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
      ticks.push(v);
    }

    return { coords, linePath, areaPath, baselineY, ticks, y };
  }, [points, width]);

  if (points.length === 0) return null;

  const last = points[points.length - 1];
  const active = hoverIndex !== null ? points[hoverIndex] : null;
  const activeCoord =
    geometry && hoverIndex !== null ? geometry.coords[hoverIndex] : null;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geometry) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let nearest = 0;
    let best = Infinity;
    geometry.coords.forEach((c, i) => {
      const d = Math.abs(c.x - px);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  return (
    <div ref={containerRef} className="relative">
      {geometry && (
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`Evolución de la tasa ${fromCode} a ${toCode}: ${points.length} registros, última ${fmtRate(last.rateScaled)}`}
          className="block touch-pan-y select-none"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {/* Rejilla recesiva: hairline por tick Y, valor en tinta muted */}
          {geometry.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={geometry.y(tick)}
                y2={geometry.y(tick)}
                stroke="var(--color-line-2)"
                strokeWidth="1"
              />
              <text
                x={MARGIN.left}
                y={geometry.y(tick) - 4}
                fontSize="10"
                fill="var(--color-muted-2)"
                className="money"
              >
                {fmtRate(tick)}
              </text>
            </g>
          ))}

          {/* Lavado de área (solo con 2+ puntos) */}
          {geometry.areaPath && (
            <path
              d={geometry.areaPath}
              fill="var(--color-brand)"
              opacity="0.1"
            />
          )}

          {/* Línea de la serie */}
          {geometry.coords.length > 1 && (
            <path
              d={geometry.linePath}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Crosshair + punto activo al pasar el dedo/cursor */}
          {activeCoord && (
            <g>
              <line
                x1={activeCoord.x}
                x2={activeCoord.x}
                y1={MARGIN.top}
                y2={geometry.baselineY}
                stroke="var(--color-muted-2)"
                strokeWidth="1"
              />
              <circle
                cx={activeCoord.x}
                cy={activeCoord.y}
                r="5"
                fill="var(--color-brand)"
                stroke="var(--color-card)"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Punto final con anillo de superficie + etiqueta directa (solo
              el último valor; el resto vive en ticks, tooltip e histórico) */}
          {hoverIndex === null && (
            <g>
              <circle
                cx={geometry.coords[geometry.coords.length - 1].x}
                cy={geometry.coords[geometry.coords.length - 1].y}
                r="4.5"
                fill="var(--color-brand)"
                stroke="var(--color-card)"
                strokeWidth="2"
              />
              <text
                x={geometry.coords[geometry.coords.length - 1].x - 8}
                y={geometry.coords[geometry.coords.length - 1].y - 10}
                textAnchor="end"
                fontSize="11"
                fontWeight="600"
                fill="var(--color-ink-soft)"
                className="money"
              >
                {fmtRate(last.rateScaled)}
              </text>
            </g>
          )}

          {/* Eje X: primera y última fecha */}
          <text
            x={MARGIN.left}
            y={HEIGHT - 8}
            fontSize="10"
            fill="var(--color-muted)"
          >
            {TICK_DATE.format(new Date(points[0].t))}
          </text>
          {points.length > 1 && (
            <text
              x={width - MARGIN.right}
              y={HEIGHT - 8}
              textAnchor="end"
              fontSize="10"
              fill="var(--color-muted)"
            >
              {TICK_DATE.format(new Date(last.t))}
            </text>
          )}
        </svg>
      )}

      {/* Tooltip HTML anclado al punto activo */}
      {active && activeCoord && geometry && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[10px] border border-line bg-white px-2.5 py-1.5 shadow-sm"
          style={{
            left: Math.min(Math.max(activeCoord.x, 70), width - 70),
            top: Math.max(activeCoord.y - 54, 0),
          }}
        >
          <div className="text-[10px] whitespace-nowrap text-muted">
            {FULL_DATE.format(new Date(active.t))}
          </div>
          <div className="money text-[12.5px] font-bold whitespace-nowrap text-navy">
            1 {fromCode} = {fmtRate(active.rateScaled)} {toCode}
          </div>
        </div>
      )}
    </div>
  );
}

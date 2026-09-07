"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  aggregateActivity,
  bucketRange,
  startOfDay,
  startOfMonth,
  startOfWeek,
  type ActivityDelta,
  type ActivityGranularity,
} from "@/lib/account-activity";
import { fmtMinor, fmtSignedMinor, type DisplayCurrency } from "@/lib/format";
import { pow10 } from "@/lib/money";

// Gráfico de barras SVG puro (sin librería de charts) para la actividad de una
// cuenta: barras espejadas por período — entradas hacia arriba en ok, salidas
// hacia abajo en danger — con extremos redondeados anclados a la línea cero,
// rejilla recesiva, tooltip por columna y chips de período predefinidos
// (el cambio de período se resuelve en el cliente, sin tocar el servidor).

interface AccountActivityChartProps {
  /** Deltas de la cuenta en orden cronológico ascendente. */
  deltas: ActivityDelta[];
  currency: DisplayCurrency;
}

const HEIGHT = 240;
const MARGIN = { top: 14, right: 10, bottom: 24, left: 10 };

const PERIODS = [
  { key: "7d", label: "7 días", granularity: "day", months: null, days: 6 },
  { key: "1m", label: "1 mes", granularity: "day", months: null, days: 29 },
  { key: "3m", label: "3 meses", granularity: "week", months: null, days: 7 * 12 },
  { key: "1a", label: "1 año", granularity: "month", months: 11, days: null },
  { key: "todo", label: "Todo", granularity: "month", months: null, days: null },
] as const;

type PeriodKey = (typeof PERIODS)[number]["key"];

const DAY_LABEL = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
const DAY_FULL = new Intl.DateTimeFormat("es", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const MONTH_LABEL = new Intl.DateTimeFormat("es", { month: "short" });
const MONTH_FULL = new Intl.DateTimeFormat("es", {
  month: "long",
  year: "numeric",
});

/** Paso "bonito" (1/2/5×10^n) para la rejilla, nunca menor que 1 unidad mayor. */
const niceStep = (raw: number, minStep: number): number => {
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  const norm = raw / magnitude;
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return Math.max(minStep, factor * magnitude);
};

/** Monto menor → etiqueta compacta de rejilla en unidades mayores ("4 750"). */
const tickLabel = (minor: number, decimalPlaces: number): string => {
  const major = Math.round(Math.abs(minor) / pow10(decimalPlaces));
  const text = major.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${minor < 0 ? "-" : ""}${text}`;
};

/** Barra vertical con el extremo de datos redondeado, anclada a la línea cero. */
const barPath = (
  x: number,
  w: number,
  baseY: number,
  valueY: number
): string => {
  const h = Math.abs(baseY - valueY);
  if (h <= 0 || w <= 0) return "";
  const r = Math.min(4.5, w / 2, h);
  const x1 = (x + w).toFixed(1);
  const x0 = x.toFixed(1);
  if (valueY < baseY) {
    // Hacia arriba (entradas)
    const yr = (valueY + r).toFixed(1);
    const y = valueY.toFixed(1);
    return `M${x0},${baseY} L${x0},${yr} Q${x0},${y} ${(x + r).toFixed(1)},${y} L${(x + w - r).toFixed(1)},${y} Q${x1},${y} ${x1},${yr} L${x1},${baseY} Z`;
  }
  // Hacia abajo (salidas)
  const yr = (valueY - r).toFixed(1);
  const y = valueY.toFixed(1);
  return `M${x0},${baseY} L${x0},${yr} Q${x0},${y} ${(x + r).toFixed(1)},${y} L${(x + w - r).toFixed(1)},${y} Q${x1},${y} ${x1},${yr} L${x1},${baseY} Z`;
};

const bucketTick = (startT: number, granularity: ActivityGranularity): string => {
  const d = new Date(startT);
  if (granularity === "month") {
    const label = MONTH_LABEL.format(d);
    return d.getMonth() === 0
      ? `${label} ${String(d.getFullYear() % 100).padStart(2, "0")}`
      : label;
  }
  return DAY_LABEL.format(d);
};

const bucketFullLabel = (
  startT: number,
  endT: number,
  granularity: ActivityGranularity
): string => {
  if (granularity === "day") return DAY_FULL.format(new Date(startT));
  if (granularity === "week")
    return `${DAY_LABEL.format(new Date(startT))} – ${DAY_LABEL.format(
      new Date(addDays(endT, -1))
    )}`;
  return MONTH_FULL.format(new Date(startT));
};

export function AccountActivityChart({
  deltas,
  currency,
}: AccountActivityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("1m");
  // "Ahora" se fija tras montar: en SSR la zona horaria del servidor no es la
  // del usuario y los buckets calculados allí romperían la hidratación.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const view = useMemo(() => {
    if (now === null || deltas.length === 0) return null;
    const def = PERIODS.find((p) => p.key === period) ?? PERIODS[1];
    const fromT =
      def.key === "todo"
        ? startOfMonth(deltas[0].t)
        : def.granularity === "month"
          ? addMonths(startOfMonth(now), -(def.months ?? 0))
          : addDays(
              def.granularity === "week" ? startOfWeek(now) : startOfDay(now),
              -(def.days ?? 0)
            );
    const buckets = aggregateActivity(
      deltas,
      bucketRange(fromT, now, def.granularity)
    );
    let totalIn = 0;
    let totalOut = 0;
    for (const bucket of buckets) {
      totalIn += bucket.inMinor;
      totalOut += bucket.outMinor;
    }
    return { granularity: def.granularity, buckets, totalIn, totalOut };
  }, [deltas, period, now]);

  const geometry = useMemo(() => {
    if (!view || width === 0 || view.buckets.length === 0) return null;
    const { buckets } = view;

    const innerW = Math.max(1, width - MARGIN.left - MARGIN.right);
    const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;
    const baseY = MARGIN.top + innerH / 2;

    const maxAbs = Math.max(
      1,
      ...buckets.map((b) => Math.max(b.inMinor, b.outMinor))
    );
    // Acolchado del 8% para que la barra más alta no toque el borde.
    const yMax = maxAbs * 1.08;
    const scale = innerH / 2 / yMax;

    const slotW = innerW / buckets.length;
    const barW = Math.min(26, Math.max(2, slotW - 3));

    const bars = buckets.map((bucket, i) => {
      const slotX = MARGIN.left + i * slotW;
      const barX = slotX + (slotW - barW) / 2;
      return {
        slotX,
        centerX: slotX + slotW / 2,
        inPath: barPath(barX, barW, baseY, baseY - bucket.inMinor * scale),
        outPath: barPath(barX, barW, baseY, baseY + bucket.outMinor * scale),
      };
    });

    // Rejilla simétrica en pasos redondos de la unidad mayor.
    const step = niceStep(yMax / 2, pow10(currency.decimalPlaces));
    const ticks: number[] = [];
    for (let v = step; v <= yMax; v += step) ticks.push(v);

    const labelEvery = Math.max(1, Math.ceil(buckets.length / 6));

    return { innerH, baseY, scale, slotW, bars, ticks, labelEvery };
  }, [view, width, currency.decimalPlaces]);

  if (deltas.length === 0) return null;

  const active =
    view && geometry && hoverIndex !== null ? view.buckets[hoverIndex] : null;
  const activeBar =
    geometry && hoverIndex !== null ? geometry.bars[hoverIndex] : null;

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!geometry || !view) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - MARGIN.left;
    const index = Math.min(
      view.buckets.length - 1,
      Math.max(0, Math.floor(px / geometry.slotW))
    );
    setHoverIndex(index);
  };

  return (
    <section className="rounded-[16px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-[14.5px] font-bold text-navy">Actividad</h2>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              onClick={() => {
                setPeriod(p.key);
                setHoverIndex(null);
              }}
              className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors ${
                period === p.key
                  ? "bg-brand text-white"
                  : "bg-chip text-brand hover:bg-brand-soft/30"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative mt-2" style={{ height: HEIGHT }}>
        {view && geometry && (
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-label={`Actividad de la cuenta: entradas ${fmtMinor(view.totalIn, currency)} y salidas ${fmtMinor(view.totalOut, currency)} en el período`}
            className="block touch-pan-y select-none"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {/* Rejilla recesiva simétrica con etiquetas en unidades mayores */}
            {geometry.ticks.map((tick) => (
              <g key={tick}>
                {[1, -1].map((sign) => (
                  <line
                    key={sign}
                    x1={MARGIN.left}
                    x2={width - MARGIN.right}
                    y1={geometry.baseY - sign * tick * geometry.scale}
                    y2={geometry.baseY - sign * tick * geometry.scale}
                    stroke="var(--color-line-2)"
                    strokeWidth="1"
                  />
                ))}
                <text
                  x={MARGIN.left}
                  y={geometry.baseY - tick * geometry.scale - 3}
                  fontSize="9.5"
                  fill="var(--color-muted-2)"
                  className="money"
                >
                  {tickLabel(tick, currency.decimalPlaces)}
                </text>
                <text
                  x={MARGIN.left}
                  y={geometry.baseY + tick * geometry.scale - 3}
                  fontSize="9.5"
                  fill="var(--color-muted-2)"
                  className="money"
                >
                  {tickLabel(-tick, currency.decimalPlaces)}
                </text>
              </g>
            ))}

            {/* Lavado de la columna activa */}
            {activeBar && (
              <rect
                x={activeBar.slotX}
                y={MARGIN.top}
                width={geometry.slotW}
                height={geometry.innerH}
                fill="var(--color-navy)"
                opacity="0.05"
              />
            )}

            {/* Línea cero */}
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={geometry.baseY}
              y2={geometry.baseY}
              stroke="var(--color-line)"
              strokeWidth="1"
            />

            {/* Barras: entradas arriba, salidas abajo */}
            {geometry.bars.map((bar, i) => (
              <g key={view.buckets[i].startT}>
                {bar.inPath && <path d={bar.inPath} fill="var(--color-ok)" />}
                {bar.outPath && (
                  <path d={bar.outPath} fill="var(--color-danger)" />
                )}
              </g>
            ))}

            {/* Eje X: etiquetas espaciadas para no chocar entre sí */}
            {geometry.bars.map((bar, i) =>
              i % geometry.labelEvery === 0 ? (
                <text
                  key={view.buckets[i].startT}
                  x={bar.centerX}
                  y={HEIGHT - 7}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--color-muted)"
                >
                  {bucketTick(view.buckets[i].startT, view.granularity)}
                </text>
              ) : null
            )}

            {/* Sin actividad en la ventana: el eje queda, el mensaje lo dice */}
            {view.totalIn === 0 && view.totalOut === 0 && (
              <text
                x={width / 2}
                y={geometry.baseY - 12}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-muted)"
              >
                Sin operaciones en este período
              </text>
            )}
          </svg>
        )}

        {/* Tooltip HTML anclado a la columna activa */}
        {view && active && activeBar && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[10px] border border-line bg-white px-2.5 py-1.5 shadow-sm"
            style={{
              left: Math.min(Math.max(activeBar.centerX, 90), width - 90),
              top: 2,
            }}
          >
            <div className="text-[10px] whitespace-nowrap text-muted">
              {bucketFullLabel(active.startT, active.endT, view.granularity)}
            </div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="money text-[12px] font-bold text-ok">
                {fmtSignedMinor(active.inMinor, currency)}
              </span>
              <span className="text-[10px] text-muted">entradas</span>
            </div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="money text-[12px] font-bold text-danger">
                {fmtMinor(-active.outMinor, currency)}
              </span>
              <span className="text-[10px] text-muted">salidas</span>
            </div>
          </div>
        )}
      </div>

      {/* Totales del período (hacen también de leyenda de color) */}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line-2 pt-3">
        <div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
            <span className="h-2 w-2 rounded-full bg-ok" />
            Entradas
          </div>
          <div className="money mt-0.5 text-[12.5px] font-bold text-ok">
            {view ? fmtSignedMinor(view.totalIn, currency) : " "}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-muted">
            <span className="h-2 w-2 rounded-full bg-danger" />
            Salidas
          </div>
          <div className="money mt-0.5 text-[12.5px] font-bold text-danger">
            {view ? fmtMinor(-view.totalOut, currency) : " "}
          </div>
        </div>
        <div>
          <div className="text-[10.5px] font-medium text-muted">Neto</div>
          <div
            className={`money mt-0.5 text-[12.5px] font-bold ${
              view && view.totalIn - view.totalOut < 0
                ? "text-danger"
                : "text-navy"
            }`}
          >
            {view
              ? fmtSignedMinor(view.totalIn - view.totalOut, currency)
              : " "}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

// Gadget «Resumen de ingresos»: tarjeta con gráfico de línea suave (SVG puro)
// y tabs Día/Semana/Mes funcionales. Portado del diseño «Income Card»
// (variantes soft y dark) a la paleta de Caja. Recibe las tres series ya
// calculadas del servidor; el cambio de periodo es solo estado de cliente.

import { useState } from "react";
import { fmtMinor, type DisplayCurrency } from "@/lib/format";
import { deltaPct } from "@/lib/metrics-core";
import type { IncomeCardSeries } from "@/lib/income-series";
import type {
  IncomeCardMetric,
  IncomeCardPeriod,
  IncomeCardVariant,
} from "@/lib/dashboard-prefs";

export interface IncomeCardConfig {
  variant: IncomeCardVariant;
  metric: IncomeCardMetric;
  defaultPeriod: IncomeCardPeriod;
  showTabs: boolean;
  showDelta: boolean;
  showIncome: boolean;
  showExpense: boolean;
  showNet: boolean;
}

const PERIOD_TABS: { key: IncomeCardPeriod; label: string }[] = [
  { key: "day", label: "Día" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
];

const WINDOW_LABELS: Record<IncomeCardPeriod, string> = {
  day: "últimos 14 días",
  week: "últimas 12 semanas",
  month: "últimos 12 meses",
};

const METRIC_LABELS: Record<IncomeCardMetric, string> = {
  income: "Ingresos",
  expense: "Gastos",
  net: "Neto",
};

// Un solo color de trazo por variante (la métrica ya la dicen el título y
// el pie): acento sobre tarjeta clara y su versión clara sobre la oscura.
const LINE_COLORS: Record<IncomeCardVariant, string> = {
  soft: "var(--color-chart-1)",
  dark: "var(--color-brand-soft)",
};

const CHART_W = 520;
const CHART_H = 170;
const PAD_TOP = 24;
const PAD_BOTTOM = 30;

/** Línea suave (Catmull-Rom → Bézier) + área cerrada, como en el diseño. */
function smoothPath(vals: number[], w: number, h: number, top: number, bottom: number) {
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min;
  // Serie plana → línea centrada en vez de pegada al borde.
  const pts = vals.map((v, i) => [
    i * (w / (vals.length - 1)),
    top + (1 - (span === 0 ? 0.5 : (v - min) / span)) * (h - top - bottom),
  ]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return { d, area: `${d} L${w},${h} L0,${h} Z`, pts };
}

export function IncomeCard({
  heading,
  config,
  currency,
  series,
  missingRates,
}: {
  heading: string;
  config: IncomeCardConfig;
  currency: DisplayCurrency;
  series: IncomeCardSeries;
  missingRates: string[];
}) {
  const [period, setPeriod] = useState<IncomeCardPeriod>(config.defaultPeriod);
  const dark = config.variant === "dark";
  const line = LINE_COLORS[config.variant];

  const buckets = series[period];
  const metricOf = (b: { incomeMinor: number; expenseMinor: number }) =>
    config.metric === "income"
      ? b.incomeMinor
      : config.metric === "expense"
        ? b.expenseMinor
        : b.incomeMinor - b.expenseMinor;
  const vals = buckets.map(metricOf);
  const empty = buckets.every((b) => b.incomeMinor === 0 && b.expenseMinor === 0);

  const totalIncome = buckets.reduce((acc, b) => acc + b.incomeMinor, 0);
  const totalExpense = buckets.reduce((acc, b) => acc + b.expenseMinor, 0);
  const totals: Record<IncomeCardMetric, number> = {
    income: totalIncome,
    expense: totalExpense,
    net: totalIncome - totalExpense,
  };

  // Variación del bucket actual vs el anterior (subir gastos es "malo").
  const last = vals.at(-1) ?? 0;
  const prev = vals.at(-2) ?? 0;
  const delta = deltaPct(last, prev);
  const deltaGood = delta !== null && (config.metric === "expense" ? delta <= 0 : delta >= 0);

  const { d, area, pts } = smoothPath(vals, CHART_W, CHART_H, PAD_TOP, PAD_BOTTOM);
  const dot = pts[pts.length - 1];
  const dotLeftPct = (dot[0] / CHART_W) * 100;
  const tipLeftPct = Math.min(Math.max(dotLeftPct + 2, 4), 62);
  const lastBucket = buckets[buckets.length - 1];

  const stats = [
    config.showIncome && {
      label: "Ingresos",
      value: totalIncome,
      cls: dark ? "text-brand-soft" : "text-ok",
    },
    config.showExpense && {
      label: "Gastos",
      value: totalExpense,
      cls: dark ? "text-danger-soft" : "text-danger",
    },
    config.showNet && {
      label: "Neto",
      value: totals.net,
      cls:
        totals.net < 0
          ? dark
            ? "text-danger-soft"
            : "text-danger"
          : dark
            ? "text-white"
            : "text-heading",
    },
  ].filter((s): s is { label: string; value: number; cls: string } => Boolean(s));

  const mutedCls = dark ? "text-white/80" : "text-muted";
  const strongCls = dark ? "text-white" : "text-heading";
  const dividerCls = dark ? "border-white/10" : "border-line-2";

  return (
    <section
      className={`h-full overflow-hidden rounded-2xl ${
        dark ? "bg-inverse" : "border border-line bg-card"
      }`}
    >
      <div className="px-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className={`text-sm font-semibold ${strongCls}`}>{heading}</h2>
          {config.showTabs && (
            <div
              role="group"
              aria-label="Período"
              className={`flex items-center gap-0.5 rounded-lg p-0.5 ${
                dark ? "bg-white/10" : "bg-subtle"
              }`}
            >
              {PERIOD_TABS.map((tab) => {
                const active = tab.key === period;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPeriod(tab.key)}
                    className={`min-h-8 rounded-md px-2.5 text-xs font-medium transition-colors ${
                      active
                        ? dark
                          ? "bg-white/20 text-white"
                          : "bg-card text-heading ring-1 ring-line"
                        : dark
                          ? "text-white/80 hover:text-white"
                          : "text-muted hover:text-heading"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <div
            className={`money text-[28px] font-semibold tracking-tight ${
              totals[config.metric] < 0 && !dark ? "text-danger" : strongCls
            }`}
          >
            {fmtMinor(totals[config.metric], currency)}
          </div>
          {config.showDelta && delta !== null && (
            <span
              className={`money rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                deltaGood
                  ? dark
                    ? "bg-brand-soft/20 text-brand-soft"
                    : "bg-ok-bg text-ok"
                  : dark
                    ? "bg-danger-soft/20 text-danger-soft"
                    : "bg-danger-bg text-danger"
              }`}
            >
              {delta >= 0 ? "+" : ""}
              {delta}%
            </span>
          )}
        </div>
        <div className={`mt-0.5 text-xs font-medium ${mutedCls}`}>
          {METRIC_LABELS[config.metric]} · {WINDOW_LABELS[period]}
        </div>
      </div>

      {/* mx-4: la línea y su punto final respiran respecto al borde. */}
      <div className="relative mx-4 mt-3" style={{ height: CHART_H }}>
        {empty ? (
          <p className={`flex h-full items-center justify-center text-sm ${mutedCls}`}>
            Sin movimientos en este periodo.
          </p>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              className="block h-full w-full"
              aria-hidden="true"
            >
              {/* Rejilla punteada recesiva (tres niveles). */}
              {[0.25, 0.5, 0.75].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  x2={CHART_W}
                  y1={PAD_TOP + ratio * (CHART_H - PAD_TOP - PAD_BOTTOM)}
                  y2={PAD_TOP + ratio * (CHART_H - PAD_TOP - PAD_BOTTOM)}
                  stroke={
                    dark
                      ? "var(--color-inverse-foreground)"
                      : "var(--color-line)"
                  }
                  strokeOpacity={dark ? 0.12 : 1}
                  strokeDasharray="2 4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {/* Área plana (sin degradado): la misma tinta, muy tenue. */}
              <path d={area} fill={line} fillOpacity={dark ? 0.14 : 0.08} />
              <path
                d={d}
                fill="none"
                stroke={line}
                strokeWidth="2"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={dot[0]}
                y1={dot[1]}
                x2={dot[0]}
                y2={CHART_H}
                stroke={line}
                strokeWidth="1.6"
                strokeDasharray="5 6"
                opacity="0.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300"
              style={{
                left: `${dotLeftPct.toFixed(2)}%`,
                top: `${dot[1].toFixed(1)}px`,
                background: line,
                boxShadow: `0 0 0 4px color-mix(in srgb, ${line} ${dark ? 26 : 18}%, transparent)`,
              }}
            />
            <div
              className={`absolute min-w-[100px] rounded-lg px-3 py-2 transition-all duration-300 ${
                dark ? "bg-white/10" : "border border-line bg-card"
              }`}
              style={{
                left: `${tipLeftPct.toFixed(2)}%`,
                top: `${Math.max(dot[1] - 64, 8).toFixed(1)}px`,
              }}
            >
              <div className={`text-xs font-medium ${mutedCls}`}>
                {lastBucket.label}
              </div>
              <div className={`mt-0.5 text-sm font-semibold ${strongCls}`}>
                {fmtMinor(last, currency)}
              </div>
            </div>
          </>
        )}
      </div>

      {stats.length > 0 && (
        <div
          className={`grid border-t ${dividerCls}`}
          style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`px-2 py-3.5 text-center ${
                i > 0 ? `border-l ${dividerCls}` : ""
              }`}
            >
              <div className={`money text-sm font-semibold ${stat.cls}`}>
                {fmtMinor(stat.value, currency)}
              </div>
              <div className={`mt-0.5 text-xs ${mutedCls}`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {missingRates.length > 0 && (
        <p className={`px-4 pb-3 text-[11px] ${mutedCls}`}>
          Sin tasa para {missingRates.join(", ")}: esos montos no se incluyen.
        </p>
      )}
    </section>
  );
}

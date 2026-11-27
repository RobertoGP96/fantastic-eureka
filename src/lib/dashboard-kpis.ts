// KPIs de flujo del mes (ingresos, gastos, neto) para las tarjetas de Inicio.
// Lógica pura sobre la serie mensual que ya calcula dashboardMetrics: no
// añade consultas. La variación compara con el mes anterior.

import { deltaPct, type MonthBucket } from "@/lib/metrics-core";

export interface FlowKpi {
  valueMinor: number;
  /** Variación % contra el mes anterior; null si no hay con qué comparar. */
  delta: number | null;
  /** true si la variación es favorable: más ingreso, menos gasto, más neto. */
  deltaGood: boolean;
  /** Un punto por mes (del más antiguo al actual) para el mini-gráfico. */
  series: number[];
}

export interface FlowKpis {
  /** Etiqueta corta del mes en curso ("nov"). */
  monthLabel: string;
  /** Etiqueta del mes contra el que se compara; null si es el primero. */
  previousLabel: string | null;
  income: FlowKpi;
  expense: FlowKpi;
  net: FlowKpi;
}

const netOf = (month: MonthBucket) => month.incomeMinor - month.expenseMinor;

/** null si la serie viene vacía (sin moneda base no hay métricas). */
export function buildFlowKpis(series: readonly MonthBucket[]): FlowKpis | null {
  const current = series.at(-1);
  if (!current) return null;
  const previous = series.length > 1 ? series[series.length - 2] : null;

  const incomeDelta = previous
    ? deltaPct(current.incomeMinor, previous.incomeMinor)
    : null;
  const expenseDelta = previous
    ? deltaPct(current.expenseMinor, previous.expenseMinor)
    : null;
  // deltaPct devuelve null con base ≤ 0: un neto anterior negativo o nulo no
  // admite un porcentaje con sentido.
  const netDelta = previous ? deltaPct(netOf(current), netOf(previous)) : null;

  return {
    monthLabel: current.label,
    previousLabel: previous?.label ?? null,
    income: {
      valueMinor: current.incomeMinor,
      delta: incomeDelta,
      deltaGood: incomeDelta === null || incomeDelta >= 0,
      series: series.map((month) => month.incomeMinor),
    },
    expense: {
      valueMinor: current.expenseMinor,
      delta: expenseDelta,
      deltaGood: expenseDelta === null || expenseDelta <= 0,
      series: series.map((month) => month.expenseMinor),
    },
    net: {
      valueMinor: netOf(current),
      delta: netDelta,
      deltaGood: netDelta === null || netDelta >= 0,
      series: series.map(netOf),
    },
  };
}

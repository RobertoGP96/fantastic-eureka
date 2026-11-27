import { cn } from "@/lib/utils";

// Barra de progreso plana: relleno de acento sobre pista neutra. Decorativa
// (aria-hidden): el dato siempre va también en texto junto a ella.
type ProgressTone = "brand" | "ok" | "track";

const FILL: Record<ProgressTone, string> = {
  brand: "bg-brand",
  ok: "bg-ok",
  // Mismo gris que las barras de contexto de los gráficos.
  track: "bg-chart-track",
};

interface ProgressBarProps {
  /** Porcentaje 0–100 (se acota). */
  percent: number;
  tone?: ProgressTone;
  /** Ancho mínimo visible cuando hay algo de progreso. */
  minPercent?: number;
  className?: string;
}

export function ProgressBar({
  percent,
  tone = "brand",
  minPercent = 0,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(percent > 0 ? minPercent : 0, percent));
  return (
    <div
      aria-hidden="true"
      className={cn("h-1.5 overflow-hidden rounded-full bg-subtle", className)}
    >
      <div
        className={cn("h-full rounded-full", FILL[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

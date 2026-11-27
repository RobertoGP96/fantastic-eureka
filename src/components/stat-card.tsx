import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";

// Tarjeta KPI: etiqueta pequeña, cifra grande con la unidad atenuada,
// variación opcional y mini-gráfico. Sustituye a los datos que antes iban en
// blanco sobre el héroe en degradado.
//
// CONTRATO DE DOM (lo fijan los tests E2E y stat-card.test.tsx):
//  - la etiqueta y el valor son hijos DIRECTOS de la raíz, así
//    `getByText("Saldo actual").locator("xpath=..")` contiene el monto;
//  - entre la cifra y la unidad hay un espacio real, así el texto se lee
//    «4 750 CUP» y no «4 750CUP»;
//  - la etiqueta es un <div>, nunca un encabezado (los tests buscan
//    encabezados por subcadena: «Cuentas», «Movimientos recientes»…).

type StatTone = "default" | "danger" | "ok";

const VALUE_TONE: Record<StatTone, string> = {
  default: "text-heading",
  danger: "text-danger",
  ok: "text-ok",
};

interface DeltaChipProps {
  /** Variación en %. */
  value: number;
  /** true = favorable (verde); false = desfavorable (rojo). */
  good: boolean;
  className?: string;
}

export function DeltaChip({ value, good, className }: DeltaChipProps) {
  return (
    <span
      className={cn(
        "money inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        good ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger",
        className
      )}
    >
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  );
}

interface StatCardProps {
  label: string;
  /** Cifra o texto principal. */
  value: ReactNode;
  /** Unidad atenuada tras la cifra (código de moneda, «cuotas»…). */
  unit?: string;
  /** Variación % contra el período anterior; null/undefined = sin chip. */
  delta?: number | null;
  /** Si la variación es favorable. Por defecto, subir es bueno. */
  deltaGood?: boolean;
  /** Línea secundaria bajo la cifra. */
  hint?: ReactNode;
  /** Serie para el mini-gráfico (se omite con menos de 2 puntos). */
  sparkline?: number[];
  sparklineColor?: string;
  tone?: StatTone;
  /** lg: cifra de cabecera de detalle (saldo de una cuenta). */
  size?: "md" | "lg";
  /** Convierte la tarjeta entera en enlace. */
  href?: string;
  className?: string;
  /** Pie libre a todo el ancho (barra de progreso, botones). */
  children?: ReactNode;
}

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaGood,
  hint,
  sparkline,
  sparklineColor,
  tone = "default",
  size = "md",
  href,
  className,
  children,
}: StatCardProps) {
  const hasDelta = delta !== null && delta !== undefined;
  const rootClass = cn(
    "grid grid-cols-[minmax(0,1fr)_auto] content-start gap-x-2 rounded-2xl border border-line bg-card p-4",
    href && "transition-colors hover:border-brand-soft",
    className
  );

  const content = (
    <>
      <div className="col-start-1 row-start-1 min-w-0 text-xs font-medium text-muted">
        {label}
      </div>
      {hasDelta && (
        <DeltaChip
          value={delta}
          good={deltaGood ?? delta >= 0}
          className="col-start-2 row-start-1 self-start"
        />
      )}
      <div
        className={cn(
          "money col-span-2 mt-1.5 min-w-0 font-semibold tracking-tight break-words",
          size === "lg" ? "text-[28px] leading-9" : "text-xl md:text-[22px]",
          VALUE_TONE[tone]
        )}
      >
        {value}
        {unit && (
          <>
            {" "}
            <span className="text-sm font-medium tracking-normal text-muted">
              {unit}
            </span>
          </>
        )}
      </div>
      {hint && <div className="col-span-2 mt-1 text-xs text-muted">{hint}</div>}
      {sparkline && sparkline.length > 1 && (
        <div className="col-span-2 mt-2">
          <Sparkline
            values={sparkline}
            height={28}
            color={sparklineColor}
            fluid
            area
            className="block"
          />
        </div>
      )}
      {children && <div className="col-span-2 mt-3">{children}</div>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rootClass}>
        {content}
      </Link>
    );
  }
  return <div className={rootClass}>{content}</div>;
}

const GRID_COLS = {
  2: "@2xl/main:grid-cols-2",
  3: "@2xl/main:grid-cols-3",
  4: "@4xl/main:grid-cols-4",
} as const;

interface StatGridProps {
  /** Columnas en escritorio; en móvil siempre 2 (1 si `stack`). */
  cols?: 2 | 3 | 4;
  /** Una sola columna en móvil (cifras largas, p. ej. multi-moneda). */
  stack?: boolean;
  className?: string;
  children: ReactNode;
}

export function StatGrid({
  cols = 4,
  stack = false,
  className,
  children,
}: StatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        stack ? "grid-cols-1" : "grid-cols-2",
        GRID_COLS[cols],
        className
      )}
    >
      {children}
    </div>
  );
}

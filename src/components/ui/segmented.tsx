import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Control segmentado: pista gris con la opción activa como píldora blanca.
//  - SegmentedLinks: filtros de páginas servidor que viven en la URL (?dir=…).
//  - Segmented: estado de cliente (períodos de un gráfico, modo de un form).
// Sin "use client" a propósito: no guarda estado, lo recibe por props.

type SegmentedSize = "md" | "sm";
type SegmentedLayout = "inline" | "fill" | "grid";

const TRACK: Record<SegmentedLayout, string> = {
  // inline: se ajusta al contenido y hace scroll horizontal si no cabe.
  inline:
    "no-scrollbar inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-subtle p-0.5",
  // fill: ocupa el ancho y reparte las opciones a partes iguales.
  fill: "flex w-full items-stretch gap-0.5 rounded-lg bg-subtle p-0.5",
  // grid: dos columnas, para 4 opciones de texto largo.
  grid: "grid w-full grid-cols-2 gap-0.5 rounded-lg bg-subtle p-0.5",
};

const ITEM_SIZE: Record<SegmentedSize, string> = {
  md: "min-h-10 px-3 text-sm dense:min-h-8 dense:text-xs",
  sm: "min-h-8 px-2.5 text-xs",
};

const ITEM_BASE =
  "inline-flex items-center justify-center rounded-md text-center font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function itemClass(
  active: boolean,
  size: SegmentedSize,
  layout: SegmentedLayout
): string {
  return cn(
    ITEM_BASE,
    ITEM_SIZE[size],
    layout === "inline" ? "flex-none whitespace-nowrap" : "min-w-0 flex-1",
    active
      ? "bg-card text-heading ring-1 ring-line"
      : "text-muted hover:text-heading"
  );
}

interface SegmentedLinksProps {
  options: readonly { value: string; label: React.ReactNode; href: string }[];
  /** `value` de la opción activa. */
  current: string;
  ariaLabel: string;
  size?: SegmentedSize;
  layout?: SegmentedLayout;
  className?: string;
}

function SegmentedLinks({
  options,
  current,
  ariaLabel,
  size = "md",
  layout = "inline",
  className,
}: SegmentedLinksProps) {
  return (
    <nav aria-label={ariaLabel} className={cn(TRACK[layout], className)}>
      {options.map((option) => {
        const active = option.value === current;
        return (
          <Link
            key={option.value}
            href={option.href}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={itemClass(active, size, layout)}
          >
            {option.label}
          </Link>
        );
      })}
    </nav>
  );
}

interface SegmentedProps<V extends string> {
  options: readonly { value: V; label: React.ReactNode; disabled?: boolean }[];
  value: V;
  onValueChange: (value: V) => void;
  ariaLabel: string;
  size?: SegmentedSize;
  layout?: SegmentedLayout;
  className?: string;
}

function Segmented<V extends string>({
  options,
  value,
  onValueChange,
  ariaLabel,
  size = "md",
  layout = "inline",
  className,
}: SegmentedProps<V>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn(TRACK[layout], className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            disabled={option.disabled}
            onClick={() => onValueChange(option.value)}
            className={cn(
              itemClass(active, size, layout),
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { Segmented, SegmentedLinks };

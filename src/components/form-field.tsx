import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Piezas comunes de los formularios (los que viven en drawer y los de
// página). El `<label>` ENVUELVE al control a propósito: da el nombre
// accesible sin ids y los tests E2E localizan los campos así.

export function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <span className="text-sm font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Clase del `SelectTrigger` de un campo de formulario (a juego con `Input`). */
export const FIELD_SELECT =
  "h-11 w-full rounded-xl border border-input bg-card px-4 text-base font-normal text-ink";

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-xl bg-danger-bg px-3.5 py-2.5 text-sm font-medium text-danger"
    >
      {children}
    </div>
  );
}

/** Elección excluyente entre pocas opciones (dirección, tipo de plan…). */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  /** Nombre accesible del grupo. */
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-11 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
              active
                ? "border-brand-ink bg-chip text-brand-ink"
                : "border-line bg-card text-ink-soft hover:border-brand-soft"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

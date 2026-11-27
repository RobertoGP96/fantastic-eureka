import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Piezas comunes de los formularios (los que viven en drawer y los de
// página). El `<label>` ENVUELVE al control a propósito: da el nombre
// accesible sin ids y los tests E2E localizan los campos así. Los Select
// usan `<SelectTrigger variant="form" className="w-full">` y las elecciones
// excluyentes `<Segmented layout="fill">`.

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
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

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

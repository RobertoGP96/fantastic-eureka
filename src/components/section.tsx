import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sección con título. Es un `<section>` con `<h2>` a propósito: los tests
 * E2E localizan las secciones por su encabezado.
 */
export function Section({
  title,
  action,
  className,
  children,
}: {
  title: string;
  /** Acción alineada a la derecha del título (enlace, botón pequeño). */
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-heading">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Tarjeta base del contenido (superficie blanca con borde). */
export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("rounded-2xl border border-line bg-card p-4", className)}
    >
      {children}
    </div>
  );
}

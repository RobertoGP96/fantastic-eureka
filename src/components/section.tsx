import type { ComponentProps, ReactNode } from "react";
import { SectionHeader } from "@/components/section-header";
import { cn } from "@/lib/utils";

/**
 * Sección con título: el `<section>` + `SectionHeader` que casi todas las
 * vistas repiten. Es un `<section>` con encabezado real a propósito: los
 * tests E2E localizan las secciones así (no anidar una dentro de otra).
 */
export function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Enlace estándar ({href,label}) o cualquier nodo. */
  action?: ComponentProps<typeof SectionHeader>["action"];
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("min-w-0", className)}>
      <SectionHeader title={title} description={description} action={action} />
      {children}
    </section>
  );
}

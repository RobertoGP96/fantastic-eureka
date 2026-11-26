import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Primitivas de layout de página (server-compatibles). Sustituyen al
// `px-5 pt-5 md:max-w-* md:px-0` que cada vista escribía a mano.
//
// Los grids usan CONTAINER QUERIES (`@2xl:`…) y no `md:`/`lg:`: con el
// sidebar plegable el ancho del viewport no dice cuánto mide el contenido.
// `PageBody` es el contenedor de referencia (`@container`).
//
// OJO: `anim-fade-up` y `@container` crean bloque contenedor, así que nada
// `position: fixed` puede vivir dentro de PageBody sin portal.

const WIDTHS = {
  /** Formularios y ajustes de una columna. */
  narrow: "md:max-w-md",
  /** Lectura cómoda en una columna. */
  default: "md:max-w-2xl",
  /** Todo el ancho del panel: grids y dos columnas. */
  wide: "",
} as const;

export function PageBody({
  width = "wide",
  className,
  children,
}: {
  width?: keyof typeof WIDTHS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "anim-fade-up @container flex flex-1 flex-col gap-5 px-5 pt-5 md:px-0 md:pt-6",
        WIDTHS[width],
        className
      )}
    >
      {children}
    </div>
  );
}

/** Rejilla de tarjetas: 1 columna en móvil, 2 y 3 según quepa. */
export function CardGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "anim-stagger grid grid-cols-1 gap-2.5 @2xl:grid-cols-2 @2xl:gap-3 @5xl:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Detalle en dos columnas cuando hay sitio: contenido principal + lateral
 * fijo (resumen y acciones). En estrecho se apilan; `asideFirst` decide si
 * el lateral va antes (acciones a mano) o después del contenido.
 */
export function SplitLayout({
  main,
  aside,
  asideFirst = false,
  className,
}: {
  main: ReactNode;
  aside: ReactNode;
  asideFirst?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_20rem] @4xl:items-start @4xl:gap-6",
        className
      )}
    >
      {/* @container: las rejillas de dentro se miden contra ESTA columna,
          no contra la página entera. */}
      <div className="@container flex min-w-0 flex-col gap-5">{main}</div>
      <aside
        className={cn(
          "flex min-w-0 flex-col gap-4 @4xl:sticky @4xl:top-6",
          asideFirst && "order-first @4xl:order-none"
        )}
      >
        {aside}
      </aside>
    </div>
  );
}

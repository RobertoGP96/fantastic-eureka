import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Rejillas de contenido (server-compatibles). El esqueleto de pantalla es
// <Page>/<PageBody> (src/components/page.tsx); aquí viven las dos rejillas
// que casi todas las vistas repiten.
//
// Usan las container queries de la columna de contenido (`@…/main`, definida
// en el layout de (app)) y no `md:`/`lg:`: con la barra lateral abierta el
// viewport no dice cuánto mide el contenido.

const CARD_COLS = {
  2: "@2xl/main:grid-cols-2",
  3: "@2xl/main:grid-cols-2 @4xl/main:grid-cols-3",
} as const;

/**
 * Rejilla de teselas: 1 columna en móvil y 2 o 3 según quepa. `cols={2}`
 * para rejillas que viven en la columna principal de un `SplitLayout`.
 */
export function CardGrid({
  cols = 3,
  className,
  children,
}: {
  cols?: keyof typeof CARD_COLS;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "anim-stagger grid grid-cols-1 gap-3",
        CARD_COLS[cols],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Detalle en dos columnas cuando hay sitio: principal (8) + lateral (4). En
 * estrecho se apilan; `asideFirst` decide si el lateral va antes (resumen y
 * acciones a mano) o después del contenido.
 *
 * Las columnas son <div>, no <section>: los tests E2E localizan cada
 * sección por SU <section>, que no puede quedar dentro de otra.
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
        "grid grid-cols-1 gap-5 @4xl/main:grid-cols-12 @4xl/main:items-start",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-5 @4xl/main:col-span-8">
        {main}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-5 @4xl/main:col-span-4",
          asideFirst && "order-first @4xl/main:order-none"
        )}
      >
        {aside}
      </div>
    </div>
  );
}

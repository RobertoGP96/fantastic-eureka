import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

// Tarjeta del sistema v3: blanca, borde fino, SIN sombra. Es un <div>; para
// que la propia tarjeta sea un <section>, <article> o <Link> se usa asChild
// (los tests localizan secciones por su <section>: no anidar otra por error).

type CardPadding = "none" | "sm" | "md";

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-3.5",
  md: "p-4",
};

interface CardProps extends React.ComponentProps<"div"> {
  asChild?: boolean;
  /** none para listas a sangre (filas con su propio padding). */
  padding?: CardPadding;
  /** Borde discontinuo: marcadores de posición y vacíos. */
  dashed?: boolean;
  /** Realce del borde al pasar el ratón (tarjetas que son enlaces). */
  interactive?: boolean;
}

function Card({
  className,
  asChild = false,
  padding = "md",
  dashed = false,
  interactive = false,
  ...props
}: CardProps) {
  const Comp = asChild ? Slot.Root : "div";
  return (
    <Comp
      data-slot="card"
      className={cn(
        "rounded-2xl border border-line bg-card text-card-foreground",
        PADDING[padding],
        dashed && "border-dashed",
        interactive && "transition-colors hover:border-brand-soft",
        className
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("mb-3 flex items-start justify-between gap-3", className)}
      {...props}
    />
  );
}

interface CardTitleProps extends React.ComponentProps<"h2"> {
  /** Nivel del encabezado; "div" si el título no debe contar como tal. */
  as?: "h2" | "h3" | "div";
}

function CardTitle({ className, as: Comp = "h2", ...props }: CardTitleProps) {
  return (
    <Comp
      data-slot="card-title"
      className={cn("text-sm font-semibold text-heading", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-xs text-muted", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription };

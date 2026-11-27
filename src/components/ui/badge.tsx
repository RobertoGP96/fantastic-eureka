import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "featured"
  | "neutral"
  | "accent"
  | "ok"
  | "warn"
  | "danger"
  | "gold";

// neutral es gris (metadatos: tipo, frecuencia, conteos); accent lleva el
// tinte verde-azul y se reserva para lo que está activo o seleccionado.
const VARIANTS: Record<BadgeVariant, string> = {
  featured: "bg-brand text-white",
  neutral: "bg-subtle text-ink-soft",
  accent: "bg-chip text-brand-ink",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
  // Solo avisos de dinero (cuotas por vencer).
  gold: "bg-gold-bg text-warn",
};

interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge, type BadgeVariant };

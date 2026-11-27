import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "chip" | "danger";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50";

// Un solo relleno de acento (default); outline y ghost son neutros para que
// el verde-azul siga significando «acción principal».
const VARIANTS: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary-hover",
  outline: "border border-line bg-card text-ink hover:bg-subtle",
  ghost: "bg-transparent text-ink-soft hover:bg-subtle hover:text-heading",
  chip: "bg-chip text-brand-ink hover:bg-brand-soft/30",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

// `dense:` = escritorio con ratón: controles de 36 px. En táctil, 44 px.
const SIZES: Record<ButtonSize, string> = {
  default: "min-h-11 rounded-xl px-4 py-2 text-sm dense:min-h-9",
  sm: "min-h-8 rounded-lg px-3 py-1.5 text-xs",
  lg: "min-h-[52px] rounded-xl px-6 py-3 text-base dense:min-h-11",
  icon: "size-10 rounded-xl p-0 [&_svg]:size-[18px]",
};

/**
 * Clases de botón para lo que NO es un <button>: enlaces de navegación con
 * aspecto de botón (`<Link className={buttonVariants({ variant: "outline" })}>`).
 */
function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonProps extends React.ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonVariant, type ButtonSize };

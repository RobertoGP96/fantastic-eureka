import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "chip" | "danger";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary-hover",
  outline:
    "border border-input bg-card text-ink-soft hover:border-brand-ink hover:text-brand-ink",
  ghost: "bg-transparent text-brand-ink hover:bg-chip",
  chip: "bg-chip text-brand-ink hover:bg-brand-soft/30",
  danger: "bg-destructive text-destructive-foreground hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  default: "min-h-11 rounded-xl px-5 py-2.5 text-sm",
  sm: "min-h-8 rounded-lg px-3 py-1.5 text-xs",
  lg: "min-h-[52px] rounded-xl px-6 py-3.5 text-base",
  icon: "size-10 rounded-xl p-0 [&_svg]:size-[18px]",
};

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
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}

export { Button, type ButtonVariant, type ButtonSize };

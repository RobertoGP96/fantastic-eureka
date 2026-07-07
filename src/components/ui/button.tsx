import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "ghost" | "chip" | "danger";
type ButtonSize = "default" | "sm" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  default: "bg-brand text-white hover:bg-brand-mid",
  outline:
    "border border-line bg-white text-ink-soft hover:border-brand-soft hover:text-brand",
  ghost: "bg-transparent text-muted hover:text-brand",
  chip: "bg-chip text-brand hover:bg-brand-soft/30",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  default: "rounded-xl px-[22px] py-[11px] text-[13.5px]",
  sm: "rounded-lg px-[11px] py-1.5 text-[11.5px]",
  lg: "rounded-[13px] px-[26px] py-3.5 text-[14.5px]",
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
        "inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-brand-soft/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}

export { Button, type ButtonVariant, type ButtonSize };

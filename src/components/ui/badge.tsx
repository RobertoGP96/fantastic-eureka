import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "featured" | "neutral" | "ok" | "warn" | "danger";

const VARIANTS: Record<BadgeVariant, string> = {
  featured: "grad-cta text-white",
  neutral: "bg-chip text-brand",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
};

interface BadgeProps extends React.ComponentProps<"span"> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-[3px] text-[10px] font-semibold",
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge, type BadgeVariant };

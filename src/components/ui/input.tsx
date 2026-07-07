import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full min-w-0 rounded-[13px] border border-line bg-white px-3.5 py-2 text-sm text-ink transition-colors placeholder:text-muted-2 focus-visible:border-brand-soft focus-visible:ring-2 focus-visible:ring-brand-soft/40 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };

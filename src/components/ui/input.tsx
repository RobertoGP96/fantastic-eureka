import * as React from "react";
import { cn } from "@/lib/utils";

// 44 px y texto de 16 px en táctil (iOS hace zoom por debajo de 16 px);
// 36 px y 14 px en escritorio con ratón (`dense:`).
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 py-2 text-base text-ink transition-colors placeholder:text-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 dense:h-9 dense:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input };

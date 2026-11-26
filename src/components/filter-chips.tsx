import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FilterChip {
  href: string;
  label: string;
  active: boolean;
}

/** Chips de filtro por enlace (el filtro vive en la query, lo lee el servidor). */
export function FilterChips({
  items,
  className,
}: {
  items: FilterChip[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "true" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            item.active
              ? "bg-primary text-primary-foreground"
              : "bg-chip text-brand-ink hover:bg-brand-soft/30"
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

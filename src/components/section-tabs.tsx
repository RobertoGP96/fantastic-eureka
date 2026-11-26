import Link from "next/link";
import { HandCoins, Repeat, UsersRound, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionTab {
  href: string;
  label: string;
  icon?: LucideIcon;
}

/**
 * Control segmentado entre vistas hermanas de una misma sección. En móvil
 * ocupa todo el ancho (las pestañas se reparten); en escritorio se ajusta
 * a su contenido.
 */
export function SectionTabs({
  items,
  current,
  label,
  className,
}: {
  items: SectionTab[];
  /** `href` de la pestaña activa. */
  current: string;
  /** Nombre accesible de la navegación. */
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cn(
        "flex w-full gap-1 rounded-xl bg-chip p-1 md:inline-flex md:w-auto md:self-start",
        className
      )}
    >
      {items.map((item) => {
        const active = item.href === current;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:flex-none md:px-4",
              active
                ? "bg-card text-brand-ink"
                : "text-ink-soft hover:text-brand-ink"
            )}
          >
            {Icon && <Icon className="size-3.5 flex-none" />}
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const DEBT_TABS: SectionTab[] = [
  { href: "/deudas", label: "Deudas", icon: HandCoins },
  { href: "/mensualidades", label: "Mensualidades", icon: Repeat },
  { href: "/contactos", label: "Contactos", icon: UsersRound },
];

/** Pestañas compartidas por Deudas, Mensualidades y Contactos. */
export function DebtsTabs({
  current,
}: {
  current: "/deudas" | "/mensualidades" | "/contactos";
}) {
  return (
    <SectionTabs
      items={DEBT_TABS}
      current={current}
      label="Deudas, mensualidades y contactos"
    />
  );
}

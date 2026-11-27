"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  Wallet,
  Plus,
  HandCoins,
  Menu,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: (pathname: string) => boolean;
}

const LEFT: NavItem[] = [
  { href: "/", icon: House, label: "Inicio", isActive: (p) => p === "/" },
  {
    href: "/cuentas",
    icon: Wallet,
    label: "Cuentas",
    isActive: (p) => p.startsWith("/cuentas"),
  },
];

const RIGHT: NavItem[] = [
  {
    href: "/deudas",
    icon: HandCoins,
    label: "Deudas",
    // Mensualidades cuelga de esta pestaña: ambas vistas se enlazan entre sí.
    isActive: (p) => p.startsWith("/deudas") || p.startsWith("/mensualidades"),
  },
  {
    href: "/mas",
    icon: Menu,
    label: "Más",
    isActive: (p) =>
      p.startsWith("/mas") ||
      p.startsWith("/tasas") ||
      p.startsWith("/movimientos") ||
      p.startsWith("/categorias") ||
      p.startsWith("/monedas") ||
      p.startsWith("/calculadora") ||
      // Conteo se abre desde «Más» y su flecha vuelve ahí.
      p.startsWith("/conteo") ||
      p.startsWith("/perfil"),
  },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.isActive(pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className="flex min-h-12 w-16 flex-col items-center justify-center gap-0.5 text-[11px]"
    >
      <span
        className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
          active ? "bg-chip text-brand-ink" : "text-muted"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
      </span>
      <span
        className={
          active ? "font-semibold text-brand-ink" : "font-medium text-muted"
        }
      >
        {item.label}
      </span>
    </Link>
  );
}

// Barra inferior de móvil: plana, con borde fino arriba (sin sombra ni
// esquinas redondeadas) y el «+» como botón de acento al centro.
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="sticky bottom-0 z-40 mt-auto border-t border-line bg-card pb-[max(env(safe-area-inset-bottom),8px)] md:hidden"
    >
      <div className="flex items-center justify-around px-2 pt-1.5">
        {LEFT.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <Link
          href="/registrar"
          aria-label="Registrar movimiento"
          className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-colors active:bg-primary-hover"
        >
          <Plus className="h-6 w-6" strokeWidth={2.2} />
        </Link>
        {RIGHT.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

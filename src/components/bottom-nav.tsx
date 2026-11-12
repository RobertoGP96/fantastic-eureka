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
      className="relative flex w-16 flex-col items-center min-h-12 gap-0.5 text-[11px] font-semibold"
    >
      <span
        className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
          active ? "bg-chip text-brand-ink" : "text-muted"
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
      </span>
      <span className={active ? "text-brand-ink" : "text-muted"}>
        {item.label}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-40 mt-auto rounded-t-3xl border-t border-line-2 bg-card pb-[max(env(safe-area-inset-bottom),8px)] shadow-nav md:hidden">
      <div className="flex items-end justify-around px-2 pt-2">
        {LEFT.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
        <Link
          href="/registrar"
          aria-label="Registrar movimiento"
          className="grad-cta -mt-9 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-fab ring-4 ring-app transition-transform active:scale-95"
        >
          <Plus className="h-6 w-6" strokeWidth={2.4} />
        </Link>
        {RIGHT.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}

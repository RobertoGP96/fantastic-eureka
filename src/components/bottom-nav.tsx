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
    isActive: (p) => p.startsWith("/cuentas") || p.startsWith("/conteo"),
  },
];

const RIGHT: NavItem[] = [
  {
    href: "/deudas",
    icon: HandCoins,
    label: "Deudas",
    isActive: (p) => p.startsWith("/deudas"),
  },
  {
    href: "/mas",
    icon: Menu,
    label: "Más",
    isActive: (p) =>
      p.startsWith("/mas") ||
      p.startsWith("/tasas") ||
      p.startsWith("/movimientos") ||
      p.startsWith("/categorias"),
  },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.isActive(pathname);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`relative flex w-14 flex-col items-center gap-[3px] text-[10.5px] font-semibold transition-colors ${
        active ? "text-brand" : "text-muted-2"
      }`}
    >
      <Icon
        className={`h-[19px] w-[19px] transition-transform ${active ? "scale-110" : ""}`}
        strokeWidth={active ? 2.4 : 2}
      />
      {item.label}
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 mt-auto flex items-end justify-around rounded-t-[20px] border-t border-[#E2E8F1] bg-white px-2 pt-[11px] pb-[17px] shadow-[0_-4px_16px_rgba(10,31,63,.06)] md:hidden">
      {LEFT.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
      <Link
        href="/registrar"
        aria-label="Registrar movimiento"
        className="grad-cta -mt-8 flex h-[52px] w-[52px] items-center justify-center rounded-full text-white shadow-[0_8px_20px_rgba(20,65,127,.4)] transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" strokeWidth={2.4} />
      </Link>
      {RIGHT.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </nav>
  );
}

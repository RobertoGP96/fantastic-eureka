"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, Plus } from "lucide-react";
import { APP_NAME } from "@/lib/config";

const LINKS = [
  { href: "/", label: "Inicio", isActive: (p: string) => p === "/" },
  {
    href: "/cuentas",
    label: "Cuentas",
    isActive: (p: string) => p.startsWith("/cuentas") || p.startsWith("/conteo"),
  },
  {
    href: "/movimientos",
    label: "Movimientos",
    isActive: (p: string) => p.startsWith("/movimientos"),
  },
  {
    href: "/deudas",
    label: "Deudas",
    isActive: (p: string) => p.startsWith("/deudas"),
  },
  {
    href: "/tasas",
    label: "Tasas",
    isActive: (p: string) => p.startsWith("/tasas"),
  },
  {
    href: "/categorias",
    label: "Categorías",
    isActive: (p: string) => p.startsWith("/categorias"),
  },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="grad-header sticky top-0 z-40 hidden text-white shadow-[0_4px_18px_rgba(10,31,63,.25)] md:block">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.3px] transition-opacity hover:opacity-85"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-white/10">
            <Coins className="h-[18px] w-[18px]" />
          </span>
          {APP_NAME}
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = link.isActive(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/registrar"
            className="flex h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-[13.5px] font-semibold transition-colors hover:bg-white/20"
          >
            <Plus className="h-[18px] w-[18px]" />
            Registrar
          </Link>
        </div>
      </div>
    </header>
  );
}

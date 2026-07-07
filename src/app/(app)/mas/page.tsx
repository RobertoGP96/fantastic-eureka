import Link from "next/link";
import {
  Banknote,
  ArrowRightLeft,
  Coins,
  History,
  Tags,
  ChevronRight,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { LogoutButton } from "@/components/logout-button";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface MenuItem {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const ITEMS: MenuItem[] = [
  {
    href: "/conteo",
    icon: Banknote,
    title: "Conteo de efectivo",
    description: "Arqueo de cajas con denominaciones",
  },
  {
    href: "/tasas",
    icon: ArrowRightLeft,
    title: "Tasas de cambio",
    description: "Tasas vigentes, histórico y conversor",
  },
  {
    href: "/movimientos",
    icon: History,
    title: "Movimientos",
    description: "Historial completo con filtros",
  },
  {
    href: "/categorias",
    icon: Tags,
    title: "Categorías",
    description: "Categorías de gastos e ingresos",
  },
  {
    href: "/monedas",
    icon: Coins,
    title: "Monedas y denominaciones",
    description: "Divisas del sistema, billetes y monedas",
  },
];

export default async function MasPage() {
  const user = await getSessionUser();

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Más opciones" />
      <div className="anim-fade-up flex flex-col gap-3 px-5 pt-5 md:max-w-xl md:px-0">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-[18px] border border-line bg-white p-4 transition-colors hover:border-brand-soft"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-chip text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <span className="flex-1">
                <span className="block text-[14px] font-semibold text-navy">
                  {item.title}
                </span>
                <span className="block text-[12px] text-muted">
                  {item.description}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-muted-2" />
            </Link>
          );
        })}

        {user && (
          <div className="mt-2 rounded-[18px] border border-line bg-white p-4">
            <Link
              href="/perfil"
              className="mb-3 flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-chip text-brand">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-navy">
                  {user.name}
                </div>
                <div className="truncate text-[12px] text-muted">
                  Editar perfil · {user.email}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 flex-none text-muted-2" />
            </Link>
            <LogoutButton />
          </div>
        )}
      </div>
    </main>
  );
}

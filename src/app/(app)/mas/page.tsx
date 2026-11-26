import Link from "next/link";
import {
  Banknote,
  ArrowRightLeft,
  Calculator,
  CalendarClock,
  Coins,
  History,
  Tags,
  ChevronRight,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { CardGrid, PageBody } from "@/components/page-body";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/section";
import { LogoutButton } from "@/components/logout-button";
import { requireSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface MenuItem {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

const ITEMS: MenuItem[] = [
  {
    href: "/mensualidades",
    icon: CalendarClock,
    title: "Mensualidades",
    description: "Renta, suscripciones y cuotas fijas",
  },
  {
    href: "/contactos",
    icon: UsersRound,
    title: "Contactos",
    description: "Personas de tus deudas y mensualidades",
  },
  {
    href: "/conteo",
    icon: Banknote,
    title: "Conteo de efectivo",
    description: "Arqueo de cajas con denominaciones",
  },
  {
    href: "/calculadora",
    icon: Calculator,
    title: "Calculadora de efectivo",
    description: "Cuenta billetes y monedas sin elegir cuenta",
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
  const user = await requireSessionUser();

  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Más opciones" />
      <PageBody>
        {/* gap-3 en móvil como la lista de siempre; CardGrid la reparte en
            2 y 3 columnas cuando hay ancho. */}
        <CardGrid className="gap-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="press flex items-center gap-4 rounded-2xl border border-line bg-card p-4 hover:border-brand-soft focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-heading">
                    {item.title}
                  </span>
                  <span className="block text-xs text-muted">
                    {item.description}
                  </span>
                </span>
                <ChevronRight className="size-4 flex-none text-muted" />
              </Link>
            );
          })}
        </CardGrid>

        {/* El bloque de usuario no crece con el panel: es una sola tarjeta. */}
        <Card className="@2xl:max-w-md">
          <Link
            href="/perfil"
            className="mb-3 flex items-center gap-3 rounded-xl transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none"
          >
            <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
              <UserRound className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-heading">
                {user.name}
              </div>
              <div className="truncate text-xs text-muted">
                Editar perfil · {user.email}
              </div>
            </div>
            <ChevronRight className="size-4 flex-none text-muted" />
          </Link>
          <LogoutButton />
        </Card>
      </PageBody>
    </main>
  );
}

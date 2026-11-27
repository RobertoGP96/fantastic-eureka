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
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { LogoutButton } from "@/components/logout-button";
import { Card } from "@/components/ui/card";
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
    <Page>
      <ScreenHeader title="Más opciones" />
      <PageBody>
        <div className="grid grid-cols-1 gap-3 @2xl/main:grid-cols-2 @4xl/main:grid-cols-3">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              // Cada opción es UN solo enlace (tesela entera).
              <Card key={item.href} asChild interactive>
                <Link href={item.href} className="flex items-center gap-3">
                  <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-heading">
                      {item.title}
                    </span>
                    <span className="block text-xs text-muted">
                      {item.description}
                    </span>
                  </span>
                  <ChevronRight className="size-4 flex-none text-muted" />
                </Link>
              </Card>
            );
          })}
        </div>

        {user && (
          // Perfil y cierre de sesión: apilados en móvil, en una fila cuando
          // hay ancho. El enlace y el botón son hermanos.
          <Card className="flex flex-col gap-3 @2xl/main:flex-row @2xl/main:items-center">
            <Link
              href="/perfil"
              className="group flex min-w-0 flex-1 items-center gap-3"
            >
              <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-chip text-brand-ink">
                <UserRound className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-heading transition-colors group-hover:text-brand-ink">
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
        )}
      </PageBody>
    </Page>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Banknote,
  Calculator,
  CalendarClock,
  ChevronsUpDown,
  Coins,
  HandCoins,
  History,
  House,
  LogOut,
  Plus,
  Tags,
  UserRound,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { logoutUser } from "@/app/actions/auth-actions";
import { BrandMark } from "@/components/brand-mark";
import { initials } from "@/components/user-menu";
import { APP_NAME } from "@/lib/config";

interface NavItem {
  href: string;
  icon: LucideIcon;
  /** Texto visible (corto: el grupo ya da el contexto). */
  label: string;
  /** Nombre completo para el tooltip de la barra plegada. */
  tooltip?: string;
  isActive: (pathname: string) => boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [
      { href: "/", icon: House, label: "Inicio", isActive: (p) => p === "/" },
      {
        href: "/cuentas",
        icon: Wallet,
        label: "Cuentas",
        isActive: (p) => p.startsWith("/cuentas"),
      },
      {
        href: "/movimientos",
        icon: History,
        label: "Movimientos",
        isActive: (p) => p.startsWith("/movimientos"),
      },
    ],
  },
  {
    label: "Compromisos",
    items: [
      {
        href: "/deudas",
        icon: HandCoins,
        label: "Deudas",
        isActive: (p) => p.startsWith("/deudas"),
      },
      {
        href: "/mensualidades",
        icon: CalendarClock,
        label: "Mensualidades",
        isActive: (p) => p.startsWith("/mensualidades"),
      },
      {
        href: "/contactos",
        icon: UsersRound,
        label: "Contactos",
        isActive: (p) => p.startsWith("/contactos"),
      },
    ],
  },
  {
    label: "Efectivo",
    items: [
      {
        href: "/conteo",
        icon: Banknote,
        label: "Conteo",
        tooltip: "Conteo de efectivo",
        isActive: (p) => p.startsWith("/conteo"),
      },
      {
        href: "/calculadora",
        icon: Calculator,
        label: "Calculadora",
        tooltip: "Calculadora de efectivo",
        isActive: (p) => p.startsWith("/calculadora"),
      },
    ],
  },
  {
    label: "Ajustes",
    items: [
      {
        href: "/tasas",
        icon: ArrowRightLeft,
        label: "Tasas de cambio",
        isActive: (p) => p.startsWith("/tasas"),
      },
      {
        href: "/monedas",
        icon: Coins,
        label: "Monedas",
        isActive: (p) => p.startsWith("/monedas"),
      },
      {
        href: "/categorias",
        icon: Tags,
        label: "Categorías",
        isActive: (p) => p.startsWith("/categorias"),
      },
    ],
  },
];

// Barra lateral de escritorio (en móvil manda la barra inferior). Todos los
// colores salen de los tokens --color-sidebar-*: pasarla a clara es cambiar
// ese bloque de globals.css, sin tocar este archivo.
export function AppSidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await logoutUser();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    // border-r-0!: sobre fondo oscuro el borde por defecto dejaba una raya
    // vertical; important porque la clase original lleva la variante
    // group-data-[side=left]: y gana en especificidad a un border-r-0 plano.
    <Sidebar collapsible="icon" className="border-r-0!">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={APP_NAME}>
              <Link href="/">
                {/* span: esquiva el [&>svg]:size-4 del SidebarMenuButton */}
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <BrandMark className="size-8" idPrefix="fe-sidebar" />
                </span>
                <span className="text-base font-semibold tracking-tight text-sidebar-accent-foreground">
                  {APP_NAME}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Acceso global a «Registrar»: en escritorio no existía (en móvil
              es el «+» de la barra inferior). Plegada queda como cuadrado «+». */}
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Registrar movimiento"
              className="justify-center bg-sidebar-primary font-semibold text-sidebar-primary-foreground hover:bg-brand-mid hover:text-sidebar-primary-foreground active:bg-brand-mid active:text-sidebar-primary-foreground data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
            >
              <Link
                href="/registrar"
                aria-current={
                  pathname.startsWith("/registrar") ? "page" : undefined
                }
              >
                <Plus />
                <span>Registrar</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.isActive(pathname);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.tooltip ?? item.label}
                      >
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  aria-label={`Cuenta de ${userName}`}
                  isActive={pathname.startsWith("/perfil")}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                    {initials(userName)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-sm font-semibold text-sidebar-accent-foreground">
                      {userName}
                    </span>
                    <span className="truncate text-xs text-sidebar-muted">
                      {userEmail}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto text-sidebar-muted" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="right"
                align="end"
                sideOffset={8}
                className="min-w-52 rounded-xl border-line"
              >
                <DropdownMenuLabel>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-heading">
                      {userName}
                    </span>
                    <span className="truncate text-xs font-normal text-muted">
                      {userEmail}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/perfil">
                    <UserRound />
                    Mi perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => void logout()}
                >
                  <LogOut />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  Banknote,
  Coins,
  HandCoins,
  History,
  House,
  LogOut,
  Plus,
  Tags,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
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
import { APP_NAME } from "@/lib/config";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: (pathname: string) => boolean;
}

const MAIN: NavItem[] = [
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
  {
    href: "/deudas",
    icon: HandCoins,
    label: "Deudas",
    isActive: (p) => p.startsWith("/deudas"),
  },
];

const TOOLS: NavItem[] = [
  {
    href: "/conteo",
    icon: Banknote,
    label: "Conteo de efectivo",
    isActive: (p) => p.startsWith("/conteo"),
  },
  {
    href: "/tasas",
    icon: ArrowRightLeft,
    label: "Tasas de cambio",
    isActive: (p) => p.startsWith("/tasas"),
  },
  {
    href: "/categorias",
    icon: Tags,
    label: "Categorías",
    isActive: (p) => p.startsWith("/categorias"),
  },
  {
    href: "/monedas",
    icon: Coins,
    label: "Monedas",
    isActive: (p) => p.startsWith("/monedas"),
  },
];

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

  const renderItems = (items: NavItem[]) =>
    items.map((item) => {
      const Icon = item.icon;
      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={item.isActive(pathname)}
            tooltip={item.label}
          >
            <Link href={item.href}>
              <Icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip={APP_NAME}>
              <Link href="/">
                <span className="grad-cta flex size-8 shrink-0 items-center justify-center rounded-lg text-white">
                  <Coins className="size-4" />
                </span>
                <span className="text-[15px] font-bold tracking-[-0.3px] text-white">
                  {APP_NAME}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Registrar movimiento"
              className="bg-sidebar-primary font-semibold text-sidebar-primary-foreground hover:bg-brand-light hover:text-white"
            >
              <Link href="/registrar">
                <Plus />
                <span>Registrar</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(MAIN)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Herramientas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(TOOLS)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="Mi perfil"
              isActive={pathname.startsWith("/perfil")}
            >
              <Link href="/perfil">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
                  <UserRound className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-semibold text-white">
                    {userName}
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    {userEmail}
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Cerrar sesión"
              onClick={() => void logout()}
            >
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { InstallmentNotifications } from "@/components/installment-notifications";
import { NotificationsBellFallback } from "@/components/notifications-bell";
import { PanelRouteReset } from "@/components/panel-route-reset";
import { ScrollReset } from "@/components/scroll-reset";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Todo lo que cuelga de (app) exige sesión válida. El middleware ya filtra
// por presencia de cookie; aquí se valida contra la BD.
// Escritorio: barra lateral plegable + barra superior (breadcrumb y campana);
// móvil: cabecera de cada pantalla + barra inferior.
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // /auth/salir limpia la cookie si quedó huérfana (evita bucles de redirect).
  const user = await getSessionUser();
  if (!user) redirect("/auth/salir");

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="md:bg-sidebar">
      <AppSidebar userName={user.name} userEmail={user.email} />
      <SidebarInset className="md:h-svh md:overflow-hidden md:rounded-l-2xl">
        <header className="hidden h-12 shrink-0 items-center gap-2 border-b border-line px-4 md:flex">
          <SidebarTrigger
            title="Plegar menú (Ctrl+B)"
            className="text-ink-soft hover:bg-subtle hover:text-heading"
          />
          <Separator orientation="vertical" className="h-4" />
          <AppBreadcrumb />
          <div className="ml-auto flex items-center">
            {/* Suspense: la consulta de cuotas no retrasa el layout ni el
                esqueleto de carga. El layout no se re-renderiza al navegar:
                la campana se refresca con cada acción que revalida y al
                recargar. */}
            <Suspense fallback={<NotificationsBellFallback />}>
              <InstallmentNotifications userId={user.id} />
            </Suspense>
          </div>
        </header>
        {/* En md+ el scroll vive aquí (el body no scrollea): así las esquinas
            redondeadas del panel quedan fijas al viewport. En móvil no hay
            overflow propio y sigue scrolleando el body (bottom nav sticky). */}
        <div
          id="app-scroll"
          className="flex flex-1 flex-col md:min-h-0 md:overflow-y-auto md:[scrollbar-gutter:stable]"
        >
          <ScrollReset targetId="app-scroll" />
          <PanelRouteReset />
          {/* @container/main: las rejillas de contenido responden al ancho
              REAL de esta columna (`@4xl/main:`), no al del viewport, que
              miente con la barra lateral abierta. Ojo: es contenedor de los
              position: fixed de dentro — lo flotante va por portal. */}
          <div className="@container/main mx-auto flex min-h-full w-full flex-1 flex-col md:max-w-6xl md:px-8 md:pb-12">
            {children}
            <BottomNav />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

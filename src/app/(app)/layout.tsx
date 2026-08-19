import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppBreadcrumb } from "@/components/app-breadcrumb";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ScrollReset } from "@/components/scroll-reset";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

// Todo lo que cuelga de (app) exige sesión válida. El middleware ya filtra
// por presencia de cookie; aquí se valida contra la BD.
// Escritorio: sidebar shadcn colapsable + barra superior; móvil: bottom nav.
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
      <SidebarInset className="bg-page md:h-svh md:overflow-hidden md:rounded-l-2xl md:bg-app">
        <header className="hidden h-12 shrink-0 items-center gap-3 border-b border-line-2 bg-app px-4 md:flex">
          <SidebarTrigger className="text-ink-soft hover:bg-chip hover:text-brand" />
          <Separator orientation="vertical" className="h-5" />
          <AppBreadcrumb />
          <span className="ml-auto hidden items-center gap-1 text-[11px] text-muted-2 lg:flex">
            <kbd className="rounded-md border border-line bg-white px-1.5 py-0.5 font-sans">
              Ctrl
            </kbd>
            <kbd className="rounded-md border border-line bg-white px-1.5 py-0.5 font-sans">
              B
            </kbd>
            para plegar el menú
          </span>
        </header>
        {/* En md+ el scroll vive aquí (el body no scrollea): así las esquinas
            redondeadas del panel quedan fijas al viewport. En móvil no hay
            overflow propio y sigue scrolleando el body (bottom nav sticky). */}
        <div
          id="app-scroll"
          className="flex flex-1 justify-center md:min-h-0 md:overflow-y-auto"
        >
          <ScrollReset targetId="app-scroll" />
          <div className="relative flex min-h-full w-full max-w-[430px] flex-col bg-app shadow-[0_0_40px_rgba(7,39,46,.16)] md:max-w-5xl md:bg-transparent md:px-6 md:pb-12 md:shadow-none">
            {children}
            <BottomNav />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

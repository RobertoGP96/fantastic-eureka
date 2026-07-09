import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { BrandMark } from "@/components/brand-mark";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/lib/config";

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
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar userName={user.name} userEmail={user.email} />
      <SidebarInset className="bg-page md:bg-app">
        <header className="sticky top-0 z-30 hidden h-12 shrink-0 items-center gap-3 border-b border-line-2 bg-app/85 px-4 backdrop-blur md:flex">
          <SidebarTrigger className="text-ink-soft hover:bg-chip hover:text-brand" />
          <Separator orientation="vertical" className="h-5" />
          <BrandMark className="size-5 shrink-0" />
          <span className="text-[13px] font-semibold text-ink-soft">
            {APP_NAME}
          </span>
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
        <div className="flex flex-1 justify-center">
          <div className="relative flex min-h-full w-full max-w-[430px] flex-col bg-app shadow-[0_0_40px_rgba(7,39,46,.16)] md:max-w-5xl md:bg-transparent md:px-6 md:pb-12 md:shadow-none">
            {children}
            <BottomNav />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

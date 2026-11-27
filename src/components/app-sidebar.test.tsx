// Guarda de regresión del sidebar de escritorio: NO lleva acceso a
// «Registrar». Se quitó a petición del usuario (2026-11-27) y no debe volver
// a incluirse; si este test falla, quita el botón en vez de tocar el test.
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
// Las server actions importan Prisma (server-only): siempre mockeadas aquí.
vi.mock("@/app/actions/auth-actions", () => ({ logoutUser: vi.fn() }));

beforeAll(() => {
  // jsdom no trae matchMedia y useIsMobile lo consulta al montar; con su
  // ancho por defecto (1024 px) se pinta la rama de escritorio.
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(cleanup);

describe("AppSidebar", () => {
  it("pinta la navegación de escritorio sin acceso a «Registrar»", () => {
    const { container } = render(
      <SidebarProvider>
        <AppSidebar userName="Ana Pérez" userEmail="ana@caja.test" />
      </SidebarProvider>
    );

    // Ancla: el sidebar SÍ se ha pintado (si no, lo de abajo pasaría en vacío).
    expect(screen.getByRole("link", { name: "Movimientos" })).toHaveAttribute(
      "href",
      "/movimientos"
    );

    expect(screen.queryByRole("link", { name: /registrar/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /registrar/i })).toBeNull();
    expect(container.querySelector('a[href^="/registrar"]')).toBeNull();
  });
});

import { SearchX } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState } from "@/components/empty-state";

// 404 dentro de la zona autenticada: lo disparan los `notFound()` de las
// páginas de detalle (id ajeno o ya eliminado: cuenta, movimiento, deuda…).
// Conserva sidebar/bottom nav y ofrece una salida, en vez del 404 pelado.
export default function AppNotFound() {
  return (
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="No encontrado" />
      <EmptyState
        icon={SearchX}
        title="Esto ya no existe"
        description="El elemento que buscas fue eliminado o el enlace no es correcto."
        ctaLabel="Ir a Inicio"
        ctaHref="/"
      />
    </main>
  );
}

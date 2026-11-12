import { Eye } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { ShareCodeForm } from "./code-form";

export const dynamic = "force-dynamic";

// Portada de /compartir: quien tenga solo el código (sin el enlace) lo pega
// aquí. Con ?invalido=1 se explica que el código no abrió.
export default async function CompartirIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ invalido?: string }>;
}) {
  const { invalido } = await searchParams;
  return (
    <main className="flex flex-1 flex-col">
      <ScreenHeader title="Cuenta compartida">
        <p className="mt-2 text-sm text-white/80">
          Consulta el saldo y los movimientos de una cuenta con el código que
          te enviaron. Válido durante 24 h.
        </p>
      </ScreenHeader>
      <div className="anim-fade-up flex flex-col gap-5 px-5 pt-5 md:px-0">
        <div className="rounded-2xl border border-line bg-white px-4 py-4">
          <ShareCodeForm invalid={invalido === "1"} />
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-xs text-muted">
          <Eye className="mt-0.5 h-4 w-4 flex-none text-brand" />
          <span>
            Solo verás la información: no se puede registrar ni modificar
            nada desde esta vista.
          </span>
        </div>
      </div>
    </main>
  );
}

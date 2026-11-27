import { Eye } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { Card } from "@/components/ui/card";
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
    <Page width="form">
      <ScreenHeader
        title="Cuenta compartida"
        subtitle="Consulta el saldo y los movimientos de una cuenta con el código que te enviaron. Válido durante 24 h."
      />
      <PageBody className="gap-3">
        <Card>
          <ShareCodeForm invalid={invalido === "1"} />
        </Card>
        {/* Nota al pie de la tarjeta: informa, no compite con el formulario. */}
        <p className="flex items-start gap-2 px-1 text-xs text-muted">
          <Eye className="mt-0.5 size-3.5 flex-none" aria-hidden />
          <span>
            Solo verás la información: no se puede registrar ni modificar
            nada desde esta vista.
          </span>
        </p>
      </PageBody>
    </Page>
  );
}

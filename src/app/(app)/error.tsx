"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Page, PageBody } from "@/components/page";
import { ScreenHeader } from "@/components/screen-header";
import { Button, buttonVariants } from "@/components/ui/button";

// Límite de error de TODA la zona autenticada. Sin él, cualquier excepción de
// un server component (típico: arranque en frío de Neon, P1001/P2024) caía
// en la pantalla genérica de Next, sin navegación ni forma de reintentar —
// y en la PWA instalada no hay barra del navegador para salir.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Page>
      <ScreenHeader title="Algo salió mal" />
      <PageBody className="justify-center">
        {/* Mismo marco que EmptyState (vacío de página), con icono de
            peligro y dos salidas: reintentar o volver a Inicio. */}
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-card px-6 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-danger-bg text-danger">
            <TriangleAlert className="size-6" />
          </div>
          <p className="text-base font-semibold text-heading">
            No se pudo cargar esta pantalla
          </p>
          <p className="max-w-sm text-sm text-muted">
            Suele ser un corte momentáneo de conexión con la base de datos. Tus
            datos no se han perdido: vuelve a intentarlo en unos segundos.
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => reset()}>Reintentar</Button>
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Ir a Inicio
            </Link>
          </div>
          {error.digest && (
            <p className="text-[11px] break-all text-muted">
              Referencia: {error.digest}
            </p>
          )}
        </div>
      </PageBody>
    </Page>
  );
}

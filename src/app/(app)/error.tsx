"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";

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
    <main className="flex flex-1 flex-col pb-8">
      <ScreenHeader title="Algo salió mal" />
      <div className="anim-fade-up flex flex-1 flex-col items-center justify-center gap-3.5 p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-bg text-danger">
          <TriangleAlert className="h-7 w-7" />
        </div>
        <div className="text-base font-semibold text-navy">
          No se pudo cargar esta pantalla
        </div>
        <p className="max-w-sm text-center text-sm text-muted">
          Suele ser un corte momentáneo de conexión con la base de datos. Tus
          datos no se han perdido: vuelve a intentarlo en unos segundos.
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-2.5">
          <Button onClick={() => reset()}>Reintentar</Button>
          <Link
            href="/"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-chip"
          >
            Ir a Inicio
          </Link>
        </div>
        {error.digest && (
          <p className="text-[11px] text-muted">Referencia: {error.digest}</p>
        )}
      </div>
    </main>
  );
}

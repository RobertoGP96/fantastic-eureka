"use client";

import { useUI } from "@/lib/ui-store";

export function Toast() {
  const { toast } = useUI();
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      // w-max + max-w: un elemento fixed con left:50% solo dispone de media
      // pantalla; así ocupa lo que necesite hasta el ancho del viewport y el
      // texto largo salta de línea en vez de salirse por los lados.
      className="toast-pop w-max max-w-[calc(100vw-2rem)] text-center z-50 rounded-xl bg-inverse px-5 py-3 text-sm font-medium text-inverse-foreground shadow-toast">
      {toast}
    </div>
  );
}

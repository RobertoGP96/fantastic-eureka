"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// En escritorio el contenido scrollea DENTRO del panel redondeado (no en el
// body), y el router de Next solo repone el scroll de la ventana al navegar:
// este componente devuelve el contenedor arriba en cada cambio de ruta.
export function ScrollReset({ targetId }: { targetId: string }) {
  const pathname = usePathname();

  useEffect(() => {
    document.getElementById(targetId)?.scrollTo(0, 0);
  }, [pathname, targetId]);

  return null;
}

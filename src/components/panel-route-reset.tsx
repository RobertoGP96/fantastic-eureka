"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { forgetPanelOutside } from "@/hooks/use-panel";

/**
 * Va montado UNA vez en el layout: al cambiar de ruta descarta el drawer
 * («panel») que hubiera quedado abierto en la página anterior.
 */
export function PanelRouteReset() {
  const pathname = usePathname();
  useEffect(() => {
    forgetPanelOutside(pathname);
  }, [pathname]);
  return null;
}

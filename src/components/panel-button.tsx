"use client";

import type { ComponentProps } from "react";
import { openPanel } from "@/hooks/use-panel";

/**
 * Botón que abre un drawer de la página ACTUAL (`#panel=<panel>`). Se usa
 * en vez de `<Link href="#…">`: Next no notifica un cambio de fragmento
 * hecho con Link dentro de la misma página y además sube el scroll.
 * Sin estilos propios: la clase la pone quien lo usa.
 */
export function PanelButton({
  panel,
  params,
  onClick,
  ...props
}: Omit<ComponentProps<"button">, "type"> & {
  panel: string;
  params?: Record<string, string | undefined>;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) openPanel(panel, params);
      }}
      {...props}
    />
  );
}

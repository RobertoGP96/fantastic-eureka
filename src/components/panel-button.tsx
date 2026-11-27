"use client";

import type { ComponentProps } from "react";
import { openPanel } from "@/hooks/use-panel";

/**
 * Botón que abre un drawer con nombre (`PanelDrawer`) de la página ACTUAL.
 * Desde OTRA página se enlaza con `<Link href={panelHref(ruta, panel)}>`.
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

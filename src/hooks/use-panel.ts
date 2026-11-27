"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { parsePanelHash } from "@/lib/panel-core";

// Qué drawer («panel») está abierto en la página actual. Es estado de
// módulo (no vive en la URL): así cualquier botón puede abrir un panel con
// `openPanel(nombre)` sin pasar props, y la URL no cambia mientras está
// abierto (ver use-dismiss-on-back.ts para el porqué y para el botón Atrás).
//
// El fragmento `#panel=<nombre>&…` es solo un ENLACE DE ENTRADA: lo usan
// otras páginas (`panelHref`) y los redirects de las antiguas rutas
// `/x/nueva`. Al llegar, el panel se abre y el fragmento se quita.

type PanelParams = Record<string, string | undefined>;

interface OpenPanel {
  name: string;
  params: Record<string, string>;
  /** Página en la que se abrió: en otra ruta ya no cuenta como abierto. */
  path: string;
}

const listeners = new Set<() => void>();
let current: OpenPanel | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getCurrent = () => current;
const getServerCurrent = () => null;

function cleanParams(params: PanelParams = {}): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value) clean[key] = value;
  }
  return clean;
}

/** Abre un panel en la página actual. Usable fuera de React. */
export function openPanel(name: string, params?: PanelParams) {
  current = {
    name,
    params: cleanParams(params),
    path: window.location.pathname,
  };
  notify();
}

/** Cierra el panel `name` si es el que está abierto. */
export function closePanel(name: string) {
  if (current?.name !== name) return;
  current = null;
  notify();
}

/**
 * Olvida el panel abierto si pertenece a otra página. Lo llama
 * `PanelRouteReset` (montado en el layout) en cada cambio de ruta: tras
 * guardar y navegar, el panel se queda «abierto» hasta que la página cambia,
 * y sin esto volvería a abrirse al regresar con Atrás.
 */
export function forgetPanelOutside(pathname: string) {
  if (current === null || current.path === pathname) return;
  current = null;
  notify();
}

export interface PanelControls<P extends string = never> {
  /** false en el servidor y durante la hidratación. */
  isOpen: boolean;
  params: Readonly<Partial<Record<P, string>>>;
  open(params?: Partial<Record<P, string>>): void;
  close(): void;
  /**
   * Tras guardar con éxito: navega a `href` SUSTITUYENDO la entrada actual.
   * El panel sigue abierto (en «guardando») hasta que cambia la página.
   */
  closeAndGo(href: string): void;
}

const NO_PARAMS = Object.freeze({});

export function usePanel<P extends string = never>(
  name: string
): PanelControls<P> {
  const router = useRouter();
  const pathname = usePathname();
  const state = useSyncExternalStore(subscribe, getCurrent, getServerCurrent);

  // Enlace de entrada: `/deudas#panel=nueva-deuda` abre el panel al llegar
  // (o si el fragmento cambia estando ya en la página) y limpia la URL.
  useEffect(() => {
    const consumeHash = () => {
      const fromHash = parsePanelHash(window.location.hash);
      if (fromHash.name !== name) return;
      // Primero se limpia la URL y DESPUÉS se abre: el drawer apila su
      // centinela de «Atrás» con la URL ya sin fragmento (si lo heredara,
      // volver atrás reabriría el panel).
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
      openPanel(name, fromHash.params);
    };
    consumeHash();
    window.addEventListener("hashchange", consumeHash);
    return () => window.removeEventListener("hashchange", consumeHash);
  }, [name, pathname]);

  const open = useCallback(
    (params?: Partial<Record<P, string>>) => openPanel(name, params),
    [name]
  );
  const close = useCallback(() => closePanel(name), [name]);
  const closeAndGo = useCallback(
    (href: string) => {
      // Diferido: navegar en el mismo tick en que resuelve una server action
      // hace que Next descarte su resultado y vuelva a pedir la página.
      setTimeout(() => router.replace(href), 0);
    },
    [router]
  );

  const isOpen = state?.name === name && state.path === pathname;
  return {
    isOpen,
    params: (isOpen ? state.params : NO_PARAMS) as Readonly<
      Partial<Record<P, string>>
    >,
    open,
    close,
    closeAndGo,
  };
}

"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { buildPanelHash, parsePanelHash } from "@/lib/panel-core";

// Apertura de los drawers guardada en el fragmento de la URL. Ventajas:
//   · el botón Atrás (Android, PWA, navegador) cierra el drawer;
//   · otra vista puede enlazar a `/deudas#panel=nueva-deuda`.
//
// Reglas que este módulo respeta (leídas del router de Next 15):
//   · NADA propio en `history.state`: Next lo reescribe tras cada
//     navegación, refresh o server action.
//   · Ninguna llamada a history/router en el mismo tick en que resuelve una
//     server action: Next descartaría su resultado y forzaría otro refresh.
//     Por eso todo va diferido con `setTimeout(0)`.

type PanelParams = Record<string, string | undefined>;

const listeners = new Set<() => void>();
/** URL que ESTE módulo metió en el historial al abrir (para saber si Atrás es seguro). */
let pushedHref: string | null = null;
/** Cierre en curso: el drawer se oculta ya, aunque la URL tarde un instante. */
let closing = false;
let wired = false;

function notify() {
  listeners.forEach((listener) => listener());
}

function onHistoryEvent() {
  closing = false;
  if (window.location.href !== pushedHref) pushedHref = null;
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!wired) {
    wired = true;
    window.addEventListener("popstate", onHistoryEvent);
    window.addEventListener("hashchange", onHistoryEvent);
  }
  return () => {
    listeners.delete(listener);
  };
}

const getHash = () => (closing ? "" : window.location.hash);
const getServerHash = () => "";

function currentPath() {
  return window.location.pathname + window.location.search;
}

/** Abre un panel en la página actual. Usable fuera de React. */
export function openPanel(name: string, params?: PanelParams) {
  const url = currentPath() + buildPanelHash(name, params);
  closing = false;
  if (parsePanelHash(window.location.hash).name) {
    // Ya hay un panel: se sustituye, sin apilar otra entrada.
    window.history.replaceState(null, "", url);
  } else {
    window.history.pushState(null, "", url);
    pushedHref = window.location.href;
  }
  notify();
}

/** Cierra el panel `name` si es el que está abierto. */
export function closePanel(name: string) {
  if (closing) return;
  if (parsePanelHash(window.location.hash).name !== name) return;

  closing = true;
  notify();

  setTimeout(() => {
    if (parsePanelHash(window.location.hash).name !== name) {
      // Otro evento (Atrás, navegación) ya lo cerró mientras tanto.
      closing = false;
      notify();
      return;
    }
    if (pushedHref === window.location.href) {
      // Lo abrimos nosotros: deshacer esa entrada deja el historial limpio.
      // `popstate` repone `closing`.
      pushedHref = null;
      window.history.back();
    } else {
      // Se llegó por enlace directo: no hay entrada propia que deshacer.
      window.history.replaceState(null, "", currentPath());
      closing = false;
      notify();
    }
  }, 0);
}

export interface PanelControls<P extends string = never> {
  /** false en el servidor y durante la hidratación. */
  isOpen: boolean;
  params: Readonly<Partial<Record<P, string>>>;
  open(params?: Partial<Record<P, string>>): void;
  close(): void;
  /** Tras guardar con éxito: sustituye la entrada del panel por `href`. */
  closeAndGo(href: string): void;
}

export function usePanel<P extends string = never>(
  name: string
): PanelControls<P> {
  const router = useRouter();
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const state = useMemo(() => parsePanelHash(hash), [hash]);

  const open = useCallback(
    (params?: Partial<Record<P, string>>) => openPanel(name, params),
    [name]
  );
  const close = useCallback(() => closePanel(name), [name]);
  const closeAndGo = useCallback(
    (href: string) => {
      pushedHref = null;
      setTimeout(() => router.replace(href), 0);
    },
    [router]
  );

  const isOpen = state.name === name;
  return {
    isOpen,
    params: (isOpen ? state.params : {}) as Readonly<
      Partial<Record<P, string>>
    >,
    open,
    close,
    closeAndGo,
  };
}

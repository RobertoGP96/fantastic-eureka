"use client";

import { useEffect, useRef } from "react";

// «Atrás cierra el drawer» (botón del navegador, gesto de Android, PWA).
//
// Al abrirse un drawer se apila una entrada CENTINELA en el historial con la
// MISMA URL; Atrás la consume y, en vez de salir de la página, se cierra el
// drawer. La URL no cambia mientras está abierto, a propósito: un `#panel=…`
// o un `?panel=…` en la barra hace que el router de Next trate la página
// como otra y la vuelva a pedir tras cada server action.
//
// Reglas (leídas del router de Next 15):
//   · Nada propio en `history.state`: Next lo reescribe en cada commit.
//   · Ninguna llamada a history en el mismo tick en que resuelve una server
//     action (Next descartaría su resultado): el `back()` va en un timer.
//
// Estado de MÓDULO, compartido por todos los drawers: como mucho hay un
// centinela aunque se encadenen dos drawers (uno se cierra y abre otro).

let openCount = 0;
/** URL del centinela si es la entrada actual del historial; si no, null. */
let sentinelHref: string | null = null;
let backTimer: ReturnType<typeof setTimeout> | null = null;
/** El próximo popstate lo provocamos nosotros (back() de limpieza). */
let ownBack = false;
let wired = false;
const closers = new Set<() => void>();

function onPopState() {
  if (ownBack) {
    ownBack = false;
    return;
  }
  if (sentinelHref === null) return;
  // El usuario fue Atrás con un drawer abierto: el centinela ya no está.
  sentinelHref = null;
  [...closers].forEach((close) => close());
}

function acquire() {
  if (!wired) {
    wired = true;
    window.addEventListener("popstate", onPopState);
  }
  openCount += 1;
  // Otro drawer acaba de cerrarse y este se abre: se reutiliza su centinela.
  if (backTimer !== null) {
    clearTimeout(backTimer);
    backTimer = null;
  }
  if (sentinelHref === null) {
    window.history.pushState(null, "", window.location.href);
    sentinelHref = window.location.href;
  }
}

function release() {
  openCount = Math.max(0, openCount - 1);
  if (openCount > 0 || sentinelHref === null || backTimer !== null) return;

  backTimer = setTimeout(() => {
    backTimer = null;
    if (openCount > 0 || sentinelHref === null) return;
    const stillOnSentinel = window.location.href === sentinelHref;
    sentinelHref = null;
    // Si ya se navegó a otra página (p. ej. `router.replace` tras guardar),
    // esa navegación sustituyó al centinela: no hay nada que deshacer.
    if (stillOnSentinel) {
      ownBack = true;
      window.history.back();
    }
  }, 0);
}

/**
 * Mientras `open` sea true, el botón Atrás llama a `onClose` en lugar de
 * abandonar la página.
 */
export function useDismissOnBack(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const close = () => onCloseRef.current();
    closers.add(close);
    acquire();
    return () => {
      closers.delete(close);
      release();
    };
  }, [open]);
}

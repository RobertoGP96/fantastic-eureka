"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Estado de una media query. Devuelve `undefined` en el servidor y durante
 * la hidratación (todavía no se sabe), y el valor real en cuanto monta: a
 * diferencia de `useIsMobile`, nunca afirma «escritorio» antes de saberlo.
 */
export function useMediaQuery(query: string): boolean | undefined {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => undefined
  );
}

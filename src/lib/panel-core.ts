// Enlaces de entrada a un drawer («panel»): `/deudas#panel=nueva-deuda`.
// Lógica pura; el hook que los consume vive en src/hooks/use-panel.ts.
//
// El fragmento es SOLO la forma de llegar con un drawer ya abierto (desde
// otra página o desde un redirect de las antiguas rutas `/x/nueva`): al
// llegar, el panel se abre y el fragmento se quita de la URL. Mientras está
// abierto la URL no cambia — un `#…` o `?…` permanente hace que el router de
// Next vuelva a pedir la página tras cada server action.

const PANEL_KEY = "panel";

export interface PanelState {
  /** Nombre del panel abierto, o null si no hay ninguno. */
  name: string | null;
  /** Parámetros extra del panel (p. ej. `contacto`). */
  params: Record<string, string>;
}

const CLOSED: PanelState = { name: null, params: {} };

/** Lee el panel de un `location.hash` (con o sin `#`). */
export function parsePanelHash(hash: string): PanelState {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return CLOSED;

  const search = new URLSearchParams(raw);
  const name = search.get(PANEL_KEY);
  if (!name) return CLOSED;

  const params: Record<string, string> = {};
  search.forEach((value, key) => {
    if (key !== PANEL_KEY && value) params[key] = value;
  });
  return { name, params };
}

/** Fragmento (con `#`) que abre el panel `name` con sus parámetros. */
export function buildPanelHash(
  name: string,
  params: Record<string, string | undefined> = {}
): string {
  const search = new URLSearchParams({ [PANEL_KEY]: name });
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== PANEL_KEY) search.set(key, value);
  }
  return `#${search.toString()}`;
}

/**
 * Enlace a OTRA página con un panel ya abierto (p. ej. un atajo a
 * «/deudas#panel=nueva-deuda»). Dentro de la misma página no sirve un
 * `<Link>`: Next no notifica el cambio de fragmento; ahí se usa
 * `PanelButton` / `openPanel`.
 */
export function panelHref(
  path: string,
  name: string,
  params?: Record<string, string | undefined>
): string {
  return `${path}${buildPanelHash(name, params)}`;
}

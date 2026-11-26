// Estado de los drawers en el FRAGMENTO de la URL (`#panel=nueva-deuda`).
// Lógica pura; el hook que la usa vive en src/hooks/use-panel.ts.
//
// Va en el `#` y no en la query a propósito: el fragmento nunca llega al
// servidor, así que abrir o cerrar un drawer no cambia la clave de caché de
// la página ni provoca una petición (la query sí lo haría).

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

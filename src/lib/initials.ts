/**
 * Iniciales para un avatar: primera letra de la primera y de la última
 * palabra («Ana María Pérez» → «AP»); con una sola palabra, sus dos
 * primeras letras («Juan» → «JU»). Itera por puntos de código para no
 * partir emojis ni letras compuestas.
 */
export function initials(name: string, fallback = "?"): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;

  const first = [...parts[0]];
  const second =
    parts.length > 1 ? [...parts[parts.length - 1]][0] : (first[1] ?? "");
  return ((first[0] ?? "") + second).toUpperCase() || fallback;
}

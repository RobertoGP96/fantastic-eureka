// Ventana del pull incremental (lógica pura, con tests en window.test.ts).
//
// El cliente guarda `nextCursor` de cada pull y lo manda en el siguiente.
// Se devuelven las filas con updatedAt > cursor − SOLAPE: el solape cubre
// escrituras cuya transacción empezó antes del cursor pero se confirmó
// después (su updatedAt es anterior al instante en que se hicieron visibles).
// Repetir filas es inocuo: el cliente hace upsert por id.

/** Solape entre pulls consecutivos. */
export const PULL_OVERLAP_MS = 60_000;

/** Antigüedad máxima de un cursor antes de exigir un pull completo. */
export const RESYNC_AFTER_MS = 60 * 86_400_000;

export interface PullWindow {
  /** null = pull completo (bootstrap): se envían todas las filas. */
  since: Date | null;
  /** El cliente debe descartar sus datos y aplicar este pull como nuevo. */
  resync: boolean;
}

/**
 * Cursor ausente o inválido → bootstrap. Cursor más viejo que
 * RESYNC_AFTER_MS → resync: las lápidas de esa época pueden haberse
 * purgado, así que un pull incremental podría resucitar filas borradas.
 * Un cursor en el futuro (reloj del servidor movido) también fuerza resync.
 */
export function pullWindow(cursor: string | null, now: Date): PullWindow {
  if (!cursor) return { since: null, resync: false };
  const at = new Date(cursor);
  if (Number.isNaN(at.getTime())) return { since: null, resync: true };
  const age = now.getTime() - at.getTime();
  if (age > RESYNC_AFTER_MS || age < -PULL_OVERLAP_MS) {
    return { since: null, resync: true };
  }
  return { since: new Date(at.getTime() - PULL_OVERLAP_MS), resync: false };
}

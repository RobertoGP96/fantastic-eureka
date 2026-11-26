// Lógica pura de contactos (sin Prisma ni Next): búsqueda, resolución del
// texto del selector y saldos por moneda. La usan el servicio, las páginas
// de /contactos y el ContactPicker. Tests en contacts-core.test.ts.

/**
 * Forma canónica de un nombre para COMPARAR (nunca para mostrar): sin
 * acentos, sin mayúsculas y con los espacios colapsados. «  José  PÉREZ »
 * y «jose perez» son el mismo contacto.
 */
export function normalizeContactName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

interface Named {
  name: string;
}

/** ¿Algún contacto (salvo `exceptId`) ya usa ese nombre? */
export function isContactNameTaken<T extends Named & { id: string }>(
  contacts: readonly T[],
  name: string,
  exceptId?: string
): boolean {
  const wanted = normalizeContactName(name);
  if (!wanted) return false;
  return contacts.some(
    (contact) =>
      contact.id !== exceptId && normalizeContactName(contact.name) === wanted
  );
}

/**
 * Filtra por texto: sin acentos ni mayúsculas, y con TODAS las palabras de
 * la búsqueda presentes (en el nombre o en el teléfono). Conserva el orden
 * de entrada; primero los que empiezan por la búsqueda.
 */
export function filterContacts<T extends Named & { phone?: string | null }>(
  contacts: readonly T[],
  query: string
): T[] {
  const wanted = normalizeContactName(query);
  if (!wanted) return [...contacts];
  const words = wanted.split(" ");

  const matches = contacts.filter((contact) => {
    const haystack = `${normalizeContactName(contact.name)} ${(
      contact.phone ?? ""
    ).replace(/\s+/g, "")}`;
    return words.every((word) => haystack.includes(word));
  });

  const startsWith = (contact: T) =>
    normalizeContactName(contact.name).startsWith(wanted);
  return [
    ...matches.filter(startsWith),
    ...matches.filter((contact) => !startsWith(contact)),
  ];
}

/** Valor del selector de contacto de un formulario. */
export type ContactChoice =
  | { kind: "none" }
  | { kind: "existing"; id: string; name: string }
  | { kind: "new"; name: string };

/**
 * Qué contacto representa el texto escrito en el selector: vacío → ninguno;
 * coincide (normalizado) con uno existente → ESE (así escribir «juan» no
 * duplica a «Juan»); si no → uno nuevo con ese nombre.
 */
export function resolveContactInput<T extends Named & { id: string }>(
  text: string,
  contacts: readonly T[]
): ContactChoice {
  const name = text.trim().replace(/\s+/g, " ");
  if (!name) return { kind: "none" };

  const wanted = normalizeContactName(name);
  const existing = contacts.find(
    (contact) => normalizeContactName(contact.name) === wanted
  );
  if (existing) {
    return { kind: "existing", id: existing.id, name: existing.name };
  }
  return { kind: "new", name };
}

// ── Saldos ───────────────────────────────────────────────────────────────────

export interface DebtLike {
  direction: string; // RECEIVABLE | PAYABLE
  status: string; // OPEN | PAID | CANCELLED
  currencyId: string;
  totalMinor: number;
  /** Σ de abonos de la deuda. */
  paidMinor: number;
}

export interface ContactBalance {
  currencyId: string;
  /** Pendiente que el contacto me debe (deudas RECEIVABLE abiertas). */
  receivableMinor: number;
  /** Pendiente que yo le debo (deudas PAYABLE abiertas). */
  payableMinor: number;
}

/**
 * Pendiente por moneda de un conjunto de deudas, separando «me debe» de
 * «le debo». Solo cuentan las deudas ABIERTAS. Ordenado por el mayor
 * importe (en cualquiera de los dos sentidos) primero.
 */
export function contactBalances(debts: readonly DebtLike[]): ContactBalance[] {
  const byCurrency = new Map<string, ContactBalance>();
  for (const debt of debts) {
    if (debt.status !== "OPEN") continue;
    const remaining = Math.max(0, debt.totalMinor - debt.paidMinor);
    if (remaining === 0) continue;

    const entry = byCurrency.get(debt.currencyId) ?? {
      currencyId: debt.currencyId,
      receivableMinor: 0,
      payableMinor: 0,
    };
    if (debt.direction === "RECEIVABLE") entry.receivableMinor += remaining;
    else entry.payableMinor += remaining;
    byCurrency.set(debt.currencyId, entry);
  }

  const weight = (balance: ContactBalance) =>
    Math.max(balance.receivableMinor, balance.payableMinor);
  return [...byCurrency.values()].sort((a, b) => weight(b) - weight(a));
}

/**
 * Nota resultante de fusionar dos contactos: se conservan ambas (la del
 * destino primero), sin repetir y recortando al máximo del campo.
 */
export function mergeNotes(
  target: string | null,
  source: string | null,
  max = 200
): string | null {
  const a = target?.trim() ?? "";
  const b = source?.trim() ?? "";
  if (!a) return b || null;
  if (!b || normalizeContactName(a).includes(normalizeContactName(b))) return a;
  return `${a} · ${b}`.slice(0, max);
}

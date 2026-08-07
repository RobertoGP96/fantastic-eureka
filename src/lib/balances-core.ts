// Lógica pura del saldo derivado (sin Prisma, testeable):
//   + INCOME y ADJUSTMENT (con signo) sobre la cuenta
//   − EXPENSE y TRANSFER saliente
//   + TRANSFER entrante (counterAmountMinor, en la moneda de la cuenta destino)

export interface OwnKindGroup {
  accountId: string;
  kind: string;
  sumMinor: number;
}

export interface IncomingTransferGroup {
  accountId: string;
  sumMinor: number;
}

export function signedKindMinor(kind: string, sumMinor: number): number {
  switch (kind) {
    case "INCOME":
    case "ADJUSTMENT":
      return sumMinor;
    case "EXPENSE":
    case "TRANSFER":
      return -sumMinor;
    default:
      // Un kind desconocido corrompería el saldo en silencio: mejor fallar.
      throw new Error(`Tipo de transacción desconocido: ${kind}`);
  }
}

/**
 * Saldo por cuenta a partir de sumas agrupadas (groupBy) en vez de leer el
 * libro mayor fila a fila: `own` son las sumas por cuenta+kind y `incoming`
 * las transferencias entrantes agregadas por cuenta destino.
 */
export interface CurrencyTotal<C extends { id: string }> {
  currency: C;
  totalMinor: number;
}

/**
 * Suma de saldos por moneda (sin conversión), en el orden en que aparecen
 * las cuentas. Para los subtotales de grupo en /cuentas y el gadget de
 * totales por divisa del dashboard.
 */
export function totalsByCurrency<C extends { id: string }>(
  accounts: readonly { balanceMinor: number; currency: C }[]
): CurrencyTotal<C>[] {
  const totals: CurrencyTotal<C>[] = [];
  const byId = new Map<string, CurrencyTotal<C>>();
  for (const account of accounts) {
    const existing = byId.get(account.currency.id);
    if (existing) {
      existing.totalMinor += account.balanceMinor;
    } else {
      const entry = {
        currency: account.currency,
        totalMinor: account.balanceMinor,
      };
      byId.set(account.currency.id, entry);
      totals.push(entry);
    }
  }
  return totals;
}

export function balancesFromGroups(
  own: OwnKindGroup[],
  incoming: IncomingTransferGroup[]
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const group of own) {
    const current = balances.get(group.accountId) ?? 0;
    balances.set(
      group.accountId,
      current + signedKindMinor(group.kind, group.sumMinor)
    );
  }
  for (const group of incoming) {
    const current = balances.get(group.accountId) ?? 0;
    balances.set(group.accountId, current + group.sumMinor);
  }
  return balances;
}

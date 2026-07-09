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

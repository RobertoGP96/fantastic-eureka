// Lógica pura del saldo derivado (sin Prisma, testeable):
//   + INCOME y ADJUSTMENT (con signo) sobre la cuenta
//   − EXPENSE y TRANSFER saliente
//   + TRANSFER entrante (counterAmountMinor, en la moneda de la cuenta destino)
import { convertMinor } from "@/lib/money";

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

export interface ConsolidatedTotal {
  /** Suma en la moneda base de las cuentas que SÍ se pudieron convertir. */
  totalMinor: number;
  /** false si alguna cuenta con saldo quedó fuera por no tener tasa. */
  complete: boolean;
  /** Códigos de las monedas sin tasa, sin repetir y en orden de aparición. */
  missing: string[];
}

/**
 * Saldo consolidado en la moneda base. Las cuentas en la base suman directo
 * y las demás se convierten con su tasa vigente. Una cuenta sin tasa pero
 * con saldo 0 no estorba; con saldo distinto de 0 deja el total incompleto
 * (quien lo pinta decide si lo oculta: un total parcial engaña).
 */
export function consolidatedTotalMinor(
  accounts: readonly {
    balanceMinor: number;
    currency: { id: string; code: string; decimalPlaces: number };
  }[],
  base: { id: string; decimalPlaces: number },
  rates: ReadonlyMap<string, { rateScaled: number }>
): ConsolidatedTotal {
  let totalMinor = 0;
  const missing: string[] = [];
  for (const account of accounts) {
    if (account.currency.id === base.id) {
      totalMinor += account.balanceMinor;
      continue;
    }
    const rate = rates.get(account.currency.id);
    if (rate) {
      totalMinor += convertMinor(
        account.balanceMinor,
        account.currency,
        base,
        rate.rateScaled
      );
    } else if (
      account.balanceMinor !== 0 &&
      !missing.includes(account.currency.code)
    ) {
      missing.push(account.currency.code);
    }
  }
  return { totalMinor, complete: missing.length === 0, missing };
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

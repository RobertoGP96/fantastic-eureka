import "server-only";

import type { Prisma } from "@prisma/client";
import { TRANSACTION_KINDS } from "@/lib/domain";

export interface TxFilterParams {
  mes?: string;
  cuenta?: string;
  categoria?: string;
  tipo?: string;
}

/** "2026-07" → [1 jul, 1 ago); null si es "todos" o inválido. */
export function monthRange(
  mes: string | undefined
): { start: Date; end: Date } | null {
  if (!mes || mes === "todos") return null;
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
  };
}

/** Primer valor de un searchParam (`?x=a&x=b` llega como array). */
export function firstParam(
  value: string | string[] | undefined
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Mes efectivo del filtro: el pedido si es válido ("2026-07" o "todos") y si
 * no el mes actual. Antes un `?mes=2026-13` listaba TODO el historial
 * mientras la barra rotulaba otro mes.
 */
export function resolveMonthParam(mes: string | undefined): string {
  if (mes === "todos" || monthRange(mes)) return mes as string;
  return currentMonthParam();
}

export function currentMonthParam(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function buildTxWhere(
  userId: string,
  params: TxFilterParams
): Prisma.TransactionWhereInput {
  // userId SIEMPRE presente: es la frontera multi-tenant de movimientos/export.
  const where: Prisma.TransactionWhereInput = { userId };

  const range = monthRange(params.mes);
  if (range) where.occurredAt = { gte: range.start, lt: range.end };
  // Una cuenta participa en un movimiento por cualquiera de los dos lados:
  // sin el lado destino faltaban las transferencias RECIBIDAS y ni la lista
  // ni el CSV cuadraban con el saldo de la cuenta.
  if (params.cuenta) {
    where.OR = [
      { accountId: params.cuenta },
      { counterAccountId: params.cuenta },
    ];
  }
  if (params.categoria) where.categoryId = params.categoria;
  if (
    params.tipo &&
    (TRANSACTION_KINDS as readonly string[]).includes(params.tipo)
  ) {
    where.kind = params.tipo;
  }

  return where;
}

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
  if (params.cuenta) where.accountId = params.cuenta;
  if (params.categoria) where.categoryId = params.categoria;
  if (
    params.tipo &&
    (TRANSACTION_KINDS as readonly string[]).includes(params.tipo)
  ) {
    where.kind = params.tipo;
  }

  return where;
}

// Lápidas de borrado para la app móvil. El pull incremental solo ve filas que
// EXISTEN con updatedAt reciente; un borrado no deja fila, así que se anota
// aquí y el móvil lo replica.
//
// Solo se registran los borrados RAÍZ. Los hijos caen en el móvil por las
// mismas cascadas que aquí (Room replica las FKs de este esquema): al borrar
// una cuenta caen sus movimientos, arqueos y abonos; al borrar una deuda,
// sus abonos y planes; al borrar un movimiento, su desglose y su abono.
// Registrar la lápida SIEMPRE dentro de la transacción del borrado.

import type { Prisma } from "@prisma/client";

export const TOMBSTONE_COLLECTIONS = [
  "account",
  "accountGroup",
  "category",
  "denomination",
  "transaction",
  "debt",
  "paymentPlan",
] as const;

export type TombstoneCollection = (typeof TOMBSTONE_COLLECTIONS)[number];

export async function recordTombstone(
  tx: Prisma.TransactionClient,
  userId: string,
  collection: TombstoneCollection,
  rowId: string
): Promise<void> {
  await tx.syncTombstone.create({ data: { userId, collection, rowId } });
}

import "server-only";

// Pull de la app móvil: todas las filas del usuario cambiadas desde el
// cursor, más las lápidas de lo borrado. Contrato en docs/mobile-api.md.
//
// Reglas del contrato:
//   · Nunca se envía userId (el móvil es de un solo usuario).
//   · Fechas en ISO 8601 (UTC); montos como enteros en unidades menores.
//   · Un movimiento viaja CON su desglose (`denominationLines`) y un arqueo
//     CON sus líneas: el cliente reemplaza las líneas enteras de esa fila.
//     Así editar un movimiento (que borra y recrea su desglose) no necesita
//     lápidas por línea.
//   · Las tablas hijas sin userId se acotan por su fila dueña.

import { prisma } from "@/lib/db";
import { pullWindow } from "./window";

type WithUser = { userId?: string };

/** Quita userId de cada fila: no le incumbe al cliente. */
function strip<T extends WithUser>(rows: T[]): Omit<T, "userId">[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return rows.map(({ userId: _userId, ...rest }) => rest);
}

export async function pullChanges(userId: string, cursor: string | null) {
  // El cursor siguiente se fija ANTES de leer: lo escrito durante este pull
  // entra en el próximo (y el solape de window.ts cubre el resto).
  const nextCursor = new Date();
  const { since, resync } = pullWindow(cursor, nextCursor);
  const changed = since ? { updatedAt: { gt: since } } : {};

  const [
    user,
    currencies,
    denominations,
    accountGroups,
    accounts,
    categories,
    transactions,
    exchangeRates,
    cashCounts,
    contacts,
    debts,
    paymentPlans,
    installments,
    debtPayments,
    tombstones,
  ] = await Promise.all([
    prisma.user.findFirst({
      where: { id: userId, ...changed },
      select: { id: true, name: true, email: true, dashboardPrefs: true, updatedAt: true },
    }),
    prisma.currency.findMany({ where: { userId, ...changed } }),
    prisma.denomination.findMany({ where: { currency: { userId }, ...changed } }),
    prisma.accountGroup.findMany({ where: { userId, ...changed } }),
    prisma.account.findMany({ where: { userId, ...changed } }),
    prisma.category.findMany({ where: { userId, ...changed } }),
    prisma.transaction.findMany({
      where: { userId, ...changed },
      include: {
        denominationLines: {
          select: { id: true, accountId: true, denominationId: true, quantity: true },
        },
      },
    }),
    prisma.exchangeRate.findMany({ where: { userId, ...changed } }),
    prisma.cashCount.findMany({
      where: { userId, ...changed },
      include: {
        lines: { select: { id: true, denominationId: true, quantity: true } },
      },
    }),
    prisma.contact.findMany({ where: { userId, ...changed } }),
    prisma.debt.findMany({ where: { userId, ...changed } }),
    prisma.paymentPlan.findMany({ where: { userId, ...changed } }),
    prisma.installment.findMany({ where: { plan: { userId }, ...changed } }),
    prisma.debtPayment.findMany({ where: { debt: { userId }, ...changed } }),
    // En un pull completo no hacen falta lápidas: el cliente parte de cero.
    since
      ? prisma.syncTombstone.findMany({
          where: { userId, deletedAt: { gt: since } },
          select: { collection: true, rowId: true, deletedAt: true },
          orderBy: { deletedAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return {
    nextCursor: nextCursor.toISOString(),
    full: since === null,
    resync,
    user,
    collections: {
      currencies: strip(currencies),
      denominations,
      accountGroups: strip(accountGroups),
      accounts: strip(accounts),
      categories: strip(categories),
      transactions: strip(transactions),
      exchangeRates: strip(exchangeRates),
      cashCounts: strip(cashCounts),
      contacts: strip(contacts),
      debts: strip(debts),
      paymentPlans: strip(paymentPlans),
      installments,
      debtPayments,
    },
    tombstones,
  };
}

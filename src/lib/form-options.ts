import "server-only";

import { prisma } from "@/lib/db";
import type { DebtFormOptions } from "@/lib/form-option-types";

// Loaders de las opciones de los formularios en drawer. Los formularios ya
// no tienen página propia (`/x/nueva`): viven en la lista o el detalle, así
// que es ESA página la que carga las opciones y se las pasa por props.
// Como llegan por props, cualquier action que revalide la página las
// refresca también con el drawer abierto.

/** Contactos, monedas activas y cuentas activas del usuario. */
export async function loadDebtFormOptions(
  userId: string
): Promise<DebtFormOptions> {
  const [contacts, currencies, accounts] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.currency.findMany({
      where: { userId, active: true },
      orderBy: [{ isBase: "desc" }, { code: "asc" }],
      select: { id: true, code: true },
    }),
    prisma.account.findMany({
      where: { userId, archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currencyId: true },
    }),
  ]);
  return { contacts, currencies, accounts };
}

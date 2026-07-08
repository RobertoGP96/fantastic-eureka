// Datos por defecto que recibe CADA usuario nuevo: monedas con
// denominaciones reales y categorías base. Este módulo es puro (sin
// "server-only" ni instancia de Prisma) para poder reutilizarlo desde el
// registro (server action) y desde prisma/seed.ts (tsx).
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

interface DefaultDenomination {
  valueMinor: number;
  kind: "BILL" | "COIN";
}

interface DefaultCurrency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBase: boolean;
  denominations: DefaultDenomination[];
}

const bill = (valueMinor: number): DefaultDenomination => ({
  valueMinor,
  kind: "BILL",
});
const coin = (valueMinor: number): DefaultDenomination => ({
  valueMinor,
  kind: "COIN",
});

export const DEFAULT_CURRENCIES: DefaultCurrency[] = [
  {
    code: "CUP",
    name: "Peso cubano",
    symbol: "$",
    decimalPlaces: 0,
    isBase: true,
    denominations: [
      bill(1000), bill(500), bill(200), bill(100), bill(50),
      bill(20), bill(10), bill(5), bill(3), bill(1),
      coin(3), coin(1),
    ],
  },
  {
    code: "USD",
    name: "Dólar estadounidense",
    symbol: "$",
    decimalPlaces: 2,
    isBase: false,
    denominations: [
      bill(10000), bill(5000), bill(2000), bill(1000),
      bill(500), bill(200), bill(100),
      coin(25), coin(10), coin(5), coin(1),
    ],
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    decimalPlaces: 2,
    isBase: false,
    denominations: [
      bill(50000), bill(20000), bill(10000), bill(5000),
      bill(2000), bill(1000), bill(500),
      coin(200), coin(100), coin(50), coin(20), coin(10), coin(5), coin(2), coin(1),
    ],
  },
  {
    // MLC es saldo de tarjeta: sin denominaciones físicas.
    code: "MLC",
    name: "Moneda libremente convertible",
    symbol: "$",
    decimalPlaces: 2,
    isBase: false,
    denominations: [],
  },
];

/**
 * Denominaciones básicas para una moneda NUEVA creada por el usuario
 * (serie 1-2-5 genérica). Billetes de 1 a 500 unidades y, si la moneda
 * tiene decimales, las monedas fraccionarias más comunes (se descartan las
 * que no den un entero en unidades menores). El usuario puede desactivar
 * o añadir denominaciones en /monedas/[id].
 */
export function basicDenominations(
  decimalPlaces: number
): DefaultDenomination[] {
  const factor = 10 ** decimalPlaces;
  const bills = [500, 200, 100, 50, 20, 10, 5, 1].map((value) =>
    bill(value * factor)
  );
  const coins =
    decimalPlaces > 0
      ? [0.5, 0.25, 0.1, 0.05]
          .map((value) => value * factor)
          .filter(Number.isInteger)
          .map((value) => coin(value))
      : [coin(1)];
  return [...bills, ...coins];
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Alimentación",
  "Transporte",
  "Hogar",
  "Salud",
  "Servicios",
  "Compras",
  "Otros gastos",
];

export const DEFAULT_INCOME_CATEGORIES = [
  "Ventas",
  "Salario",
  "Remesas",
  "Otros ingresos",
];

/**
 * Crea las monedas (con denominaciones) y categorías base para un usuario.
 * Pensada para usuarios recién creados: asume que el usuario aún no tiene
 * datos (usar `userHasDefaults` antes si no es seguro).
 */
export async function bootstrapUserDefaults(
  db: Db,
  userId: string
): Promise<void> {
  for (const { denominations, ...currency } of DEFAULT_CURRENCIES) {
    const saved = await db.currency.create({
      data: { ...currency, userId },
    });
    if (denominations.length > 0) {
      await db.denomination.createMany({
        data: denominations.map((denomination) => ({
          ...denomination,
          currencyId: saved.id,
        })),
      });
    }
  }

  await db.category.createMany({
    data: [
      ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
        name,
        kind: "EXPENSE",
        userId,
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
        name,
        kind: "INCOME",
        userId,
      })),
    ],
  });
}

/** True si el usuario ya tiene monedas (es decir, ya fue inicializado). */
export async function userHasDefaults(
  db: Db,
  userId: string
): Promise<boolean> {
  const count = await db.currency.count({ where: { userId } });
  return count > 0;
}

// Seed idempotente: monedas con denominaciones reales y categorías base.
// Ejecutar con `npm run db:seed` (o automático tras `prisma migrate dev`).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SeedDenomination {
  valueMinor: number;
  kind: "BILL" | "COIN";
}

interface SeedCurrency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isBase: boolean;
  denominations: SeedDenomination[];
}

const bill = (valueMinor: number): SeedDenomination => ({ valueMinor, kind: "BILL" });
const coin = (valueMinor: number): SeedDenomination => ({ valueMinor, kind: "COIN" });

const CURRENCIES: SeedCurrency[] = [
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

const EXPENSE_CATEGORIES = [
  "Alimentación",
  "Transporte",
  "Hogar",
  "Salud",
  "Servicios",
  "Compras",
  "Otros gastos",
];

const INCOME_CATEGORIES = ["Ventas", "Salario", "Remesas", "Otros ingresos"];

async function main() {
  for (const { denominations, ...currency } of CURRENCIES) {
    const saved = await prisma.currency.upsert({
      where: { code: currency.code },
      update: {
        name: currency.name,
        symbol: currency.symbol,
        decimalPlaces: currency.decimalPlaces,
        isBase: currency.isBase,
      },
      create: currency,
    });

    for (const denomination of denominations) {
      await prisma.denomination.upsert({
        where: {
          currencyId_valueMinor_kind: {
            currencyId: saved.id,
            valueMinor: denomination.valueMinor,
            kind: denomination.kind,
          },
        },
        update: {},
        create: { ...denomination, currencyId: saved.id },
      });
    }
  }

  for (const name of EXPENSE_CATEGORIES) {
    await prisma.category.upsert({
      where: { name_kind: { name, kind: "EXPENSE" } },
      update: {},
      create: { name, kind: "EXPENSE" },
    });
  }

  for (const name of INCOME_CATEGORIES) {
    await prisma.category.upsert({
      where: { name_kind: { name, kind: "INCOME" } },
      update: {},
      create: { name, kind: "INCOME" },
    });
  }

  console.log("Seed completado: monedas, denominaciones y categorías.");
}

main()
  .catch((error) => {
    console.error("Error en seed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

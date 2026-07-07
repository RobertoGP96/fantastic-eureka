# Caja

App mobile-first para manejar cuentas y registros contables: conteo de efectivo
con denominaciones, tasas de cambio, gastos, y deudas con recordatorios de
cobro/pago por período (mensualidades). Usa la estética y el stack de la tienda
del monorepo mareyreg.

## Funcionalidades

- **Cuentas** — cajas de efectivo, bancos y saldos digitales, cada una en su
  moneda. El saldo se deriva del libro de movimientos (nunca se edita directo).
- **Movimientos** — ingresos, gastos, transferencias entre cuentas (incluso
  entre monedas distintas, guardando la tasa implícita) y ajustes. Historial
  con filtros por mes/cuenta/categoría/tipo y export CSV.
- **Conteo de efectivo (arqueo)** — pantalla de conteo por denominaciones
  (billetes y monedas), total en vivo, comparación contra el saldo teórico y
  ajuste opcional por la diferencia.
- **Tasas de cambio** — registro manual con histórico, conversor rápido y
  consolidación del dashboard a la moneda base.
- **Deudas y recordatorios** — deudas por cobrar/por pagar con contactos,
  abonos parciales, planes de cuotas (semanal/quincenal/mensual) y sección de
  próximos vencimientos en el dashboard. Al saldar una cuota se crea la
  transacción automáticamente y se genera la siguiente cuota.
- **Categorías** — gastos e ingresos, con resumen mensual por categoría.

## Stack

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS 4
· Prisma + SQLite · Zod 4 · Radix UI · lucide-react · Vitest.

## Empezar

```bash
pnpm install
pnpm db:migrate     # crea prisma/dev.db y ejecuta el seed
pnpm dev            # http://localhost:3002
```

El seed crea las monedas CUP (base), USD, EUR y MLC con sus denominaciones
reales, y las categorías básicas de gastos/ingresos.

## Scripts

| Script | Descripción |
|---|---|
| `pnpm dev` | Servidor de desarrollo (puerto 3002, Turbopack) |
| `pnpm build` / `pnpm start` | Build y servidor de producción |
| `pnpm test` / `pnpm test:watch` | Tests unitarios (Vitest) |
| `pnpm db:migrate` | Migraciones + seed |
| `pnpm db:studio` | Prisma Studio |
| `pnpm tsx prisma/reset-data.ts` | Borra datos de trabajo conservando el seed |

## Decisiones de diseño

- **Dinero en enteros**: todos los montos se guardan en unidades menores
  (centavos) y las tasas escaladas ×10 000. Nunca floats (`src/lib/money.ts`).
- **Libro mayor inmutable**: los saldos se calculan sumando transacciones; los
  arqueos y abonos generan transacciones enlazadas, no editan saldos.
- **SQLite local**: la app funciona offline y sin servicios externos. Migrar a
  Postgres (p. ej. Neon, credenciales respaldadas en `.env.backup`) solo
  requiere cambiar el `provider` del datasource y la `DATABASE_URL`.
- **Sin auth**: pensada como app local de un solo usuario (v1).
- **Moneda base**: CUP. Las tasas se cotizan siempre contra la base; las
  conversiones cruzadas se derivan de ella.

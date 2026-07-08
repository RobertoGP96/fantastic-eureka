# Caja

App mobile-first para manejar cuentas y registros contables: conteo de efectivo
con denominaciones, tasas de cambio, gastos, y deudas con recordatorios de
cobro/pago por período (mensualidades). Nació del stack de la tienda del
monorepo mareyreg y hoy tiene identidad visual propia: paleta
petróleo/esmeralda con acento dorado y tipografía Outfit.

## Funcionalidades

- **Perfil** — edita tu nombre/correo y cambia la contraseña (cierra las
  demás sesiones). Cada cuenta admite un **icono personalizable** elegido de
  un set curado de lucide.
- **Registro e inicio de sesión** — usuarios con contraseña (scrypt de
  node:crypto, sin dependencias externas), sesiones de 30 días en SQLite con
  cookie httpOnly y middleware que protege toda la app. Los usuarios
  registrados comparten los mismos datos (uso familiar/negocio).
- **Cuentas** — cajas de efectivo, bancos y saldos digitales, cada una en su
  moneda. El saldo se deriva del libro de movimientos (nunca se edita directo).
  Se pueden organizar en **grupos** personalizables (Negocio, Personal…) con
  subtotal por grupo consolidado a la moneda base.
- **Movimientos** — ingresos, gastos, transferencias entre cuentas (incluso
  entre monedas distintas, guardando la tasa implícita) y ajustes. Historial
  con filtros por mes/cuenta/categoría/tipo y export CSV.
- **Conteo de efectivo (arqueo)** — pantalla de conteo por denominaciones
  (billetes y monedas), total en vivo, comparación contra el saldo teórico y
  ajuste opcional por la diferencia.
- **Tasas de cambio por pares** — cada tasa relaciona dos monedas (De → A);
  el par inverso se resuelve solo y los cruces se componen vía la moneda
  base (personalizable en Monedas). Histórico, conversor rápido y
  consolidación del dashboard a la base.
- **Deudas y recordatorios** — deudas por cobrar/por pagar con contactos,
  abonos parciales, planes de cuotas (semanal/quincenal/mensual) y sección de
  próximos vencimientos en el dashboard. Al saldar una cuota se crea la
  transacción automáticamente y se genera la siguiente cuota.
- **Categorías** — gastos e ingresos, con resumen mensual por categoría.
- **Monedas y denominaciones** — administra las divisas del sistema (crear,
  ocultar, cambiar la moneda base) y los billetes/monedas de cada una, que
  alimentan los arqueos.
- **Dashboard con métricas** — ingresos/gastos del mes con variación contra el
  mes anterior, gráfico de 6 meses, top de categorías de gasto y totales por
  cobrar/por pagar, todo consolidado a la moneda base.

## Stack

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS 4
· Prisma + Neon Postgres · Zod 4 · shadcn/ui + Radix UI · lucide-react · Vitest.

En escritorio la navegación es un **sidebar colapsable** (shadcn/ui, atajo
Ctrl/Cmd+B); en móvil se mantiene la bottom nav estilo tienda.

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

## Deploy en Vercel

1. Importa el repo en Vercel (framework Next.js; los defaults sirven — el
   script `build` ya ejecuta `prisma generate`).
2. Variables de entorno (Production y Preview) — ver `.env.example`:
   - `DATABASE_URL`: cadena **pooled** de Neon con
     `&schema=caja&pgbouncer=true&connect_timeout=15&connection_limit=10`.
   - `DIRECT_URL`: cadena directa (host sin `-pooler`), con `&schema=caja`.
   - `ALLOW_REGISTRATION`: `true` (o elimínala). La app es multi-tenant:
     cada usuario tiene sus propios datos (monedas, cuentas, tasas, deudas…)
     y al registrarse recibe monedas y categorías por defecto. Ponla en
     `false` solo si quieres cerrar el alta de usuarios nuevos.
3. Migraciones: NO corren en el build. La BD actual ya está migrada; para
   futuras migraciones ejecuta `pnpm db:deploy` localmente contra Neon.

## Decisiones de diseño

- **Dinero en enteros**: todos los montos se guardan en unidades menores
  (centavos) y las tasas escaladas ×10 000. Nunca floats (`src/lib/money.ts`).
- **Libro mayor inmutable**: los saldos se calculan sumando transacciones; los
  arqueos y abonos generan transacciones enlazadas, no editan saldos.
- **Neon Postgres**: los datos viven en la nube (schema `caja`, sin tocar el
  `public` preexistente de esa base). La URL pooled lleva `pgbouncer=true` y
  las migraciones usan `DIRECT_URL` (endpoint sin pooler).
- **Auth propia y ligera**: scrypt + tokens de sesión opacos (SHA-256 en BD).
  El middleware solo comprueba la cookie (corre en edge, sin Prisma); la
  validación real ocurre en el layout del grupo `(app)`. Sin multi-tenancy:
  todos los usuarios ven los mismos datos.
- **Moneda base**: CUP. Las tasas se cotizan siempre contra la base; las
  conversiones cruzadas se derivan de ella.

# Caja — App de cuentas y registros contables

App Next.js 15 (App Router) mobile-first, estética portada de
`M:\Projects\mareyreg\apps\tienda`. Español para UI/comentarios.

## Comandos

- `pnpm dev` — dev server en puerto 3002 (Turbopack)
- `pnpm test` — Vitest (tests co-locados `src/lib/*.test.ts`)
- `pnpm build` — build de producción (incluye typecheck)
- `pnpm db:migrate` — migración + seed; `pnpm db:studio` — Prisma Studio
- `pnpm tsx prisma/reset-data.ts` — limpia datos conservando seed

## Arquitectura

- **BD**: Prisma + SQLite (`prisma/dev.db`, DATABASE_URL en `.env`). SQLite no
  soporta enums → los campos kind/status/direction son strings validados con
  las constantes de `src/lib/domain.ts` (única fuente de verdad + labels ES).
- **Dinero**: SIEMPRE enteros en unidades menores (`amountMinor`); tasas
  escaladas ×10 000 (`rateScaled`, `RATE_SCALE`). Aritmética en
  `src/lib/money.ts` (BigInt para conversiones). Formateo estilo tienda
  ("4 750 CUP") en `src/lib/format.ts`. PROHIBIDO usar floats para montos.
- **Saldos derivados**: nunca se almacenan; ver `src/lib/balances.ts`
  (INCOME/ADJUSTMENT suman, EXPENSE/TRANSFER restan, transferencias entrantes
  suman `counterAmountMinor`).
- **Server actions** en `src/app/actions/*.ts`: validan con Zod
  (`src/lib/schemas.ts`), devuelven `ActionResult<T>` ({success, data|error}),
  loguean errores con console.error y mensajes amigables al UI.
- **Deudas**: saldo pendiente = totalMinor − Σ DebtPayment. Saldar/omitir una
  cuota genera la siguiente vía `advancePlan` (recurrencia en
  `src/lib/dates.ts`, con clamp de fin de mes). Cuota VENCIDA es estado
  derivado (PENDING + dueAt pasado), no hay cron.
- **Tema**: tokens Tailwind 4 en `@theme` de `src/app/globals.css` (paleta
  navy/brand azul + ok/warn/danger), gradientes `.grad-*`, fuente
  Space Grotesk. Componentes base en `src/components/ui/`.

## Gotchas

- El `Button` de ui/ tiene `type="button"` por defecto — los botones de
  submit en formularios DEBEN llevar `type="submit"` explícito.
- Páginas que leen la BD llevan `export const dynamic = "force-dynamic"`.
- Next 15: `params` y `searchParams` son Promises (usar `await`).
- pnpm 11: los build scripts de deps se aprueban en `pnpm-workspace.yaml`
  (`allowBuilds`), no en package.json.
- Columnas de dinero son Int de 32 bits (`PRISMA_INT_MAX`): límite por monto
  ≈2 147 M unidades menores (≈21,4 M en monedas de 2 decimales).
- Validaciones de saldo/pendiente se releen DENTRO del `$transaction` con
  `ActionError` para abortar (patrón anti doble-envío) — mantenerlo así.
- `.env.backup` guarda credenciales Neon Postgres originales del repo (no
  usadas; la app corre en SQLite).
- Playwright E2E: pendiente de configurar (no instalado aún).

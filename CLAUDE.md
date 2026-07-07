# Caja — App de cuentas y registros contables

App Next.js 15 (App Router) mobile-first, estética portada de
`M:\Projects\mareyreg\apps\tienda`. Español para UI/comentarios.

## Comandos

- `pnpm dev` — dev server en puerto 3002 (Turbopack)
- `pnpm test` — Vitest (tests co-locados `src/lib/*.test.ts`)
- `pnpm build` — build de producción (incluye typecheck)
- `pnpm db:migrate` — migración + seed; `pnpm db:studio` — Prisma Studio
- `pnpm tsx prisma/reset-data.ts` — limpia datos conservando seed
- `pnpm db:deploy` — `prisma migrate deploy` (producción; no corre en build)
- Deploy: Vercel (build = `prisma generate && next build`); env vars
  DATABASE_URL, DIRECT_URL y ALLOW_REGISTRATION=false (registro cerrado;
  los usuarios comparten datos)
- `pnpm test:e2e` — Playwright E2E (levanta su propio dev server; requiere
  puerto 3002 LIBRE — parar `pnpm dev` antes)

## Arquitectura

- **BD**: Prisma + **Neon Postgres** (credenciales que venían en
  `.env.backup`), en el **schema `caja`** — el schema `public` tiene datos de
  otro proyecto (nov 2025) y NO debe tocarse. `DATABASE_URL` = endpoint
  `-pooler` (runtime), `DIRECT_URL` = endpoint directo (migraciones). Los
  campos kind/status/direction son strings validados con las constantes de
  `src/lib/domain.ts` (única fuente de verdad + labels ES); herencia de
  SQLite que se mantiene. `prisma/dev.db` es el viejo SQLite (legado).
  OJO: `prisma/reset-data.ts` ahora borra datos EN NEON.
- **Dinero**: SIEMPRE enteros en unidades menores (`amountMinor`); tasas
  escaladas ×10 000 (`rateScaled`, `RATE_SCALE`). Aritmética en
  `src/lib/money.ts` (BigInt para conversiones). Formateo estilo tienda
  ("4 750 CUP") en `src/lib/format.ts`. PROHIBIDO usar floats para montos.
- **Saldos derivados**: nunca se almacenan; ver `src/lib/balances.ts`
  (INCOME/ADJUSTMENT suman, EXPENSE/TRANSFER restan, transferencias entrantes
  suman `counterAmountMinor`).
- **Auth**: User + Session en Prisma. Contraseñas con scrypt
  (`src/lib/password.ts`, sin deps); sesiones de 30 días con token opaco
  (cookie `caja_session` httpOnly, SHA-256 del token en BD,
  `src/lib/auth.ts`). `src/middleware.ts` solo comprueba presencia de cookie
  (edge, sin Prisma) y la validación real está en `src/app/(app)/layout.tsx`
  (`getSessionUser` → redirect a /auth/login). Páginas protegidas viven en el
  grupo `(app)`; login/registro en `src/app/auth/`. Los usuarios comparten
  datos (sin multi-tenancy).
- **Server actions** en `src/app/actions/*.ts`: validan con Zod
  (`src/lib/schemas.ts`), devuelven `ActionResult<T>` ({success, data|error}),
  loguean errores con console.error y mensajes amigables al UI.
- **Deudas**: saldo pendiente = totalMinor − Σ DebtPayment. Saldar/omitir una
  cuota genera la siguiente vía `advancePlan` (recurrencia en
  `src/lib/dates.ts`, con clamp de fin de mes). Cuota VENCIDA es estado
  derivado (PENDING + dueAt pasado), no hay cron.
- **Cuenta vinculada**: `Debt.accountId` y `PaymentPlan.accountId` (opcionales,
  onDelete: SetNull, misma moneda validada en la action) guardan la cuenta
  preferida; se elige al crear y se edita en el detalle
  (`src/components/linked-account-editor.tsx` + actions `setDebtAccount` /
  `setPlanAccount`). Los forms de abono/cuota la preseleccionan
  (`defaultAccountId`) y llevan `key` por cuenta para re-inicializarse al
  cambiarla.
- **Grupos de cuentas**: `AccountGroup` (borrar → cuentas a "Sin grupo" vía
  onDelete: SetNull). Gestión en `/cuentas/grupos`, asignación en el detalle
  de cuenta y al crearla; el listado `/cuentas` agrupa con subtotal en base.
- **Monedas**: gestionables en `/monedas` (crear, ocultar, cambiar base,
  denominaciones por divisa).
- **Tasas por PARES**: `ExchangeRate` relaciona fromCurrency→toCurrency
  (destino por 1 de origen, ×10 000). Resolución en `src/lib/rate-resolve.ts`
  (pura: directo → inverso → compuesto vía base) y `src/lib/rates.ts`
  (servidor). `latestRatesByCurrency()` mantiene su interfaz histórica
  (moneda→base) resolviendo desde pares, por lo que cambiar la moneda base
  NO invalida nada. Detalle por par en `/tasas/[from]/[to]` (códigos de
  moneda en la URL) con gráfico lineal interactivo
  (`src/components/rate-line-chart.tsx`, SVG puro con crosshair/tooltip);
  las tarjetas de `/tasas` enlazan al detalle y llevan sparkline
  (`src/components/rate-sparkline.tsx`). Series por par con una sola
  consulta: `pairRateSeries()` en `src/lib/rates.ts`.
- **Dashboard**: métricas en `src/lib/metrics.ts` (Prisma) sobre la lógica
  pura testeable de `src/lib/metrics-core.ts` (agrupación mensual y conversión
  a base). Gráficos con barras CSS (`src/components/monthly-bars.tsx`), sin
  librería de charts.
- **Tema**: identidad propia de Caja (ya NO es la paleta de la tienda):
  petróleo/esmeralda + acento dorado, fuente Outfit. Tokens Tailwind 4 en
  `@theme` de `src/app/globals.css` — se conservan los NOMBRES heredados
  (navy/brand/chip/ok/warn/danger + nuevo `gold`) con valores nuevos, así el
  UI entero se re-viste sin tocar componentes. Gradientes `.grad-*` (+
  `.grad-gold`). Componentes base en `src/components/ui/`.
- **Perfil**: `/perfil` (editar nombre/correo y contraseña). Cambiar la
  contraseña invalida las demás sesiones (`invalidateOtherSessions` en
  `src/lib/auth.ts`). Actions en `src/app/actions/profile-actions.ts`.
- **Iconos de cuenta**: set curado de lucide en `src/lib/account-icons.ts`
  (`getAccountIcon(icon, type)` con fallback por tipo). Selector en el form
  de nueva cuenta y en el detalle (`account-icon-editor`); el nombre kebab se
  guarda en `Account.icon`.
- **shadcn/ui**: infraestructura montada (`components.json`, tokens
  semánticos —background/primary/sidebar-\*— mapeados a la paleta tienda en
  `@theme`, deps radix-ui/cva/tw-animate-css). Componentes vendorizados:
  sidebar, sheet, tooltip, separator, skeleton, avatar, dropdown-menu. REGLA:
  la UI nueva usa componentes shadcn; los primitivos históricos
  (Button/Input/Badge/Select estilo tienda) se mantienen.
- **UserMenu** (`src/components/user-menu.tsx`): avatar con iniciales +
  dropdown (Mi perfil / Cerrar sesión) en el header de Inicio, solo móvil
  (`md:hidden`, en escritorio ya está el bloque del sidebar). `ScreenHeader`
  acepta `actions` para el lado derecho del título.
- **Navegación**: escritorio = `src/components/app-sidebar.tsx` (Sidebar
  shadcn colapsable a iconos, estado en cookie `sidebar_state`, atajo
  Ctrl/Cmd+B); móvil = `bottom-nav.tsx` (sin cambios). El layout de `(app)`
  monta SidebarProvider + SidebarInset.

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
- Neon + Prisma: la URL pooled DEBE llevar `pgbouncer=true` (sin eso, el pool
  se agota con P2024 "Timed out fetching a new connection"). También lleva
  `connection_limit=10&connect_timeout=15`.
- Cookie de sesión huérfana (ej. tras cambiar de BD): el layout de (app)
  redirige a `/auth/salir` (route handler que borra la cookie) — nunca
  directo a /auth/login, o se produce un bucle con el middleware.
- El entorno reescribe `.env` de vez en cuando (plantilla Neon vieja SIN
  schema=caja ni pgbouncer): hay copia redundante en `.env.local` (la carga
  el runtime de Next). El CLI de Prisma solo lee `.env` — si algo falla,
  restaurar `.env` desde `.env.local`. No crear `prisma/.env` (Prisma aborta
  si duplica variables).
- Playwright E2E (`e2e/`, config en `playwright.config.ts`): BD aislada
  `prisma/test.db` recreada en cada corrida (migrate deploy + seed vía
  `e2e/setup-db.ts`, encadenado en el comando del webServer porque este
  arranca ANTES que globalSetup). Proyecto `setup` registra `e2e@caja.test`
  vía /auth/registro y guarda `e2e/.auth/user.json` (storageState) para los
  proyectos desktop y mobile (375×812). `channel: "chrome"` (Chrome del
  sistema): la descarga del Chromium empaquetado da 403 por geo-bloqueo.
  `workers: 1` a propósito (los flujos mutan la misma BD SQLite).

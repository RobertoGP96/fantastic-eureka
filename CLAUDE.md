# Caja — App de cuentas y registros contables

App Next.js 15 (App Router) para móvil Y escritorio, con sistema de
diseño propio (v3, ver «Tema»). Español para UI/comentarios.

## Comandos

- `pnpm dev` — dev server en puerto 3002 (Turbopack)
- `pnpm test` — Vitest (tests co-locados `src/lib/*.test.ts`)
- `pnpm build` — build de producción (incluye typecheck)
- `pnpm db:migrate` — migración + seed; `pnpm db:studio` — Prisma Studio
- `pnpm lint` (ESLint CLI) y `pnpm typecheck` (`tsc --noEmit`)
- `pnpm tsx prisma/reset-data.ts --user <correo> --yes` — limpia los datos
  de trabajo de ESE usuario conservando su configuración (`--all` = todos;
  sin `--yes` solo muestra qué borraría)
- `pnpm db:deploy` — `prisma migrate deploy` (producción; no corre en build)
- Deploy: Vercel (build = `prisma generate && next build`); env vars
  DATABASE_URL, DIRECT_URL y ALLOW_REGISTRATION=true (registro abierto;
  app multi-tenant, `false` solo para cerrar el alta en instancias privadas)
- `pnpm test:e2e` — Playwright E2E (levanta su propio dev server contra el
  schema `caja_e2e` de Neon, que recrea en cada corrida; requiere puerto
  3002 LIBRE — parar `pnpm dev` antes)

## Arquitectura

- **BD**: Prisma + **Neon Postgres** (credenciales que venían en
  `.env.backup`), en el **schema `caja`** — el schema `public` tiene datos de
  otro proyecto (nov 2025) y NO debe tocarse. `DATABASE_URL` = endpoint
  `-pooler` (runtime), `DIRECT_URL` = endpoint directo (migraciones). Los
  campos kind/status/direction son strings validados con las constantes de
  `src/lib/domain.ts` (única fuente de verdad + labels ES); herencia de
  SQLite que se mantiene. `prisma/dev.db` es el viejo SQLite (legado).
  OJO: `prisma/reset-data.ts` borra datos EN NEON (por eso exige
  `--user`/`--all` y `--yes`). En Neon existe una
  migración `20260715233430_mobile_sync_foundation` aplicada FUERA del repo
  (sin carpeta local): `prisma migrate status` la lista como "not found
  locally" y es normal; `20260922120000_mobile_sync` (idempotente, IF NOT
  EXISTS) se aplicó el 2026-11-05. Las migraciones nuevas deben ser
  aditivas.
- **Dinero**: SIEMPRE enteros en unidades menores (`amountMinor`); tasas
  escaladas ×10 000 (`rateScaled`, `RATE_SCALE`). Aritmética en
  `src/lib/money.ts` (BigInt para conversiones). Formateo estilo tienda
  ("4 750 CUP") en `src/lib/format.ts`. PROHIBIDO usar floats para montos.
- **Saldos derivados**: nunca se almacenan; ver `src/lib/balances.ts`
  (INCOME/ADJUSTMENT suman, EXPENSE/TRANSFER restan, transferencias entrantes
  suman `counterAmountMinor`). La lógica pura de signos/agregación vive en
  `src/lib/balances-core.ts` (con tests); `listAccountsWithBalances` hace 3
  consultas fijas (groupBy por cuenta+kind y por counterAccountId), NUNCA
  volver al patrón de 2 consultas por cuenta.
- **Ingresos/gastos multi-moneda**: en /registrar se puede anotar el monto en
  otra divisa; se convierte a la moneda de la cuenta con la tasa indicada
  (prellenada desde los pares vía `rate-resolve`, editable, dirección
  invertible ⇄). El movimiento se GUARDA en la moneda de la cuenta
  (`amountMinor`, saldos/métricas intactos) y el original queda en
  `counterAmountMinor` + `counterCurrencyId` (columna nueva; en TRANSFER
  ahora guarda la moneda destino) + `rateScaled` (implícita, informativa,
  `impliedRateScaled` en money.ts). Conversión con tasa inversa por división
  BigInt (`convertMinorInverse`) para no perder precisión. El historial
  (`tx-rows.ts`) muestra el monto original en el subtítulo — los `include`
  de transacciones deben traer `counterCurrency`.
- **Fechas y zona horaria**: el servidor calcula y pinta fechas en la zona
  de la app (variable `APP_TIME_ZONE`, por defecto
  `America/Havana`), que `src/instrumentation.ts` fija en `process.env.TZ`
  al arrancar — Vercel corre en UTC y sin esto lo registrado de noche caía
  en el día/mes siguiente. Es una zona por INSTANCIA, no por usuario. En
  cliente, la fecha para `<input type="date">` sale de `toLocalDateISO()`
  (`src/lib/dates.ts`); PROHIBIDO `toISOString().slice(0, 10)` (da la fecha
  UTC). Los límites «hasta el día X» se comparan con `endOfLocalDay`.
- **Formularios cliente**: las server actions se llaman con `runAction()`
  (`src/lib/run-action.ts`), que convierte un fallo de red en un
  `ActionResult` de error, y `saving` solo vuelve a false en la rama de
  error: tras un éxito el botón sigue deshabilitado mientras navega (si no,
  un segundo toque duplicaba el registro). Los formularios que viven en un
  drawer usan además `useFormDrawer()` (`setBusy` bloquea el cierre mientras
  guarda; `close()` / `closeAndGo(href)` al terminar) y NO llaman a
  `router.refresh()`: la action ya revalida y los datos llegan por props.
- **Errores de servicio**: el `catch` genérico de un servicio devuelve
  `unexpectedFailure(scope, error, mensaje)` (`services/context.ts`), que
  marca `retryable` cuando el fallo es de infraestructura (conexión, pool,
  timeout, deadlock). El push móvil no registra esos como REJECTED y corta
  el lote para reintentarlo entero. Deudas: `lockDebt(tx, id)` ANTES de
  `debtRemainingMinor` (la relectura sola no basta bajo READ COMMITTED) y
  `closeDebtPlans` cuando una deuda queda saldada (`src/lib/debts.ts`).
- **Auth**: User + Session en Prisma. Contraseñas con scrypt
  (`src/lib/password.ts`, sin deps); sesiones de 30 días con token opaco
  (cookie `caja_session` httpOnly, SHA-256 del token en BD,
  `src/lib/auth.ts`). `src/middleware.ts` solo comprueba presencia de cookie
  (edge, sin Prisma) y la validación real está en `src/app/(app)/layout.tsx`
  (`getSessionUser` → redirect a /auth/login). Páginas protegidas viven en el
  grupo `(app)`; login/registro en `src/app/auth/`.
- **Multi-tenancy**: TODOS los modelos raíz llevan `userId` obligatorio
  (Currency, AccountGroup, Account, Category, Transaction, ExchangeRate,
  CashCount, Contact, Debt, PaymentPlan; onDelete: Cascade). Los hijos
  (Denomination, CashCountLine, Installment, DebtPayment) se acotan vía
  padre (`plan: { userId }`, `currency: { userId }`). Unicidades por
  usuario: `[userId, code]` (Currency), `[userId, name]` (AccountGroup),
  `[userId, name, kind]` (Category). Las páginas usan
  `requireSessionUser()` (`src/lib/auth.ts`, redirige a /auth/salir) y las
  server actions `getSessionUser()` + error amigable; las lecturas por id
  usan `findFirst({ id, userId })` (id ajeno = inexistente). Las funciones
  de `src/lib/{balances,metrics,rates,debts,report}.ts` reciben `userId`
  como primer argumento. Al registrarse, `bootstrapUserDefaults`
  (`src/lib/user-defaults.ts`, sin server-only) crea monedas +
  denominaciones + categorías del usuario en la misma transacción;
  `prisma/seed.ts` aplica esos defaults a usuarios existentes sin monedas.
- **Server actions** en `src/app/actions/*.ts`: envoltorios FINOS (sesión por
  cookie + servicio + `revalidatePath` si `success`). La lógica vive en
  **`src/lib/services/*-service.ts`**: validan con Zod (`src/lib/schemas.ts`),
  devuelven `ActionResult<T>` ({success, data|error}), loguean con
  console.error y dan mensajes amigables. Firma `(ctx: {db, userId}, input,
  options?)`: usan `ctx.db` (nunca el `prisma` global) y `inTx(ctx.db, …)` en
  vez de `$transaction`, porque la API móvil los llama dentro de su propia
  transacción. Las creaciones aceptan `options.id` (id generado en el móvil)
  y los borrados raíz anotan `recordTombstone` DENTRO de su transacción. Una
  feature nueva va en el servicio, no en la action.
- **API móvil** (`/api/mobile/v1`, app Android `D:\Projects\changebox`):
  token Bearer sobre la tabla `Session`, pull incremental por `updatedAt` +
  lápidas y push idempotente por `opId` que llama a los MISMOS servicios.
  Contrato completo en `docs/mobile-api.md`: si añades una operación que
  muta datos, añádela a `src/lib/sync/op-registry.ts` y al contrato.
- **Deudas**: saldo pendiente = totalMinor − Σ DebtPayment. Saldar/omitir una
  cuota genera la siguiente vía `advancePlan` (recurrencia en
  `src/lib/dates.ts`, con clamp de fin de mes). Cuota VENCIDA es estado
  derivado (PENDING + dueAt pasado), no hay cron. `/deudas` lista TODAS las
  deudas sin filtro por defecto (filtro Todas/Por cobrar/Por pagar vía
  `?dir=cobrar|pagar`; antes el default RECEIVABLE escondía las por pagar) y
  las saldadas/canceladas NO desaparecen: van a la sección «Historial»
  (badge Saldada/Cancelada). Dos KPIs con el pendiente por moneda, «Me
  deben» / «Debo» (`src/components/totals-stat-card.tsx`), calculados
  ANTES del filtro: la dirección se filtra en memoria. Cada fila lleva
  avatar de iniciales, barra de progreso del abonado y badge de la próxima
  cuota. En el detalle el abono se registra en el drawer `abono`. Deudas y
  planes se pueden ELIMINAR desde su detalle
  (`src/components/delete-entity-button.tsx`, confirmación en
  `ConfirmDrawer` → `deleteDebt`/`deletePlan`): se borra el seguimiento (abonos, planes
  vinculados y cuotas — DebtPayment es Restrict y se borra antes; las
  cuotas caen por Cascade) pero los movimientos de las cuentas se
  CONSERVAN (los saldos no cambian; el movimiento solo pierde el vínculo).
- **Mensualidades** (`/mensualidades`): los planes de cuotas tienen vista
  propia, separada de `/deudas` (antes vivían en `/deudas/plan/*`; los
  enlaces viejos siguen vivos por `redirects()` en `next.config.ts`). La
  lista muestra TODOS los planes (standalone y ligados a deuda) con el
  NOMBRE DEL CONTACTO (`contact` propio o el de la deuda), frecuencia,
  cuotas saldadas y badge de vencimiento; filtros Todas/Que pago/Que cobro
  (`?tipo=pagar|cobrar`) y sección «Finalizadas» para los inactivos. Si la
  próxima cuota vence en ≤7 días (o ya venció) la fila trae el
  `SettleInstallment` embebido (`planCanSettle` en `plan-card.tsx`): se
  despachan varias mensualidades sin entrar al detalle. Los KPIs suman el
  compromiso mensual por moneda (antes del filtro) separando
  pago/cobro — lógica pura en `src/lib/plans-core.ts` (con tests):
  `monthlyEquivalentMinor` (semanal ×52/12, quincenal ×26/12, ONCE = 0),
  `monthlyCommitmentByCurrency`, `nextPending`, `comparePlansByUrgency` y
  `dueTone` (el ternario de color del badge, antes repetido en cada vista).
- **Cuenta vinculada**: `Debt.accountId` y `PaymentPlan.accountId` (opcionales,
  onDelete: SetNull, misma moneda validada en la action) guardan la cuenta
  preferida; se elige al crear y se edita en el detalle
  (`src/components/linked-account-editor.tsx` + actions `setDebtAccount` /
  `setPlanAccount`). Se muestra lo MÍNIMO: el editor es una fila compacta
  («Cuenta habitual» + select) pegada al form que la usa, sin sección ni
  título propios, y `SettleInstallment` esconde su selector tras «Cambiar»
  cuando ya hay cuenta vinculada. Los forms de abono/cuota la preseleccionan
  (`defaultAccountId`) y llevan `key` por cuenta para re-inicializarse al
  cambiarla.
- **Grupos de cuentas**: `AccountGroup` (borrar → cuentas a "Sin grupo" vía
  onDelete: SetNull). Gestión en el drawer «Grupos» de `/cuentas`
  (`src/components/group-manager.tsx`), asignación al crear la cuenta y en
  el drawer «Editar cuenta» de su detalle; el listado `/cuentas` agrupa con subtotal
  consolidado en base (prefijo «≈») MÁS chips con el total por cada divisa
  usada en el grupo (`totalsByCurrency` en `balances-core.ts`, con tests) —
  los chips se omiten solo si el grupo entero está en la base, y se muestran
  aunque falte alguna tasa (el consolidado sí desaparece sin tasa).
- **Tipos de cuenta**: CASH | CASH_BOX | BANK | DIGITAL (`domain.ts`).
  CASH_BOX («Caja (denominaciones)») es como CASH pero su detalle muestra
  «Denominaciones en caja» (`src/components/denomination-availability.tsx`).
  Los guards de arqueo usan `isCashLikeType()` (CASH y CASH_BOX) — nunca
  comparar `type === "CASH"` a mano.
- **Desglose de denominaciones en movimientos**: modelo
  `TransactionDenomination` (transactionId + accountId del LADO afectado +
  denominationId + quantity; un TRANSFER puede llevar desglose de origen y
  de destino). En /registrar, si el lado es CASH_BOX con denominaciones, el
  desglose es obligatorio (cliente,
  `src/components/denomination-breakdown-field.tsx`) y la action lo valida
  (`checkDenominationLines`: denominaciones de la moneda de la cuenta, sin
  repetidas, Σ = monto YA convertido de ese lado). «Sugerir distribución» =
  `suggestDistribution` en `counting.ts` (mayor-primero con backtracking —
  cubre el billete de 3 CUP — y respeta stock en salidas). La disponibilidad
  es DERIVADA en `src/lib/denominations.ts` (`accountDenominationStock`):
  último arqueo ± desgloses con `occurredAt` posterior, signo por
  `movementLineSign` (INCOME/destino +, EXPENSE/origen −, ADJUSTMENT 0).
  Movimientos sin desglose (abonos, cuotas, actions externas) NO alteran el
  stock: su efecto aflora como diferencia en el siguiente arqueo. El detalle
  de movimiento muestra el desglose; editar/eliminar denominaciones cuenta
  también `txLines` como uso.
- **Conteo por denominaciones**: filas compartidas en
  `src/components/denomination-counter.tsx` (subtotal en línea propia bajo
  la fila: no se desborda en móvil) sobre la lógica pura de
  `src/lib/counting.ts` (clampQty/countedTotalMinor, con tests). Las usan el
  arqueo (`/conteo/[id]`) y la calculadora `/calculadora` (contar efectivo
  por moneda SIN cuenta ni escritura en BD; accesos con icono calculadora en
  Inicio, /conteo, /mas y el sidebar).
- **Notificaciones de cuotas**: campana con las cuotas PENDING vencidas o
  que vencen en ≤7 días (`upcomingInstallments`, máx 8; contador ámbar, rojo
  si hay vencidas). `src/components/installment-notifications.tsx` (server) →
  `notifications-bell.tsx` (client, dropdown shadcn). En escritorio vive en la
  barra superior del layout de `(app)`, dentro de `<Suspense>` y con
  `try/catch` (el `error.tsx` de (app) no cubre a su propio layout: un fallo
  de BD deja la campana vacía en vez de tumbar la app); en móvil, en la
  cabecera de Inicio, alimentada por las filas que la página ya carga
  (`toInstallmentNotices`). `upcomingInstallments` va con `cache()` de React:
  campana y sección «Próximos vencimientos» comparten una consulta. El layout
  NO se re-renderiza al navegar: la campana se refresca con cada acción que
  revalida y al recargar.
- **Editar/eliminar cuentas**: en el detalle,
  `src/components/account-manage.tsx` (archivar/activar y eliminar con
  `ConfirmDrawer` que avisa del borrado del historial) y el drawer «Editar
  cuenta» (`account-edit-form.tsx`: nombre, icono y grupo en un solo
  formulario que envía solo lo que cambió).
  `deleteAccount` borra en cascada TODO el historial: movimientos por ambos
  lados (incluidas transferencias con otras cuentas), arqueos y los
  DebtPayment de esos movimientos (FK Restrict — se borran antes y el
  pendiente de la deuda reaparece al ser derivado).
  Installment.transactionId queda en null (SetNull; la cuota sigue PAID) y
  Debt/PaymentPlan vinculados en null (SetNull). Archivar sigue siendo la
  opción que conserva el historial.
- **Compartir cuenta (código de seguimiento 24 h)**: modelo `AccountShare`
  (userId + accountId + `token` ÚNICO EN CLARO — a diferencia de Session,
  para que el propietario pueda volver a copiar el enlace — + expiresAt +
  revokedAt; Cascade desde User/Account). Lógica pura en
  `src/lib/account-share.ts` (con tests: `SHARE_TTL_MS` = 24 h,
  `isShareActive`, `shareRemainingLabel`, `isWellFormedShareToken`,
  `sharePath`) y capa servidor en `src/lib/shares.ts` (`issueShare` revoca
  el vigente y borra los caducados de la cuenta: como mucho UN código
  vigente por cuenta; `resolveShareToken` valida forma + existencia +
  vigencia). Actions `createAccountShare`/`revokeAccountShare` en
  `src/app/actions/share-actions.ts`. Panel del propietario en el detalle de
  cuenta (`src/components/account-share-panel.tsx`: enlace, «Vence en»,
  copiar/compartir nativo/nuevo código/revocar; origin y reloj se fijan
  tras montar). Vista pública en `src/app/compartir/` FUERA del grupo
  `(app)` (sin sesión, sidebar ni bottom nav; `robots: noindex`):
  `/compartir` = portada para pegar el código (acepta también la URL
  entera) y `/compartir/[token]` = saldo actual + gráfico de actividad +
  últimos 100 movimientos con `TxList readOnly` (las filas no enlazan al
  detalle privado). Código inválido/caducado/revocado → redirect a
  `/compartir?invalido=1`. El middleware deja pasar `/compartir*` sin
  cookie. Es SOLO LECTURA: nada de esa vista escribe en BD.
- **Actividad de la cuenta**: gráfico de barras a todo el ancho en el detalle
  (`src/components/account-activity-chart.tsx`, SVG puro sin librería):
  entradas hacia arriba (ok) y salidas hacia abajo (danger) sobre la línea
  cero, extremos redondeados, rejilla simétrica recesiva, tooltip por columna
  y chips de período (7 días/1 mes → buckets diarios, 3 meses → semanales,
  1 año/Todo → mensuales) resueltos EN EL CLIENTE: la página pasa el libro
  mayor completo como deltas `{t, deltaMinor}` livianos (esa consulta
  sustituye al viejo count de movimientos) y cambiar de período no toca el
  servidor. Lógica pura en `src/lib/account-activity.ts` (con tests): delta
  con signo por movimiento desde la perspectiva de la cuenta (transferencia
  entrante = `counterAmountMinor`), aritmética de calendario local
  (`startOfDay/Week/Month`, `bucketRange`) y `aggregateActivity`. Los buckets
  se calculan tras montar (`now` vive en estado) porque la zona horaria del
  servidor rompería la hidratación; los totales del período
  (entradas/salidas/neto) hacen también de leyenda.
- **Detalle de movimiento**: `/movimientos/[id]` (todas las filas de
  `tx-list.tsx` enlazan ahí). Muestra cuentas origen/destino, monto original
  multi-moneda, tasa (`fmtRate`, counterCurrency por 1 de la moneda del
  movimiento), categoría, nota, fechas y el vínculo a deuda/plan si el
  movimiento nació de un abono o cuota.
- **Editar/eliminar movimientos**: desde el detalle. Editar
  (`/movimientos/[id]/editar` + `updateTransaction`): monto, monto del otro
  lado (transferencias entre monedas y multi-moneda; la tasa implícita se
  recalcula), categoría, fecha (conserva la hora original) y nota; el
  desglose de denominaciones REEMPLAZA al anterior (en salidas el stock
  «devuelve» lo que el movimiento ya sacaba). NO se cambian tipo ni cuentas
  (eliminar y re-registrar). Los ADJUSTMENT no se editan. Si el movimiento
  nació de un abono/cuota, el DebtPayment acompaña al monto (pendiente
  releído dentro del `$transaction`; deuda PAID⇄OPEN, nunca toca CANCELLED).
  Eliminar (`deleteTransaction` vía `delete-entity-button`): bloqueado si el
  ajuste pertenece a un arqueo; borra el DebtPayment antes (Restrict, el
  pendiente reaparece y la deuda PAID vuelve a OPEN); la cuota queda PAID
  sin vínculo (SetNull), igual que en `deleteAccount`.
- **Clasificación de monedas**: `Currency.kind` = CASH (efectivo) | DIGITAL
  (sin efectivo, ej. MLC; constantes en `domain.ts`). Las digitales no
  llevan denominaciones (al crearlas no se siembra la serie 1-2-5, y su
  detalle oculta la gestión) ni admiten cuentas CASH/CASH_BOX
  (`createAccount` lo valida y el form filtra el selector). Cambiar de
  clasificación: `setCurrencyKind` +
  `src/app/(app)/monedas/[id]/currency-kind-editor.tsx`; pasar a DIGITAL
  exige moneda sin denominaciones y sin cuentas de efectivo/caja.
- **Monedas**: gestionables en `/monedas` (crear con clasificación, ocultar,
  cambiar base, denominaciones por divisa). Denominaciones (`/monedas/[id]`) y categorías
  (`/categorias`) se crean y editan en drawer (`denomination-form.tsx`,
  `category-form.tsx`) y se eliminan con `ConfirmDrawer`, desde un menú ⋮
  por ítem (con `modal={false}` para no disputarle el foco al drawer);
  eliminar (y editar denominaciones) solo si no tienen uso (arqueos/
  movimientos) — con uso, ocultar (validado en la action y avisado en el UI).
  `minorToAmountInput()` en `src/lib/money.ts` convierte menores → texto de
  input (inverso de `parseAmountToMinor`).
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
  a base). Inicio abre con 4 KPIs (`StatCard`): «Saldo total ≈ base»
  (`consolidatedTotalMinor` en `balances-core.ts`, con tests; se muestra «—»
  si falta una tasa; el subtotal por grupo de `/cuentas` usa la misma
  función) e ingresos, gastos y neto del mes con variación y mini-gráfico
  (`buildFlowKpis` en `src/lib/dashboard-kpis.ts`, sobre la serie mensual ya
  cargada: sin consultas nuevas). `latestRatesByCurrency` va con `cache()`
  (Inicio y `dashboardMetrics` la piden en el mismo render). Gráfico mensual
  con barras CSS (`src/components/monthly-bars.tsx`), sin librería de charts.
- **Dashboard personalizable**: preferencias por usuario en
  `User.dashboardPrefs` (JSON serializado; null = defaults). Lógica pura en
  `src/lib/dashboard-prefs.ts` (con tests): secciones fijas + gadgets
  (`widget:<id>` en el orden), normalize tolerante (claves/gadgets inválidos
  fuera, secciones nuevas se añaden al final) — SIEMPRE pasar por
  `normalizeDashboardPrefs` antes de guardar/renderizar. Gadgets:
  `accountCard` (una cuenta, con últimos movimientos y denominaciones de
  caja opcionales), `currencyTotals` (reusa `totalsByCurrency`), `ratePair`
  (sparkline del par; si no hay serie directa se invierte la inversa),
  `incomeCard` (resumen con gráfico de línea y tabs Día/Semana/Mes) y
  `activityMap` («Mapa de actividad»: rejilla de puntos semana × día con
  los movimientos de cada día del último año; lógica pura en
  `src/lib/activity-map.ts` con tests, consulta `activityMapData` — solo
  `occurredAt` — y render de servidor en `src/components/activity-map.tsx`,
  que recorta las semanas antiguas según el ancho). Un tipo de gadget NUEVO
  necesita su rama en `page.tsx` ANTES del caso final, que asume `ratePair`.
  Render en `src/components/dashboard-widgets.tsx` (server), edición en
  `src/components/dashboard-customizer.tsx` (sheet «Personalizar Inicio»:
  orden/visibilidad, alta/baja de gadgets y qué cuentas lista la sección
  Cuentas — `accountIds` null = todas; los gadgets NO se filtran por eso).
  `saveDashboardPrefs` valida propiedad de cuentas/monedas referenciadas y
  descarta en silencio las ajenas. En escritorio las secciones se reparten en
  filas de 12 columnas respetando el orden del usuario (`packDashboardRows`
  en `src/lib/dashboard-layout.ts`, con tests: ancha + estrecha = 8/4, dos
  iguales = 6/6, sola = 12). Una sección sin datos NO se registra, así no
  deja hueco: por eso la página carga ella misma las cuotas próximas.
- **Rendimiento de navegación**: skeleton global en
  `src/app/(app)/loading.tsx` y uno por sección (el `loading.tsx` de cada
  carpeta, con las siluetas de `src/components/page-skeleton.tsx`: lista en
  rejilla o detalle en dos columnas). Todas las páginas son force-dynamic:
  sin ellos no hay feedback al navegar. Además `experimental.staleTimes.dynamic = 30` en
  `next.config.ts` (el router del cliente reusa la página 30 s). Ese cache
  depende de que TODA server action que mute datos llame `revalidatePath` —
  regla existente, ahora obligatoria.
- **PWA/iOS (añadir a inicio)**: `src/app/manifest.ts` genera
  `/manifest.webmanifest` (standalone, theme/background `#f6f8f8`, el color del lienzo);
  `appleWebApp` + `viewport.themeColor` en `src/app/layout.tsx`. Iconos PNG:
  `src/app/apple-icon.png` (180, Next lo enlaza como apple-touch-icon) y
  `public/icons/icon-{192,512}.png` (manifest, 512 también maskable) — son
  `icon.svg` SIN la esquina redondeada (iOS redondea él mismo y pinta NEGRA
  la transparencia), rasterizados con sharp. El matcher de
  `src/middleware.ts` EXCLUYE manifest.webmanifest, apple-icon.png e
  `/icons/` — Safari los pide sin cookie al añadir a inicio.
- **Contactos** (`/contactos`): las personas de deudas y mensualidades son
  administrables. Servicio `src/lib/services/contact-service.ts`
  (crear/editar/eliminar/fusionar) + `src/app/actions/contact-actions.ts`;
  lógica pura en `src/lib/contacts-core.ts` (con tests: `normalizeContactName`
  sin acentos ni mayúsculas, `filterContacts`, `resolveContactInput`,
  `contactBalances` «me debe / le debo» por moneda, `mergeNotes`). Reglas:
  el nombre no se repite al crear ni al renombrar (comparado en JS con
  `normalizeContactName`; NO hay unicidad en BD porque existen duplicados
  antiguos — cada deuda creaba su contacto); un contacto CON DEUDAS no se
  elimina (FK Restrict: se eliminan antes o se FUSIONA con otro —
  `mergeContacts` mueve deudas y planes al destino y borra el origen); sus
  mensualidades sueltas quedan «Sin contacto». Toda fila que cambia de
  contacto se actualiza con `updatedAt` EXPLÍCITO (el SET NULL de Postgres
  no lo toca y el pull móvil depende de él) y el borrado anota la lápida
  `contact`. Lista con buscador (`contacts-browser.tsx`, filtra en cliente)
  y ficha `/contactos/[id]` con sus deudas, mensualidades e historial y los
  drawers editar · fusionar · nueva deuda · nueva mensualidad (nombres en
  `contactos/[id]/panels.ts`). En los formularios de deuda y mensualidad el
  contacto se elige con `ContactPicker` (`src/components/contact-picker.tsx`):
  un campo de texto que sugiere los existentes; NO llama a ninguna action —
  el texto se resuelve con `resolveContactInput` (coincidencia exacta
  normalizada → existente; si no → `contactName`, que `createDebt` /
  `createPlan` crean en la MISMA transacción); con el contacto ya fijado
  (alta desde su ficha) se pinta `FixedContact`. Las filas de deuda y
  mensualidad son compartidas entre las listas y la ficha (`debt-card.tsx`:
  `DebtCard`/`ClosedDebtRow`; `plan-card.tsx`: `PlanCard`/`EndedPlanRow`;
  datos e `include` en `src/lib/debt-cards.ts`): NO traen marco, van
  dentro de UNA `Card padding="none"` con `divide-y`, y `DebtCard` es UN
  solo enlace con todo su texto dentro (así la localizan los E2E).
- **Drawers**: TODO formulario corto vive en un drawer — hoja inferior
  deslizable en móvil, panel lateral derecho en md+ — salvo `/registrar`,
  el arqueo `/conteo/[id]` y la edición de movimiento, que siguen siendo
  páginas. Piezas: `src/components/ui/drawer.tsx` (vaul) →
  `src/components/form-drawer.tsx` (`FormDrawer` controlado por estado,
  `PanelDrawer` con nombre, `FormDrawerBody`/`FormDrawerFooter`,
  `useFormDrawer`) → `confirm-drawer.tsx` (confirmaciones destructivas,
  siempre hoja inferior). Un `PanelDrawer` se abre con `PanelButton` /
  `openPanel(nombre)` (`src/hooks/use-panel.ts`, estado de módulo) o
  llegando por un enlace `…#panel=<nombre>` (`panelHref`,
  `src/lib/panel-core.ts` con tests): el fragmento es SOLO enlace de entrada
  y se quita al abrir. Las antiguas rutas `/x/nueva` son `redirects()` de
  `next.config.ts` hacia esos fragmentos — ningún enlace interno debe
  apuntar a ellas. El botón Atrás cierra el drawer mediante una entrada
  centinela del historial con la MISMA URL
  (`src/hooks/use-dismiss-on-back.ts`). La página que hospeda un drawer
  carga las opciones de su formulario y se las pasa por props
  (`src/lib/form-options.ts`); una action que cambie esas opciones debe
  revalidar la página ANFITRIONA (`src/lib/revalidate-paths.ts`). Las
  constantes compartidas entre una página servidor y sus componentes
  cliente (nombres de panel) van en un módulo sin "use client". El
  drawer se pinta por portal: dentro NO llegan las variantes `@…/main`
  (maquetación simple, sin rejillas de contenedor).
- **Rejillas y piezas de página** (sobre los primitivos de «Tema»):
  `src/components/content-grid.tsx` — `CardGrid` (teselas 1 → 2 → 3
  columnas; `cols={2}` dentro de un detalle) y `SplitLayout` (principal 8
  + lateral 4, `asideFirst` si el lateral va antes en móvil), ambos con
  las container queries `@…/main`. Además `section.tsx` (`Section` =
  `<section>` + `SectionHeader`, que es como los E2E localizan las
  secciones), `section-tabs.tsx` (`DebtsTabs`, sobre `SegmentedLinks`),
  `form-field.tsx` (`Field` con el `<label>` ENVOLVIENDO al control y
  `FormError`; los Select de formulario son `SelectTrigger variant="form"
  className="w-full"` y las elecciones excluyentes `Segmented
  layout="fill"`), `entity-avatar.tsx` (iniciales con
  `src/lib/initials.ts`) y `page-skeleton.tsx` (`ListSkeleton` /
  `DetailSkeleton` para los `loading.tsx` de cada sección). `EmptyState`
  acepta `cta` (nodo) para abrir un drawer en vez de enlazar. Animaciones
  solo CSS en `globals.css` (`anim-fade-up`, `anim-stagger`,
  `anim-grow-x`, `press`) con un apagado global para
  `prefers-reduced-motion`.
- **Tema (sistema de diseño v3, 2026-11-26)**: estética de panel
  «analytics»: lienzo gris muy claro (`app`), tarjetas blancas (`card`) con
  borde fino (`line`), SIN sombras ni degradados, y el verde-azul (`brand`)
  como ÚNICO color de acento. La barra lateral sigue en petróleo oscuro (la
  única superficie oscura; pasarla a clara es cambiar solo el bloque
  `--color-sidebar-*`). Fuente Outfit, expuesta como `--font-app` desde
  `src/app/fonts/index.ts` (cambiar de fuente = tocar ese archivo; la variable
  va en `<html>`, no en `<body>`). Tokens Tailwind 4 en `@theme` de
  `src/app/globals.css` — se conservan los NOMBRES heredados con valores
  nuevos. Reglas:
  - **Color**: `text-heading` (títulos y cifras), `text-ink`/`text-ink-soft`
    (cuerpo), `text-muted` (secundario, 4,5:1; `muted-2` es SOLO borde de
    campos vía `border-input`), `text-brand-ink` (acento y enlaces),
    `bg-card`, `bg-subtle` (relleno NEUTRO: pistas, paneles interiores, hover),
    `bg-chip` (tinte de acento: teselas de icono, estados activos),
    `border-line`/`border-line-2`. PROHIBIDO en código nuevo: `bg-white`,
    `text-navy`, `text-brand`, `font-bold`, `bg-muted` (muted es tinta, no
    relleno), degradados, hex a mano y atenuar texto con `opacity-*` (usar
    `Badge`). El dorado ya no decora: ámbar solo en avisos y contadores.
  - **Escala**: tamaños de texto solo `text-[11px]`, `text-xs`, `text-sm`,
    `text-[15px]`, `text-base`, `text-xl`, `text-[22px]`, `text-[28px]`; pesos
    `font-medium` (etiquetas, títulos de fila) y `font-semibold` (encabezados
    y montos); montos con `.money` (cifras tabulares). Radios solo
    `rounded-md|lg|xl|2xl|3xl|full`, y OJO: la escala está REMAPEADA en
    `@theme` (xl = 10 px, 2xl = 12 px, 3xl = 16 px). Foco con `ring-ring`.
  - **Sombras** solo para lo que flota (`shadow-popover|toast|modal`); una
    tarjeta se separa con borde. No poner un token de sombra a `none`
    (invalida el box-shadow entero, anillos incluidos).
  - **Responsive, tres mecanismos con un papel cada uno**: `md:` cambia el
    SHELL (barra lateral vs barra inferior); `dense:` (variante propia: ≥768 px
    Y puntero fino) baja los controles de 44 a 36 px — en táctil se quedan en
    44 px y 16 px de texto en campos para que iOS no haga zoom; las REJILLAS
    de contenido usan container queries sobre la columna (`@container/main` en
    el layout): `@2xl/main:` (~672 px) y `@4xl/main:` (~896 px, principal 8 +
    lateral 4). No usar `lg:`/`xl:` para contenido: con la barra lateral
    abierta el viewport miente (a 1024 px el contenido mide 704 px). Las
    variantes de contenedor no llegan a los portales de Radix.
  - **Primitivos**: `Page`/`PageBody` (`src/components/page.tsx`; ancho
    `full|narrow|form`), `ScreenHeader` plano (`title` = `<h1>`, `subtitle`,
    `backHref` — la flecha solo se pinta en móvil, en escritorio manda el
    breadcrumb —, `leading`, `actions`), `StatCard`/`StatGrid`/`DeltaChip`
    (KPI; su contrato de DOM lo fija `stat-card.test.tsx`), `SectionHeader`
    (`<h2>` real), `Card` (`ui/card.tsx`), `Segmented`/`SegmentedLinks`
    (`ui/segmented.tsx`), `ProgressBar`, `Sparkline`, `buttonVariants()` para
    enlaces con aspecto de botón y `SelectTrigger variant="form"`. Las listas
    son UNA tarjeta con filas divididas (`divide-y divide-line-2`), no una
    tarjeta por fila; siguen como teselas en rejilla cuentas, cajas, pares de
    tasas y denominaciones. Las cifras clave de cada pantalla van en
    `StatCard`, no en la cabecera.
  - **Gráficos**: una sola serie de acento (`chart-1`), comparación en gris
    (`chart-2`) y contexto en `chart-track`; todo SVG/CSS a mano.
  Componentes base en `src/components/ui/`. Logotipo FE
  («pecera»: F y E partidas por una ola senoidal, verde petróleo arriba/
  blanco bajo el agua, colores de la paleta brand/brand-light/chip; letras =
  contornos de la fuente American Captain convertidos a path con opentype.js,
  sin dependencia de fuente en runtime):
  `src/app/icon.svg` (favicon) y `src/components/brand-mark.tsx`
  (sidebar, cabecera de Inicio en móvil, auth y /compartir; en el sidebar va
  envuelto en un span para
  esquivar el `[&>svg]:size-4` del SidebarMenuButton). Los ids internos del
  SVG (clipPaths/gradiente) son deterministas vía prop `idPrefix` (uno
  distinto por punto de montaje) — useId() rompía la hidratación dentro del
  tooltip Radix del sidebar.
- **Perfil**: `/perfil` (editar nombre/correo y contraseña). Cambiar la
  contraseña invalida las demás sesiones (`invalidateOtherSessions` en
  `src/lib/auth.ts`). Actions en `src/app/actions/profile-actions.ts`.
- **Iconos de cuenta**: set curado de lucide en `src/lib/account-icons.ts`
  (`getAccountIcon(icon, type)` con fallback por tipo). Selector en el form
  de nueva cuenta y en el drawer «Editar cuenta» de su detalle; el nombre
  kebab se guarda en `Account.icon`.
- **shadcn/ui**: infraestructura montada (`components.json`, tokens
  semánticos —background/primary/sidebar-\*— mapeados a la paleta de Caja en
  `@theme`, deps radix-ui/cva/tw-animate-css). Componentes vendorizados:
  sidebar, sheet, tooltip, separator, skeleton, avatar, dropdown-menu,
  breadcrumb y drawer (vaul, única dependencia de UI añadida; re-vestido
  con los tokens); propios con la misma convención: card y segmented.
  REGLA: la UI nueva usa esos componentes; los primitivos escritos a mano
  (Button/Input/Badge/Select) se mantienen.
- **UserMenu** (`src/components/user-menu.tsx`): avatar con iniciales +
  dropdown (Mi perfil / Cerrar sesión) en la cabecera de Inicio, solo móvil
  (`md:hidden`); en escritorio el mismo menú cuelga del bloque de usuario del
  sidebar. Exporta `initials()` (envoltorio de `src/lib/initials.ts`).
- **Navegación**: escritorio = `src/components/app-sidebar.tsx` (Sidebar
  shadcn colapsable a iconos, estado en cookie `sidebar_state`, atajo
  Ctrl/Cmd+B) con los grupos General / Compromisos / Efectivo / Ajustes y el
  bloque de usuario con menú; barra superior con breadcrumb y campana. El
  sidebar NO lleva botón ni entrada «Registrar»: se quitó a petición del
  usuario (2026-11-27) y está PROHIBIDO volver a añadirlo, ni fijo arriba ni
  como ítem de un grupo (lo vigila `app-sidebar.test.tsx`). En escritorio se
  llega a /registrar por los accesos rápidos de Inicio (Gasto / Ingreso /
  Transferir) y el botón «Registrar» del detalle de cuenta. Móvil =
  `bottom-nav.tsx` (plana, «+» al centro). El layout de `(app)` monta
  SidebarProvider + SidebarInset (que es
  un `<div>`: el `<main>` lo pone cada página con `<Page>`) y la columna de
  contenido `@container/main` (`max-w-6xl`). `/mensualidades` y
  `/contactos` tienen entrada propia en el sidebar (grupo Compromisos) y en
  `/mas`; en la barra inferior cuelgan de la pestaña Deudas, y las tres
  vistas comparten las pestañas `DebtsTabs`
  (`src/components/section-tabs.tsx`).

## Gotchas

- Historial y server actions: NUNCA llames a `history.*` ni a
  `router.push/replace` en el mismo tick en que resuelve una server action
  (Next descarta su resultado y vuelve a pedir la página): usa
  `useFormDrawer().close()/closeAndGo()` o difiere con `setTimeout(…, 0)`.
  Tampoco guardes nada propio en `history.state` (Next lo reescribe) ni
  dejes el estado de un drawer en la URL mientras está abierto (`#…` o `?…`
  hacen que Next repita la petición de la página tras cada action).
- vaul inyecta su CSS SIN capa y gana a las utilidades de Tailwind: para
  pisar un estilo suyo (el asa) la clase lleva `!`. `FormDrawer` fija
  `handleOnly` (sin él vaul captura el puntero y rompe los `Select` y la
  selección de texto) y el asa lleva `preventCycle` (sin él un toque en el
  asa cierra con un guardado en curso).
- Tests de componentes: el setup NO limpia el DOM entre tests; cada archivo
  que renderiza lleva `afterEach(cleanup)` o los renders se acumulan.
- `@container/main` (layout de (app) y de /compartir) es contenedor de los
  `position: fixed` de dentro: lo flotante va por portal (Radix) o fuera de
  la columna (Toast). Por eso `fadeUp` termina en `transform: none`.
- Los tests E2E localizan por texto, rol y estructura (no hay test ids): al
  tocar marcado, un solo nodo por contenido (nada de copia móvil + copia
  escritorio), encabezados testeados con UN `<section>` ancestro, y monto y
  unidad separados por un espacio real.
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
  `connection_limit=10&connect_timeout=15`. Desde 2026-11-07
  `src/lib/db.ts` pasa `DATABASE_URL` por `normalizeDatabaseUrl`
  (`src/lib/db-url.ts`, con tests) que AÑADE lo que falte (schema=caja,
  sslmode, connect_timeout=15 y, en hosts `-pooler`, pgbouncer+
  connection_limit) sin pisar lo presente: un env mal copiado en Vercel ya
  no provoca P1001 "Can't reach database server" por el arranque en frío
  (Prisma espera solo 5 s por defecto). El CLI de Prisma (migraciones)
  sigue leyendo la URL cruda del `.env`.
- Cookie de sesión huérfana (ej. tras cambiar de BD): el layout de (app)
  redirige a `/auth/salir` (route handler que borra la cookie) — nunca
  directo a /auth/login, o se produce un bucle con el middleware.
- El entorno reescribe `.env` de vez en cuando (plantilla Neon vieja SIN
  schema=caja ni pgbouncer): hay copia redundante en `.env.local` (la carga
  el runtime de Next). El CLI de Prisma solo lee `.env` — si algo falla,
  restaurar `.env` desde `.env.local`. No crear `prisma/.env` (Prisma aborta
  si duplica variables).
- Config del CLI en `prisma.config.ts` (el bloque `package.json#prisma` está
  deprecado): el seed vive en `migrations.seed`. Con config file Prisma NO
  carga `.env` solo — lo repone el `import "dotenv/config"` de ese archivo
  (dotenv no pisa variables ya definidas, así el override de DATABASE_URL
  y DIRECT_URL en `e2e/setup-db.ts` sigue ganando).
- Playwright E2E (`e2e/`, config en `playwright.config.ts`): BD aislada en
  la MISMA base de Neon pero en el schema `caja_e2e`. `e2e/test-db.ts`
  deriva las URLs de test de `DATABASE_URL`/`DIRECT_URL` del `.env`
  cambiando SOLO el parámetro `schema` (`normalizeDatabaseUrl` respeta un
  schema presente) y `e2e/setup-db.ts` recrea el schema en cada corrida
  (`DROP SCHEMA IF EXISTS "caja_e2e" CASCADE` + `prisma migrate deploy`, sin
  seed: los defaults se crean al registrarse), encadenado en el comando del
  webServer porque este arranca ANTES que globalSetup. Guard duro
  (`assertTestSchema`): aborta si el schema resuelto es `caja`/`public` o no
  es exactamente `caja_e2e`. El webServer recibe las DOS URLs de test
  (`migrate deploy` usa `DIRECT_URL`: sin sobrescribirla iría al schema
  real), más `APP_TIME_ZONE` (igual al `timezoneId` del navegador, para que
  «Vence hoy» no dependa de la hora de la corrida) y
  `ALLOW_REGISTRATION=true`. Proyecto `setup` registra `e2e@caja.test` vía
  /auth/registro y guarda `e2e/.auth/user.json` (storageState) para los
  proyectos desktop y mobile (375×812). `channel: "chrome"` (Chrome del
  sistema): la descarga del Chromium empaquetado da 403 por geo-bloqueo.
  `workers: 1` a propósito (los flujos mutan datos del mismo usuario). El
  schema `caja_e2e` queda en Neon tras la corrida (sirve para inspeccionar
  un fallo) y se borra al empezar la siguiente. En los specs, los Select de
  Radix se abren con `selectOption` de `e2e/helpers.ts`, que casa el rótulo
  del `<label>` de forma EXACTA (por subcadena, «Cuenta» casaba también con
  la ayuda del campo Monto). Los specs entran por
  `/cuentas/nueva` y `/deudas/nueva`, que hoy redirigen al drawer de su
  lista: por eso los formularios en drawer conservan labels, placeholders y
  nombres de botón.

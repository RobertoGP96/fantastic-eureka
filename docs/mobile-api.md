# API móvil de Changebox (`/api/mobile/v1`)

Contrato entre esta web y la app Android (`D:\Projects\changebox`). La app
funciona offline contra su base local (Room) y usa esta API para iniciar
sesión y sincronizar: **push** de las operaciones que hizo sin red y **pull**
de lo que cambió en el servidor.

La API **no tiene reglas propias**: cada operación llama al mismo servicio
(`src/lib/services/*-service.ts`) que la server action equivalente de la
web. Lo que la web rechaza, la API lo rechaza con el mismo mensaje.

## Puesta en marcha

1. Aplicar la migración `20260922120000_mobile_sync` con `pnpm db:deploy`
   (nunca `migrate dev` contra Neon). Es aditiva e idempotente: añade
   `updatedAt` a las tablas de datos y crea `SyncTombstone` y
   `SyncOperation`. La web sigue funcionando igual.
2. Desplegar. Las rutas `/api/mobile/*` no pasan por el middleware de
   cookie: autentican con token Bearer.

## Convenciones

- Cuerpo y respuesta en JSON. Éxito: `{ "ok": true, "data": … }`. Fallo:
  `{ "ok": false, "error": "mensaje en español" }`.
- **401 = sesión no válida**, siempre. La app pasa a "sesión caducada" y
  conserva sus datos locales.
- Autenticación: `Authorization: Bearer <token>` salvo en login/registro.
- Fechas ISO 8601 en UTC. Montos: enteros en unidades menores. Tasas:
  enteros ×10 000. Nunca decimales.
- Ningún recurso incluye `userId`: la app es de un solo usuario.

## Autenticación

| Método y ruta | Cuerpo | Respuesta `data` |
|---|---|---|
| `POST /auth/login` | `{ email, password }` | `{ token, expiresAt, user }` (401 si las credenciales no valen) |
| `POST /auth/register` | `{ name, email, password, confirm }` | `{ token, expiresAt, user }` con 201. El usuario nace con las monedas, denominaciones y categorías por defecto |
| `POST /auth/logout` | — | `null` (idempotente) |
| `GET /me` | — | `{ user }` |

`user` = `{ id, name, email }`. El token es opaco. En la base se guarda su
SHA-256 en la tabla `Session`, la misma que usa la cookie web. La sesión
dura 30 días y **se renueva sola** a 30 días cuando le quedan menos de 15 y
se usa.

## Pull — `GET /sync/pull?cursor=<ISO>`

```json
{
  "nextCursor": "2026-09-22T12:00:00.000Z",
  "full": false,
  "resync": false,
  "user": { "id": "…", "name": "…", "email": "…", "dashboardPrefs": "…", "updatedAt": "…" },
  "collections": {
    "currencies": [], "denominations": [], "accountGroups": [], "accounts": [],
    "categories": [], "transactions": [], "exchangeRates": [], "cashCounts": [],
    "contacts": [], "debts": [], "paymentPlans": [], "installments": [],
    "debtPayments": []
  },
  "tombstones": [{ "collection": "account", "rowId": "…", "deletedAt": "…" }]
}
```

- **Sin cursor** es un pull completo: todas las filas del usuario y sin
  lápidas (`full: true`).
- Con cursor llegan las filas con `updatedAt` posterior al cursor menos 60 s.
  El solape cubre transacciones que confirmaron tarde, así que puede repetir
  filas: el cliente hace **upsert por id**.
- `resync: true` llega si el cursor es inválido, tiene más de 60 días o está
  en el futuro. Entonces el pull es completo y el cliente debe **descartar
  sus datos sincronizados** y aplicar este como nuevo. Las operaciones
  pendientes del outbox se conservan y se reenvían.
- `user` es `null` si el perfil no cambió desde el cursor.
- Cada movimiento de `transactions` trae su desglose en
  `denominationLines: [{ id, accountId, denominationId, quantity }]`. Cada
  arqueo de `cashCounts` trae sus `lines`. El cliente **reemplaza entero** el
  desglose o las líneas de esa fila.
- Los campos de cada fila son los de `prisma/schema.prisma`, sin `userId`.
- Guardar `nextCursor` solo después de aplicar el pull entero en una
  transacción local.

### Lápidas

Solo se anotan los borrados **raíz**: `account`, `accountGroup`, `category`,
`denomination`, `transaction`, `debt` y `paymentPlan`. Al aplicar una lápida
el cliente borra la fila, y los hijos caen por las **mismas cascadas** que en
el servidor:

- cuenta → sus movimientos (de ambos lados), arqueos y abonos;
- deuda → sus abonos, planes y cuotas;
- plan → sus cuotas;
- movimiento → su desglose y su abono. La cuota vinculada conserva su
  estado y solo pierde el vínculo;
- grupo → las cuentas quedan sin grupo.

## Push — `POST /sync/push`

```json
{
  "ops": [
    {
      "opId": "3f2b…",
      "type": "account.create",
      "payload": { "name": "Caja", "type": "CASH_BOX", "currencyId": "…" },
      "ids": { "id": "…", "initialTransactionId": "…" }
    }
  ]
}
```

Respuesta: `{ "results": [{ "opId", "status", "error?", "data?" }] }`, en
el mismo orden.

- Como máximo 200 operaciones por petición. Se aplican **en orden**.
- `opId`: id único que genera el cliente al encolar, de 8 a 64 caracteres
  `[A-Za-z0-9_-]`. Es la clave de idempotencia.
- `status`:
  - `applied`: la operación se aplicó.
  - `duplicate`: ese `opId` ya se procesó. Si se rechazó, viene su `error`.
    Sirve para reintentar tras un corte sin duplicar nada.
  - `rejected`: fallo de negocio (mensaje de la web). No se aplicó **nada**
    de esa operación y no se reintenta. El siguiente pull devuelve el estado
    real y el cliente revierte su cambio optimista.
- Si falla la infraestructura, llega `rejected` con "No se pudo aplicar la
  operación; se reintentará". En ese caso el `opId` **no** se registra y el
  cliente debe reintentarlo.
- Un rechazo no detiene el lote. Las operaciones que dependían de la
  rechazada fallan con su propio mensaje.
- Tras un push, el cliente hace **siempre** un pull.

### Ids generados en el cliente

Una fila creada offline ya tiene id en el móvil. `ids` le dice al servidor
qué id usar para cada fila que crea la operación. Así el pull devuelve esas
filas con el mismo id y el móvil no las duplica. Formato: UUID o cuid, de 8
a 64 caracteres `[A-Za-z0-9_-]`.

Hay filas que el servidor crea con id propio y que el cliente **no** debe
crear offline: las esperará del pull.

- Las denominaciones básicas que siembra `currency.create`.
- Los movimientos que generan las cuotas y abonos si no se manda su id.

### Catálogo de operaciones

`payload` es exactamente lo que recibe la server action web: el esquema Zod
de `src/lib/schemas.ts` indicado. Cuando el esquema es `idSchema`, el
payload es **el id como cadena**, no un objeto.

| `type` | Esquema del payload | `ids` que acepta |
|---|---|---|
| `account.create` | `createAccountSchema` | `id`, `initialTransactionId` (movimiento de saldo inicial, si el monto no es 0) |
| `account.update` | `updateAccountSchema` | — |
| `account.setIcon` | `accountIconSchema` | — |
| `account.delete` | `idSchema` | — |
| `group.create` | `groupSchema` | `id` |
| `group.rename` | `renameGroupSchema` | — |
| `group.delete` | `idSchema` | — |
| `group.assign` | `assignGroupSchema` | — |
| `category.create` | `categorySchema` | `id` |
| `category.rename` | `renameCategorySchema` | — |
| `category.toggle` | `idSchema` | — |
| `category.delete` | `idSchema` | — |
| `currency.create` | `currencySchema` | `id` (las denominaciones básicas llegan por pull) |
| `currency.toggle` | `idSchema` | — |
| `currency.setKind` | `setCurrencyKindSchema` | — |
| `currency.setBase` | `idSchema` | — |
| `denomination.create` | `denominationSchema` | `id` |
| `denomination.update` | `updateDenominationSchema` | — |
| `denomination.toggle` | `idSchema` | — |
| `denomination.delete` | `idSchema` | — |
| `rate.create` | `exchangeRateSchema` | `id` |
| `tx.incomeExpense` | `incomeExpenseSchema` | `id` |
| `tx.transfer` | `transferSchema` | `id` |
| `tx.update` | `updateTransactionSchema` | — |
| `tx.delete` | `idSchema` | — |
| `cashCount.create` | `cashCountSchema` | `id`, `adjustmentTransactionId` (si se registra ajuste) |
| `debt.create` | `createDebtSchema` | `id`, `contactId` (si crea contacto), `planId`, `installmentId` (si trae plan) |
| `debt.setAccount` | `setDebtAccountSchema` | — |
| `debt.payment` | `debtPaymentSchema` | `id` (abono), `transactionId` |
| `debt.delete` | `idSchema` | — |
| `plan.create` | `createPlanSchema` | `id`, `installmentId` (primera cuota) |
| `plan.setAccount` | `setPlanAccountSchema` | — |
| `plan.settle` | `settleInstallmentSchema` | `transactionId`, `debtPaymentId`, `nextInstallmentId` |
| `plan.skip` | `idSchema` | `nextInstallmentId` |
| `plan.deactivate` | `idSchema` | — |
| `plan.delete` | `idSchema` | — |
| `dashboard.savePrefs` | `dashboardPrefsSchema` | — |
| `profile.update` | `updateProfileSchema` | — |

`nextInstallmentId` solo se usa si la siguiente cuota es nueva. Si ya
existía, conserva su id.

**Fuera del push, a propósito:** compartir una cuenta y cambiar la
contraseña. Necesitan respuesta del servidor en el momento y no tiene
sentido encolarlas offline. Tendrán endpoints directos.

## Garantías del push

Cada operación corre en **una transacción** que incluye el registro de su
`opId` en `SyncOperation`. Si el servicio devuelve un fallo, la transacción
se aborta aunque ya hubiera escrito algo, y el rechazo se anota aparte. Así
nunca quedan cambios a medias y un reintento nunca aplica dos veces. Lo
cubren los tests de `src/lib/sync/push.test.ts`.

## Archivos

- `src/app/api/mobile/v1/**/route.ts`: rutas.
- `src/lib/mobile-auth.ts`: token Bearer sobre la tabla `Session`.
- `src/lib/mobile-http.ts`: forma de las respuestas.
- `src/lib/sync/pull.ts`, `src/lib/sync/window.ts`: pull y su ventana.
- `src/lib/sync/push.ts`, `src/lib/sync/op-registry.ts`: push y catálogo.
- `src/lib/sync/tombstones.ts`: lápidas.
- `src/lib/services/*-service.ts`: lógica de negocio compartida con la web.

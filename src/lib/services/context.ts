// Contexto común de los servicios de dominio (src/lib/services/*-service.ts).
//
// Los servicios son la lógica de negocio SIN acoplamiento a Next.js: no leen
// cookies ni llaman a revalidatePath. Los usan dos clientes:
//   · las server actions (web): sesión por cookie + servicio + revalidate;
//   · el push de la API móvil (/api/mobile/v1/sync/push): token Bearer +
//     servicio, dentro de la MISMA transacción que registra el opId.
// Por eso cada servicio recibe la conexión (`db`) en vez de usar el prisma
// global: puede ser el cliente normal o una transacción ya abierta.

import { Prisma, type PrismaClient } from "@prisma/client";

export type Db = PrismaClient | Prisma.TransactionClient;

export interface ServiceContext {
  db: Db;
  userId: string;
}

/**
 * Opciones de un servicio de CREACIÓN. `id` solo lo manda el push móvil: la
 * app genera el id en el dispositivo (registro offline) y el servidor lo
 * respeta para que ambos lados hablen de la misma fila. Las server actions
 * nunca lo pasan, así que un formulario web no puede inyectarlo.
 */
export interface CreateOptions {
  id?: string;
}

/** Forma aceptable de un id generado en el cliente (UUID o cuid). */
const CLIENT_ID_SHAPE = /^[A-Za-z0-9_-]{8,64}$/;

export function clientIdOrUndefined(id: string | undefined): string | undefined {
  if (id === undefined) return undefined;
  if (!CLIENT_ID_SHAPE.test(id)) throw new Error("Id de cliente inválido");
  return id;
}

/**
 * Ejecuta `fn` dentro de una transacción. Si `db` YA es una transacción (el
 * push móvil abre una para registrar el opId junto a la mutación) la
 * reutiliza: las transacciones interactivas de Prisma no se anidan.
 */
export async function inTx<T>(
  db: Db,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if ("$transaction" in db) {
    return (db as PrismaClient).$transaction(fn);
  }
  return fn(db);
}

// Códigos de Prisma que indican un fallo de INFRAESTRUCTURA (conexión, pool,
// transacción caducada, deadlock): la misma operación puede funcionar si se
// reintenta. Todo lo demás (P2002 id duplicado, P2003 FK, errores de código)
// es permanente.
const TRANSIENT_PRISMA_CODES = new Set([
  "P1001", // no se alcanza el servidor
  "P1002", // timeout al conectar
  "P1008", // timeout de la operación
  "P1017", // el servidor cerró la conexión
  "P2024", // pool agotado
  "P2028", // transacción caducada / cerrada
  "P2034", // conflicto de escritura o deadlock
]);

export function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code);
  }
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    // Errores de BD sin código de Prisma: típicamente la conexión cortada
    // (reinicio o suspensión del cómputo de Neon a mitad de consulta).
    error instanceof Prisma.PrismaClientUnknownRequestError
  );
}

/**
 * Resultado del `catch` genérico de un servicio: loguea y devuelve el mensaje
 * amigable. `retryable` distingue un fallo transitorio de infraestructura de
 * un rechazo definitivo: el push móvil NO debe registrar como REJECTED (para
 * siempre) una operación que solo falló porque se cayó la conexión.
 */
export function unexpectedFailure(
  scope: string,
  error: unknown,
  message: string
): { success: false; error: string; retryable: boolean } {
  console.error(`${scope}:`, error);
  return { success: false, error: message, retryable: isTransientDbError(error) };
}

/** Mensaje común cuando no hay usuario (acciones web y API móvil). */
export const SESSION_EXPIRED =
  "Tu sesión ha expirado. Vuelve a iniciar sesión.";

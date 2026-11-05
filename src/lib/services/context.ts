// Contexto común de los servicios de dominio (src/lib/services/*-service.ts).
//
// Los servicios son la lógica de negocio SIN acoplamiento a Next.js: no leen
// cookies ni llaman a revalidatePath. Los usan dos clientes:
//   · las server actions (web): sesión por cookie + servicio + revalidate;
//   · el push de la API móvil (/api/mobile/v1/sync/push): token Bearer +
//     servicio, dentro de la MISMA transacción que registra el opId.
// Por eso cada servicio recibe la conexión (`db`) en vez de usar el prisma
// global: puede ser el cliente normal o una transacción ya abierta.

import type { Prisma, PrismaClient } from "@prisma/client";

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

/** Mensaje común cuando no hay usuario (acciones web y API móvil). */
export const SESSION_EXPIRED =
  "Tu sesión ha expirado. Vuelve a iniciar sesión.";

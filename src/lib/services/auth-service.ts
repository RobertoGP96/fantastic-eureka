// Alta e inicio de sesión SIN cookies: lo comparten las server actions de
// /auth (que luego crean la cookie) y la API móvil (que emite un token
// Bearer). Mismos mensajes que tenían las actions.

import { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "@/lib/password";
import { bootstrapUserDefaults } from "@/lib/user-defaults";
import {
  loginSchema,
  registerSchema,
  type ActionResult,
} from "@/lib/schemas";
import { inTx, type Db, unexpectedFailure } from "./context";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/** Crea el usuario con sus monedas, denominaciones y categorías por defecto. */
export async function registerUser(
  db: Db,
  input: unknown
): Promise<ActionResult<AuthUser>> {
  // Cada usuario tiene sus propios datos; el flag permite cerrar el
  // registro en despliegues privados (ALLOW_REGISTRATION=false).
  if (process.env.ALLOW_REGISTRATION === "false") {
    return { success: false, error: "El registro está deshabilitado" };
  }

  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    // Usuario + sus datos por defecto en una sola transacción: nunca queda
    // un usuario "vacío" a medias.
    const user = await inTx(db, async (tx) => {
      const created = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash: hashPassword(parsed.data.password),
        },
      });
      await bootstrapUserDefaults(tx, created.id);
      return created;
    });
    return {
      success: true,
      data: { id: user.id, name: user.name, email: user.email },
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe una cuenta con ese correo" };
    }
    return unexpectedFailure("registerUser", error, "No se pudo crear la cuenta");
  }
}

// Hash señuelo contra el que se verifica cuando el correo NO existe: sin él
// el login respondía al instante (no ejecutaba scrypt) y el tiempo de
// respuesta delataba qué correos están registrados.
let decoyHash: string | null = null;
const getDecoyHash = () => (decoyHash ??= hashPassword("caja-señuelo"));

/** Comprueba correo + contraseña. Mensaje genérico: no revela si existe. */
export async function verifyCredentials(
  db: Db,
  input: unknown
): Promise<ActionResult<AuthUser>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos",
    };
  }

  try {
    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
    });
    const passwordOk = verifyPassword(
      parsed.data.password,
      user?.passwordHash ?? getDecoyHash()
    );
    if (!user || !passwordOk) {
      return { success: false, error: "Correo o contraseña incorrectos" };
    }
    return {
      success: true,
      data: { id: user.id, name: user.name, email: user.email },
    };
  } catch (error) {
    return unexpectedFailure("loginUser", error, "No se pudo iniciar sesión");
  }
}

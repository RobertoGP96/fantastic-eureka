import type { ActionResult } from "@/lib/schemas";

export const CONNECTION_ERROR =
  "No se pudo contactar con el servidor. Antes de reintentar, comprueba si el cambio llegó a guardarse.";

/**
 * Llama a una server action desde un formulario cliente convirtiendo el
 * rechazo de la promesa (sin red, servidor caído, despliegue a medias) en un
 * `ActionResult` de error. Sin esto el `await` lanzaba, el formulario se
 * quedaba en «Guardando…» para siempre y el usuario recargaba y duplicaba.
 *
 * No usar con actions que terminan en `redirect()` (login/registro/logout):
 * esas no resuelven con un resultado.
 */
export async function runAction<T>(
  call: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await call();
  } catch (error) {
    console.error("server action:", error);
    return { success: false, error: CONNECTION_ERROR };
  }
}

import "server-only";

import { revalidatePath } from "next/cache";

// Los formularios ya no tienen página propia (`/x/nueva`): viven en drawers
// de las listas y fichas, que cargan sus opciones (contactos, monedas,
// cuentas…) y se las pasan por props. Cuando una de esas opciones cambia hay
// que revalidar la página ANFITRIONA del drawer, no una ruta `/nueva`.

/**
 * Páginas que hospedan los formularios de deuda y de mensualidad. Llamar al
 * crear, renombrar, archivar o borrar una cuenta o una moneda.
 */
export function revalidateDebtFormHosts() {
  revalidatePath("/deudas");
  revalidatePath("/mensualidades");
  revalidatePath("/(app)/contactos/[id]", "page");
}

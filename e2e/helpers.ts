import type { Page } from "@playwright/test";

export const STORAGE_STATE = "e2e/.auth/user.json";

export const TEST_USER = {
  name: "Usuario E2E",
  email: "e2e@caja.test",
  password: "caja-e2e-2026",
};

/** Sufijo aleatorio para que cada test cree entidades con nombre único
 *  (desktop y mobile comparten BD dentro de una misma corrida). */
export const uniqueSuffix = () => Math.random().toString(36).slice(2, 8);

/**
 * Abre un Select de Radix cuyo trigger (role=combobox) está dentro del
 * <label> que contiene labelText, y elige la opción indicada.
 */
export async function selectOption(
  page: Page,
  labelText: string,
  option: string | RegExp
) {
  await page
    .locator("label", { hasText: labelText })
    .getByRole("combobox")
    .click();
  await page.getByRole("option", { name: option }).click();
}

/**
 * Crea una cuenta de efectivo (CASH, tipo por defecto) en CUP vía UI y
 * devuelve su nombre único. Espera la redirección a /cuentas/[id].
 */
export async function createCashAccount(
  page: Page,
  baseName: string,
  initialAmount?: string
) {
  const name = `${baseName} ${uniqueSuffix()}`;
  await page.goto("/cuentas/nueva");
  await page.getByLabel("Nombre").fill(name);
  await selectOption(page, "Moneda", "CUP · Peso cubano");
  if (initialAmount) {
    await page.getByLabel("Saldo inicial (opcional)").fill(initialAmount);
  }
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  // (?!nueva) — sin él, /cuentas/nueva ya haría match y no se esperaría la
  // redirección real a /cuentas/[id] (carrera con la server action).
  await page.waitForURL(/\/cuentas\/(?!nueva)[^/]+$/);
  return name;
}

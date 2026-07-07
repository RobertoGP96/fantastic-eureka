import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE, TEST_USER } from "./helpers";

// La BD de test se recrea vacía en cada corrida (e2e/setup-db.ts), así que
// registrar el usuario con correo fijo siempre funciona y deja la sesión
// iniciada. El storageState resultante lo reutilizan desktop y mobile.
setup("registrar usuario de pruebas", async ({ page }) => {
  await page.goto("/auth/registro");
  await page.getByLabel("Nombre").fill(TEST_USER.name);
  await page.getByLabel("Correo").fill(TEST_USER.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(TEST_USER.password);
  await page.getByLabel("Repetir").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();

  await page.waitForURL("/");
  await expect(page.getByText("Total consolidado")).toBeVisible();
  await page.context().storageState({ path: STORAGE_STATE });
});

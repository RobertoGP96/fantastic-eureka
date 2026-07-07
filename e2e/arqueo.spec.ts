import { test, expect } from "@playwright/test";
import { createCashAccount } from "./helpers";

// Flujo 3: arqueo de caja en /conteo/[id]. Se llenan las denominaciones hasta
// igualar el saldo teórico (1 750 = 1 000 + 500 + 200 + 50), se comprueba el
// badge "Cuadra" y se guarda. Los inputs se localizan por su aria-label
// "Cantidad de X CUP".
test("arqueo que cuadra: llenar denominaciones y guardar", async ({ page }) => {
  const name = await createCashAccount(page, "Arqueo E2E", "1750");

  await page.goto("/conteo");
  await page.getByRole("link", { name }).click();
  await page.waitForURL(/\/conteo\/[^/]+$/);

  const quantities: Array<[string, string]> = [
    ["1 000 CUP", "1"],
    ["500 CUP", "1"],
    ["200 CUP", "1"],
    ["50 CUP", "1"],
  ];
  for (const [denomination, qty] of quantities) {
    await page
      .getByLabel(`Cantidad de ${denomination}`, { exact: true })
      .fill(qty);
  }

  // Total contado exacto y sin diferencia con el teórico.
  await expect(page.getByText("1 750 CUP", { exact: true })).toBeVisible();
  await expect(page.getByText("Cuadra", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Guardar arqueo" }).click();
  await page.waitForURL(/\/cuentas\/[^/]+$/);

  // El arqueo queda en el historial de /conteo, cuadrado.
  await page.goto("/conteo");
  const record = page
    .locator("div")
    .filter({ hasText: `${name} · 1 750 CUP` })
    .last();
  await expect(record).toBeVisible();
});

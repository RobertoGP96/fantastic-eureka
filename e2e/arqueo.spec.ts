import { test, expect } from "@playwright/test";
import { createCashAccount, saldoActual } from "./helpers";

// Flujo 3: arqueo de caja en /conteo/[id]. Se llenan las denominaciones hasta
// igualar el saldo teórico (1 750 = 1 000 + 500 + 200 + 50), se comprueba el
// badge "Cuadra" y se guarda. Los inputs se localizan por su aria-label
// "Cantidad de X CUP".
test("arqueo que cuadra: llenar denominaciones y guardar", async ({ page }) => {
  const name = await createCashAccount(page, "Arqueo E2E", "1750");

  await page.goto("/conteo");
  // La tarjeta de la caja muestra el saldo teórico y lleva al arqueo.
  const caja = page.getByRole("link", { name });
  await expect(caja).toContainText("Saldo teórico: 1 750 CUP");
  await caja.click();
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
  // Tras guardar se vuelve al detalle de la cuenta; el saldo no cambia.
  await page.waitForURL(/\/cuentas\/[^/]+$/);
  await expect(saldoActual(page)).toContainText("1 750 CUP");

  // El arqueo queda en «Arqueos recientes» de /conteo, cuadrado.
  await page.goto("/conteo");
  const recientes = page.locator("section", {
    has: page.getByRole("heading", { name: "Arqueos recientes" }),
  });
  const record = recientes
    .getByText(`${name} · 1 750 CUP`, { exact: true })
    .locator("xpath=../..");
  await expect(record).toBeVisible();
  await expect(record).toContainText("Cuadra");
});

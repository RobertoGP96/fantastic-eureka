import { test, expect } from "@playwright/test";
import { createCashAccount, selectOption } from "./helpers";

// Flujo 2: registrar un gasto contra una cuenta con saldo y comprobar que el
// saldo derivado baja en el dashboard (5 000 − 1 250 = 3 750).
test("registrar un gasto baja el saldo de la cuenta", async ({ page }) => {
  const name = await createCashAccount(page, "Gastos E2E", "5000");

  await page.goto("/registrar?tipo=gasto");
  await selectOption(page, "Cuenta", `${name} · CUP`);
  await page.getByLabel(/^Monto/).fill("1250");
  await selectOption(page, "Categoría (opcional)", "Alimentación");
  await page.getByRole("button", { name: "Guardar" }).click();

  await page.waitForURL("/");
  const card = page.getByRole("link", { name });
  await expect(card).toContainText("3 750 CUP");
});

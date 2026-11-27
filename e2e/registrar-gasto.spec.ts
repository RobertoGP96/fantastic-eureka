import { test, expect } from "@playwright/test";
import { createCashAccount, saldoActual, selectOption } from "./helpers";

// Flujo 2: registrar un gasto contra una cuenta con saldo y comprobar que el
// saldo derivado baja (5 000 − 1 250 = 3 750) en el detalle de la cuenta —
// adonde vuelve /registrar tras guardar — y en el dashboard.
test("registrar un gasto baja el saldo de la cuenta", async ({ page }) => {
  const name = await createCashAccount(page, "Gastos E2E", "5000");

  await page.goto("/registrar?tipo=gasto");
  await selectOption(page, "Cuenta", `${name} · CUP`);
  await page.getByLabel(/^Monto/).fill("1250");
  await selectOption(page, "Categoría (opcional)", "Alimentación");
  await page.getByRole("button", { name: "Guardar" }).click();

  // Tras guardar se vuelve al detalle de la cuenta afectada, no a Inicio.
  await page.waitForURL(/\/cuentas\/[^/]+$/);
  await expect(saldoActual(page)).toContainText("3 750 CUP");
  const movimientos = page.locator("section", {
    has: page.getByRole("heading", { name: "Movimientos recientes" }),
  });
  await expect(movimientos).toContainText("Alimentación");
  await expect(movimientos).toContainText("1 250 CUP");

  await page.goto("/");
  const card = page.getByRole("link", { name });
  await expect(card).toContainText("3 750 CUP");
});

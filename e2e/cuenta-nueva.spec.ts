import { test, expect } from "@playwright/test";
import { createCashAccount } from "./helpers";

// Flujo 1: crear una cuenta de efectivo con saldo inicial y comprobar que el
// dashboard la lista con el saldo formateado ("4 750 CUP").
test("crear cuenta de efectivo con saldo inicial y verla en el dashboard", async ({
  page,
}) => {
  const name = await createCashAccount(page, "Caja E2E", "4750");

  await page.goto("/");
  // La tarjeta de la cuenta es un Link cuyo nombre accesible incluye
  // nombre, moneda y saldo.
  const card = page.getByRole("link", { name });
  await expect(card).toBeVisible();
  await expect(card).toContainText("CUP");
  await expect(card).toContainText("4 750 CUP");
});

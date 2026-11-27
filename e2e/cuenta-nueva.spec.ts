import { test, expect } from "@playwright/test";
import { createCashAccount, saldoActual } from "./helpers";

// Flujo 1: crear una cuenta de efectivo con saldo inicial y comprobar que su
// detalle y el dashboard la muestran con el saldo formateado ("4 750 CUP").
test("crear cuenta de efectivo con saldo inicial y verla en el dashboard", async ({
  page,
}) => {
  const name = await createCashAccount(page, "Caja E2E", "4750");

  // Tras crearla se aterriza en el detalle, con el saldo inicial ya sumado.
  await expect(saldoActual(page)).toContainText("4 750 CUP");

  await page.goto("/");
  // La tarjeta de la cuenta es un Link cuyo nombre accesible incluye
  // nombre, moneda y saldo.
  const card = page.getByRole("link", { name });
  await expect(card).toBeVisible();
  await expect(card).toContainText("CUP");
  await expect(card).toContainText("4 750 CUP");
});

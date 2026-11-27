import { test, expect } from "@playwright/test";
import { createCashAccount, selectOption, uniqueSuffix } from "./helpers";

// Flujo 4: deuda por cobrar con plan mensual. La primera cuota (vence hoy)
// aparece en "Próximos vencimientos" del dashboard; al cobrarla se registra
// el abono y advancePlan genera la siguiente cuota un mes después. El plan
// se ve además en /mensualidades y la deuda en /deudas (sin filtro).
test("deuda por cobrar con plan mensual: vencimiento en dashboard, cobro de cuota y listados", async ({
  page,
}) => {
  const account = await createCashAccount(page, "Cobros E2E");
  const contact = `Cliente E2E ${uniqueSuffix()}`;
  const description = `Préstamo E2E ${uniqueSuffix()}`;

  // Crear la deuda: /deudas/nueva redirige al drawer «Nueva deuda» de la
  // lista. "Por cobrar" viene por defecto, igual que frecuencia Mensual y
  // primer vencimiento hoy; un nombre de contacto que no existe lo crea.
  await page.goto("/deudas/nueva");
  await page.getByPlaceholder("Nombre del contacto").fill(contact);
  await page.getByLabel("Descripción").fill(description);
  await page.getByLabel("Monto total").fill("3000");
  await selectOption(page, "Moneda", "CUP");
  await page
    .locator("label", { hasText: "Con plan de cuotas" })
    .getByRole("checkbox")
    .check();
  await page.getByLabel("Cuota", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Crear deuda" }).click();
  // (?!nueva) — /deudas/nueva no debe hacer match; se espera /deudas/[id].
  await page.waitForURL(/\/deudas\/(?!nueva)[^/]+$/);
  const debtUrl = page.url();

  // Recién creada: todo pendiente y la cuota de hoy lista para cobrar.
  await expect(
    page.getByText("Abonado 0 CUP de 3 000 CUP (0%)")
  ).toBeVisible();

  // La cuota de hoy aparece en "Próximos vencimientos" del dashboard, con
  // el contacto de la deuda.
  await page.goto("/");
  const upcoming = page.locator("section", {
    has: page.getByRole("heading", { name: "Próximos vencimientos" }),
  });
  const dueRow = upcoming.getByRole("link", { name: description });
  await expect(dueRow).toContainText(contact);
  await expect(dueRow).toContainText("1 000 CUP");
  await expect(dueRow).toContainText("Vence hoy");
  await dueRow.click();
  await page.waitForURL(debtUrl);

  // Cobrar la cuota (el monto ya viene precargado con 1000). La deuda no
  // tiene cuenta vinculada, así que el selector de cuenta está a la vista.
  const cuotas = page.locator("section", {
    has: page.getByRole("heading", { name: "Cuotas pendientes" }),
  });
  await expect(cuotas.getByText("Vence hoy")).toBeVisible();
  await cuotas.getByRole("combobox").click();
  await page.getByRole("option", { name: account }).click();
  await cuotas.getByRole("button", { name: "Cobrar" }).click();

  // Se generó la siguiente cuota mensual (vence en ~1 mes) y la de hoy ya
  // no está pendiente.
  await expect(cuotas.getByText(/En \d+ días/)).toBeVisible();
  await expect(cuotas.getByText("Vence hoy")).toHaveCount(0);
  await expect(cuotas.getByRole("button", { name: "Cobrar" })).toHaveCount(1);

  // El abono quedó registrado: progreso y historial.
  await expect(
    page.getByText("Abonado 1 000 CUP de 3 000 CUP (33%)")
  ).toBeVisible();
  await expect(page.getByText("+1 000 CUP")).toBeVisible();

  // /deudas lista todas las deudas sin filtro: la tarjeta trae el pendiente,
  // el progreso del abono y la próxima cuota.
  await page.goto("/deudas");
  const debtCard = page.getByRole("link", { name: contact });
  await expect(debtCard).toContainText(description);
  await expect(debtCard).toContainText("2 000 CUP");
  await expect(debtCard).toContainText("por cobrar");
  await expect(debtCard).toContainText("Abonado 1 000 CUP de 3 000 CUP (33%)");
  await expect(debtCard).toContainText(/Próxima cuota · En \d+ días/);

  // /mensualidades muestra el plan de la deuda con el nombre del contacto,
  // la frecuencia y la cuota ya saldada; enlaza a su detalle.
  await page.goto("/mensualidades");
  const plan = page.locator("article", { hasText: description });
  await expect(plan).toContainText(contact);
  await expect(plan).toContainText("1 000 CUP");
  await expect(plan).toContainText("Mensual");
  await expect(plan).toContainText("1 saldada");
  await expect(plan).toContainText(/En \d+ días/);
  await plan.getByRole("link", { name: description }).click();
  await page.waitForURL(/\/mensualidades\/[^/]+$/);
});

import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./e2e/helpers";
import { TEST_DATABASE_URL, TEST_DIRECT_URL } from "./e2e/test-db";

// E2E contra el dev server real (puerto 3002) con BD Postgres aislada: la
// misma base de Neon pero en el schema `caja_e2e`, recreado en cada corrida
// por e2e/setup-db.ts.
// reuseExistingServer: false a propósito — un dev server ya levantado
// estaría apuntando al schema real (`caja`) y los tests ensuciarían datos
// reales. Por eso la suite exige el puerto 3002 LIBRE.
const BASE_URL = "http://localhost:3002";

// Zona de la app fijada para la corrida, igual en servidor y navegador: los
// formularios proponen «hoy» con el reloj del navegador y el servidor decide
// «Vence hoy» con el suyo; con zonas distintas el test fallaría de noche.
const TIME_ZONE = "America/Havana";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Un solo worker: los flujos mutan saldos/deudas del mismo usuario sobre
  // la misma BD y el dashboard se comprueba entre medias.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    locale: "es-ES",
    timezoneId: TIME_ZONE,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Registra el usuario de pruebas y guarda la sesión (storageState).
    { name: "setup", testMatch: /auth\.setup\.ts/, use: { channel: "chrome" } },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        // Chrome del sistema: la descarga del Chromium empaquetado está
        // geo-bloqueada (403 en cdn.playwright.dev). Chrome ES Chromium.
        channel: "chrome",
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // La BD se prepara en el propio comando: el webServer arranca ANTES que
    // globalSetup y el health-check de "/" ya necesita la BD lista.
    command: "pnpm exec tsx e2e/setup-db.ts && pnpm dev",
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
    // Las DOS URLs: el runtime usa DATABASE_URL (pooler) y las migraciones
    // DIRECT_URL; si faltara la segunda, `migrate deploy` iría al schema real.
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DIRECT_URL,
      APP_TIME_ZONE: TIME_ZONE,
      // El setup registra su usuario por /auth/registro.
      ALLOW_REGISTRATION: "true",
    },
  },
});

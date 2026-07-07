import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./e2e/helpers";
import { TEST_DATABASE_URL } from "./e2e/test-db";

// E2E contra el dev server real (puerto 3002) con BD SQLite aislada
// (prisma/test.db, recreada en cada corrida por e2e/setup-db.ts).
// reuseExistingServer: false a propósito — un dev server ya levantado
// estaría apuntando a dev.db y los tests ensuciarían datos reales.
const BASE_URL = "http://localhost:3002";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Un solo worker: los flujos mutan saldos/deudas sobre la misma BD SQLite.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    locale: "es-ES",
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
    env: { DATABASE_URL: TEST_DATABASE_URL },
  },
});

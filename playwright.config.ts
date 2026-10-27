import { defineConfig, devices } from "@playwright/test";

// Requiere: pnpm db:start && pnpm db:seed. Usa lvh.me (resuelve a 127.0.0.1 con subdominios).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  use: { baseURL: "http://lvh.me:3000", trace: "retain-on-failure", locale: "es-PE" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "pnpm dev", url: "http://lvh.me:3000/login", reuseExistingServer: true, timeout: 120_000 },
});

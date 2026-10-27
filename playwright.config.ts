import { defineConfig, devices } from "@playwright/test";

// Requiere: pnpm db:start && pnpm db:seed. Usa lvh.me (resuelve a 127.0.0.1 con subdominios).
// En worktrees paralelos usa otro puerto: E2E_PORT=3001 (y APP_BASE_DOMAIN=lvh.me:3001 en .env).
const PORT = process.env.E2E_PORT ?? "3000";
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1, // comparten BD y sesiones demo: en paralelo el login se vuelve intermitente
  use: { baseURL: `http://lvh.me:${PORT}`, trace: "retain-on-failure", locale: "es-PE" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: `pnpm dev --port ${PORT}`, url: `http://lvh.me:${PORT}/login`, reuseExistingServer: true, timeout: 120_000 },
});

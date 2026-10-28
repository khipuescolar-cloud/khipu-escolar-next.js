import { expect, test } from "@playwright/test";

// App instalable (specs/24). Solo lectura: no cambia datos demo.
const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
// http://lvh.me no es contexto seguro (el navegador no registra service workers); localhost sí.
const SEGURO = `http://localhost:${PUERTO}`;

test("el manifiesto trae íconos maskable, atajos y capturas en la raíz y en cada colegio", async ({ request }) => {
  for (const base of ["", COLEGIO]) {
    const r = await request.get(`${base}/manifest.webmanifest`);
    expect(r.ok()).toBe(true);
    const m = await r.json();
    expect(m.short_name).toBe("Khipu");
    const maskable = m.icons.filter((i: { purpose?: string }) => i.purpose === "maskable");
    expect(maskable.map((i: { sizes: string }) => i.sizes)).toEqual(["192x192", "512x512"]);
    expect(m.shortcuts.map((s: { name: string }) => s.name)).toContain("Pasar lista");
    for (const src of [maskable[1].src, m.shortcuts[0].icons[0].src, m.screenshots[0].src]) {
      const img = await request.get(`${base}${src}`);
      expect(img.ok(), src).toBe(true);
      expect(img.headers()["content-type"]).toContain("image/png");
    }
  }
});

test("sw.js y assetlinks.json se sirven sin sesión", async ({ request }) => {
  const sw = await request.get(`${COLEGIO}/sw.js`);
  expect(sw.ok()).toBe(true);
  expect(await sw.text()).toContain("ACTUALIZAR");
  const enlaces = await request.get(`${COLEGIO}/.well-known/assetlinks.json`);
  expect(enlaces.ok()).toBe(true);
  expect(Array.isArray(await enlaces.json())).toBe(true);
});

test("/instalar y /sin-conexion cargan sin sesión en la raíz y en el colegio", async ({ page }) => {
  for (const base of ["", COLEGIO]) {
    await page.goto(`${base}/instalar`);
    await expect(page.getByRole("heading", { name: "Lleva el colegio en tu celular" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /iPhone y iPad/ })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/instalar");
    await page.goto(`${base}/sin-conexion`);
    await expect(page.getByRole("heading", { name: "No hay conexión" })).toBeVisible();
  }
});

test("en iPhone la página de instalar muestra los pasos de Safari", async ({ browser }) => {
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    viewport: { width: 390, height: 844 },
  });
  const page = await ctx.newPage();
  await page.goto(`${COLEGIO}/instalar`);
  // Safari no ofrece el botón: se ven los pasos de iPhone (sin botón «Instalar app»).
  await expect(page.getByTestId("pasos-ios")).toBeVisible();
  await expect(page.getByTestId("boton-instalar")).toHaveCount(0);
  await ctx.close();
});

test("con service worker, una página sin red muestra «No hay conexión»", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${SEGURO}/instalar`);
  // Espera a que el service worker esté activo y el cascarón precacheado.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    for (let i = 0; i < 50 && !(await caches.match("/sin-conexion")); i++) await new Promise((r) => setTimeout(r, 100));
  });
  await page.reload(); // ahora la página queda controlada por el service worker
  await ctx.setOffline(true);
  await page.goto(`${SEGURO}/login`);
  await expect(page.getByRole("heading", { name: "No hay conexión" })).toBeVisible();
  await expect(page.getByText("Lo que guardaste se enviará al volver la señal.")).toBeVisible();
  await ctx.setOffline(false);
  await ctx.close();
});

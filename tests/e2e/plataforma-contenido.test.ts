import { expect, test } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `lvh.me:${PUERTO}`;

test("revisión editorial en móvil cabe a 360 px y muestra estados accesibles", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/login");
  await page.getByLabel("Correo").fill("admin@khipuescolar.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`http://admin.${BASE}/`);
  await page.goto(`http://admin.${BASE}/contenido`);

  await expect(page.getByRole("heading", { name: "Revisión de contenido" })).toBeVisible();
  await expect(page.getByLabel("Área")).toBeVisible();
  await expect(page.getByLabel("Grado")).toBeVisible();
  await expect(page.getByLabel("Disciplina")).toBeVisible();
  await expect(page.getByLabel("Estado")).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

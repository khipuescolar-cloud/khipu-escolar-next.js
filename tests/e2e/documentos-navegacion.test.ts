import { expect, test } from "@playwright/test";

const puerto = process.env.E2E_PORT ?? "3000";
const colegio = `http://nuevohorizonte.lvh.me:${puerto}`;
const carpetaCapturas = "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad";

async function entrar(page: import("@playwright/test").Page, correo: string) {
  await page.goto(`${colegio}/login`);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio/);
}

test("dirección ve ocho secciones y Biblioteca responde en escritorio y móvil", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(`${colegio}/documentos?seccion=biblioteca`);
  const nav = page.getByRole("navigation", { name: "Secciones de documentos" });
  await expect(nav.getByRole("link")).toHaveCount(8);
  await expect(nav.getByRole("link", { name: "Biblioteca del colegio" })).toHaveAttribute("aria-current", "page");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${carpetaCapturas}/w4-biblioteca-1440.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Nuevo", exact: true })).toBeVisible();
  await page.screenshot({ path: `${carpetaCapturas}/w4-biblioteca-390.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("profesor ve sus secciones y familia no entra en Gestión académica", async ({ browser }) => {
  const profesor = await browser.newPage();
  await entrar(profesor, "lucia.garcia@nuevohorizonte.demo");
  await profesor.goto(`${colegio}/documentos?seccion=borradores`);
  await expect(profesor.getByRole("navigation", { name: "Secciones de documentos" }).getByRole("link")).toHaveCount(8);
  await expect(profesor.getByText("Espacio de mis borradores")).toBeVisible();
  const familia = await browser.newPage();
  await entrar(familia, "rosa.quispe@gmail.com");
  await familia.goto(`${colegio}/documentos?seccion=biblioteca`);
  const nav = familia.getByRole("navigation", { name: "Secciones de documentos" });
  await expect(nav.getByRole("link")).toHaveCount(5);
  await expect(nav.getByRole("link", { name: "Gestión académica" })).toHaveCount(0);
  await familia.goto(`${colegio}/documentos?seccion=gestion`);
  await expect(familia.getByText(/403|Forbidden|acceso/i).first()).toBeVisible();
});

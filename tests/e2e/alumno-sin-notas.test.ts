import { expect, test, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";

// El alumno no ve sus notas ni su libreta en Khipu (specs/11): las conoce en clase y las ve su familia.
const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/elegir-colegio|\/inicio/);
  if (page.url().includes("elegir-colegio")) await page.getByRole("link", { name: /Nuevo Horizonte/ }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
}

test("el alumno no tiene Registro de notas ni Libreta; la familia sí", async ({ page, context }) => {
  await entrar(page, "lucas.huaman@nuevohorizonte.demo");
  const menu = page.locator('[data-slot="sidebar"]');
  await expect(menu.getByRole("link", { name: "Agenda" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Registro de notas" })).toHaveCount(0);
  await expect(menu.getByRole("link", { name: "Libreta" })).toHaveCount(0);
  await esperarSinAcceso(page, await page.goto(`${COLEGIO}/notas`));
  await esperarSinAcceso(page, await page.goto(`${COLEGIO}/libreta`));

  await context.clearCookies();
  await entrar(page, "familia.huaman@familia.demo");
  await expect(menu.getByRole("link", { name: "Registro de notas" })).toBeVisible();
  await expect(menu.getByRole("link", { name: "Libreta" })).toBeVisible();
});

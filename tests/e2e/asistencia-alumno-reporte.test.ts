import { expect, test, type Page } from "@playwright/test";

// Asistencia del alumno (specs/27): «Mi asistencia» junta la llegada al colegio y el reporte, al colegio y por curso.
// La familia ve el reporte por curso en «Reporte de asistencia».
const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
}

test("el alumno ve su llegada al colegio y su reporte al colegio y por curso en una sola página", async ({ page }) => {
  await entrar(page, "lucas.huaman@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/asistencia`);
  await expect(page.getByRole("heading", { name: /Llegada al colegio/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reporte de asistencia" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Al colegio" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("columnheader", { name: "Justificación" })).toBeVisible();
  await page.getByRole("link", { name: "Por curso" }).click();
  await expect(page.getByRole("link", { name: "Por curso" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("columnheader", { name: "% asistencia" })).toBeVisible();
  // Ya no tiene una entrada aparte: el enlace viejo lleva a su página.
  await page.goto(`${COLEGIO}/asistencia/reportes`);
  await expect(page).toHaveURL(new RegExp(`${COLEGIO}/asistencia(\\?|#|$)`));
});

test("la apoderada ve el reporte por curso de su hijo", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com");
  await page.goto(`${COLEGIO}/asistencia/reportes?vista=cursos`);
  await expect(page.getByRole("link", { name: "Por curso" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("columnheader", { name: "% asistencia" })).toBeVisible();
});

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

test("el alumno ve su resumen, sus llegadas y el historial de cada curso", async ({ page }) => {
  await entrar(page, "lucas.huaman@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/asistencia`);
  await expect(page.getByRole("heading", { name: "Mi asistencia", level: 1 })).toBeVisible();
  const vistas = page.getByRole("navigation", { name: "Vistas de asistencia" });
  await expect(vistas.getByRole("link", { name: "Resumen" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: /Llegaste al colegio \d+ de \d+ días|Aún no hay asistencia/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Para revisar" })).toBeVisible();

  // Periodo: «Año» desde el inicio de clases.
  await page.getByRole("navigation", { name: "Periodo" }).getByRole("link", { name: "Año" }).click();
  await expect(page.getByRole("navigation", { name: "Periodo" }).getByRole("link", { name: "Año" })).toHaveAttribute("aria-current", "page");

  await vistas.getByRole("link", { name: "Llegadas" }).click();
  await expect(page.getByRole("heading", { name: /Tus llegadas de/ })).toBeVisible();

  await vistas.getByRole("link", { name: "Cursos" }).click();
  await expect(page.getByRole("heading", { name: "Tu asistencia en cada curso" })).toBeVisible();
  await page.getByRole("link", { name: /Arte y Cultura/ }).click();
  await expect(page.getByRole("heading", { name: "Arte y Cultura", level: 1 })).toBeVisible();
  await expect(page.getByText("Desde el inicio de clases")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Estuviste en \d+ de \d+ clases/ })).toBeVisible();
  await page.getByRole("link", { name: "Todos los cursos" }).first().click();
  await expect(page.getByRole("heading", { name: "Tu asistencia en cada curso" })).toBeVisible();

  // Enlaces viejos del reporte llevan a su página.
  await page.goto(`${COLEGIO}/asistencia/reportes?vista=cursos`);
  await expect(page).toHaveURL(/\/asistencia\?tab=cursos/);
});

test("la apoderada ve el reporte por curso de su hijo", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com");
  await page.goto(`${COLEGIO}/asistencia/reportes?tab=cursos`);
  await expect(page.getByRole("navigation", { name: "Vistas de asistencia" }).getByRole("link", { name: "Cursos" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: /Asistencia de \S+ en cada curso/ })).toBeVisible();
});

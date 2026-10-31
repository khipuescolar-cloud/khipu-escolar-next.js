import { expect, test } from "@playwright/test";
import { diaHabilAnterior } from "./ayudantes/datos-demo";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

// Rango con listas de curso del seed (días hábiles anteriores a hoy).
const DESDE = diaHabilAnterior(10);
const HASTA = diaHabilAnterior(1);

async function entrar(page: import("@playwright/test").Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
}

test("la tutora ve su salón con el gráfico de 7 días y descarga el historial de un curso", async ({ page }) => {
  test.setTimeout(90_000);
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/asistencia/reportes`);
  // Solo «Reportes de asistencia» queda marcado en la barra lateral (no también «Pasar lista»).
  await expect(page.getByRole("link", { name: "Reportes de asistencia" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Pasar lista", exact: true }).first()).not.toHaveAttribute("aria-current", "page");

  await expect(page.getByRole("heading", { name: "Mi salón de tutoría · 3.° B" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asistencia por día" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mis cursos" })).toBeVisible();

  await page.getByRole("link", { name: /Matemática\s*3\.° B/ }).click();
  await expect(page.getByRole("heading", { name: "Matemática · 3.° B" })).toBeVisible();
  await page.getByLabel("Desde").fill(DESDE);
  await page.getByLabel("Hasta").fill(HASTA);
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(new RegExp(`desde=${DESDE}&hasta=${HASTA}`));
  await expect(page.getByRole("heading", { name: "Alumnos por clase" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Quispe Huamán, Mateo/ })).toBeVisible();

  // El enlace es relativo al subdominio del colegio; `page.request` resuelve contra el dominio base.
  const excel = await page.request.get(`${COLEGIO}${await page.getByRole("link", { name: "Descargar Excel" }).getAttribute("href")}`);
  expect(excel.status()).toBe(200);
  expect(excel.headers()["content-type"]).toContain("spreadsheetml");
  expect(excel.headers()["content-disposition"]).toContain("asistencia-matematica-3-b");
  const pdf = await page.request.get(`${COLEGIO}${await page.getByRole("link", { name: "Descargar PDF" }).getAttribute("href")}`);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
});

test("un profesor no ve el historial de un curso que no dicta ni de un salón que no tutorea", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/asistencia/reportes`);
  const matematica = await page.getByRole("link", { name: /Matemática\s*3\.° B/ }).getAttribute("href");
  const cursoId = matematica!.split("/").pop()!;
  await page.context().clearCookies();
  // Pedro dicta Ciencia en 3.° B, pero no Matemática ni es tutor de 3.° B.
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  const r = await page.request.get(`${COLEGIO}/api/reportes-asistencia/excel?curso=${cursoId}&desde=${DESDE}&hasta=${HASTA}`);
  expect(r.status()).toBe(403);
});

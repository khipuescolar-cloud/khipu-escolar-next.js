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

test("filtro «Curso»: fuera de su tutoría el profesor solo ve sus cursos; en su tutoría, la asistencia al colegio", async ({ page }) => {
  test.setTimeout(90_000);
  // Pedro es tutor de 5.° A y dicta Ciencia y Tecnología en 3.° B, 5.° B y 6.° A.
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/asistencia/reportes`);
  await page.getByRole("button", { name: "Filtrar reporte" }).click();
  const panel = page.getByRole("dialog", { name: "Filtrar reporte" });
  const salon = panel.getByRole("combobox", { name: "Salón", exact: true });
  // Solo los salones donde enseña o es tutor.
  await expect(salon.locator("option")).toHaveText(["Todos los salones", "3.° B", "5.° A", "5.° B", "6.° A"]);
  const curso = panel.getByRole("combobox", { name: "Curso", exact: true });
  await expect(curso).toHaveValue("mis");

  // Con un grado, el salón solo lista las secciones de ese grado.
  const grado = panel.getByRole("combobox", { name: "Grado", exact: true });
  await grado.selectOption({ label: "3.° grado de primaria" });
  await expect(salon.locator("option")).toHaveText(["Todos los salones del grado", "3.° B"]);
  await salon.selectOption({ label: "3.° B" });
  await expect(grado).toHaveValue("primaria-3");
  await expect(curso.locator("option")).toHaveText(["Mis cursos", "Ciencia y Tecnología"]);
  await page.getByRole("button", { name: "Ver reporte" }).click();
  await expect(page).toHaveURL(/curso=mis/);
  await expect(page.getByRole("heading", { name: "Salón 3.° B" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Ciencia y Tecnología/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Matemática/ })).toHaveCount(0);
  // No ve la asistencia al colegio de 3.° B ni la descarga.
  await expect(page.getByRole("link", { name: "Descargar Excel" })).toHaveCount(0);

  // En su tutoría: asistencia al colegio por defecto y todos los cursos del salón.
  await page.getByRole("button", { name: "Filtrar reporte" }).click();
  await grado.selectOption({ label: "Todos los grados" });
  await salon.selectOption({ label: "5.° A" });
  await expect(grado).toHaveValue("primaria-5");
  await expect(curso).toHaveValue("");
  await expect(curso.locator("option").first()).toHaveText("Asistencia al colegio");
  await expect(curso.locator("option").nth(1)).toHaveText("Todos los cursos");
  expect(await curso.locator("option").count()).toBeGreaterThan(3);
  await page.getByRole("button", { name: "Ver reporte" }).click();
  await expect(page.getByRole("heading", { name: "Salón 5.° A" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Descargar Excel" })).toBeVisible();
});

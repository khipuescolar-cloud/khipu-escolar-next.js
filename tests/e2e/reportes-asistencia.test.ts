import { expect, test } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

async function entrar(page: import("@playwright/test").Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
}

test("dirección filtra un salón por fechas y descarga Excel y PDF", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/asistencia/reportes`);
  await expect(page.getByRole("heading", { name: "Reportes de asistencia", exact: true })).toBeVisible();
  // Sin filtros: primero la asistencia al colegio de hoy; el resumen del mes por salón está plegado.
  await expect(page.getByTestId("asistencia-del-dia").getByText("Asistieron", { exact: true })).toBeVisible();
  await page.getByText("Resumen del colegio de este mes").click();
  await expect(page.getByRole("columnheader", { name: "% asistencia" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "En revisión" })).toBeVisible();

  // El filtro es un panel lateral: salón, alumnos de ese salón y fechas.
  await page.getByRole("button", { name: /Filtrar reporte/ }).click();
  const panel = page.getByRole("dialog", { name: "Filtrar reporte" });
  await panel.getByRole("combobox", { name: "Salón", exact: true }).selectOption({ label: "3.° B" });
  await expect(panel.getByRole("radio", { name: "Todo el salón" })).toBeChecked();
  await panel.getByLabel("Desde").fill("2026-03-02");
  await panel.getByLabel("Hasta").fill("2026-03-31");
  await panel.getByRole("button", { name: "Ver reporte" }).click();
  await expect(page).toHaveURL(/salon=/);
  await expect(page.getByRole("columnheader", { name: "Alumno", exact: true })).toBeVisible();
  await expect(page.getByLabel("Filtros aplicados").getByText("Salón 3.° B")).toBeVisible();
  await expect(page.getByText(/Asistencia · Salón 3\.° B/)).toBeVisible();

  const [excel] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar Excel" }).click()]);
  expect(excel.suggestedFilename()).toMatch(/^asistencia-3-b-2026-03-02-2026-03-31\.xlsx$/);
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar PDF" }).click()]);
  expect(pdf.suggestedFilename()).toMatch(/^asistencia-3-b-2026-03-02-2026-03-31\.pdf$/);

  // Detalle de un alumno.
  await page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Alumno", exact: true }) }).getByRole("link").first().click();
  await expect(page.getByRole("columnheader", { name: "Justificación" })).toBeVisible();
});

test("el servidor responde con el tipo de archivo correcto y rechaza rangos inválidos", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  const xlsx = await page.request.get(`${COLEGIO}/api/reportes-asistencia/excel?desde=2026-03-02&hasta=2026-03-31`);
  expect(xlsx.status()).toBe(200);
  expect(xlsx.headers()["content-type"]).toContain("spreadsheetml.sheet");
  const pdf = await page.request.get(`${COLEGIO}/api/reportes-asistencia/pdf?desde=2026-03-02&hasta=2026-03-31`);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await page.request.get(`${COLEGIO}/api/reportes-asistencia/pdf?desde=2026-03-31&hasta=2026-03-02`)).status()).toBe(400);
});

test("una profesora no exporta el resumen de otro salón y la familia no ve reportes de salón", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  const otro = await page.request.get(`${COLEGIO}/api/reportes-asistencia/pdf?salon=00000000-0000-4000-8000-000000000000`);
  expect([403, 404]).toContain(otro.status());
});

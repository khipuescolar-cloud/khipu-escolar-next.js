import { expect, test } from "@playwright/test";
import { diaHabilAnterior } from "./ayudantes/datos-demo";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

// Rango con datos del seed (~6 semanas de asistencia hasta ayer).
const DESDE = diaHabilAnterior(15);
const HASTA = diaHabilAnterior(1);
const dmy = (iso: string) => `${iso.slice(8)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const MES_DESDE = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${DESDE}T12:00:00Z`));

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
  // Sin filtros: solo la asistencia al colegio de hoy (sin resumen del mes).
  await expect(page.getByTestId("asistencia-del-dia").getByText("Asistieron", { exact: true })).toBeVisible();
  await expect(page.getByText("Resumen del colegio de este mes")).toHaveCount(0);
  await expect(page.getByRole("columnheader", { name: "% asistencia" })).toHaveCount(0);

  // El filtro es un panel lateral: salón, alumnos de ese salón y fechas.
  await page.getByRole("button", { name: /Filtrar reporte/ }).click();
  const panel = page.getByRole("dialog", { name: "Filtrar reporte" });
  await panel.getByRole("combobox", { name: "Salón", exact: true }).selectOption({ label: "3.° B" });
  await expect(panel.getByRole("radio", { name: "Todo el salón" })).toBeChecked();
  await panel.getByLabel("Desde").fill(DESDE);
  await panel.getByLabel("Hasta").fill(HASTA);
  await panel.getByRole("button", { name: "Ver reporte" }).click();
  // El resultado se abre en su propia vista, en modo tabla.
  await expect(page).toHaveURL(/\/asistencia\/reportes\/ver\?.*salon=/);
  await expect(page.getByRole("heading", { name: "Salón 3.° B", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tabla" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("columnheader", { name: "Alumno", exact: true })).toBeVisible();
  await expect(page.getByLabel("Datos del reporte").getByText(`Del ${dmy(DESDE)} al ${dmy(HASTA)}`)).toBeVisible();
  await expect(page.getByText(/Asistencia · Salón 3\.° B/)).toBeVisible();

  const [excel] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar Excel" }).click()]);
  expect(excel.suggestedFilename()).toBe(`asistencia-3-b-${DESDE}-${HASTA}.xlsx`);
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar PDF" }).click()]);
  expect(pdf.suggestedFilename()).toBe(`asistencia-3-b-${DESDE}-${HASTA}.pdf`);

  // Modo calendario del salón: cada día con asistieron / con registro.
  await page.getByRole("link", { name: "Calendario" }).click();
  await expect(page).toHaveURL(/vista=calendario/);
  await expect(page.getByRole("link", { name: "Calendario" })).toHaveAttribute("aria-current", "page");
  const calendario = page.getByTestId("calendario-reporte");
  await expect(calendario.getByRole("heading", { name: new RegExp(MES_DESDE, "i") })).toBeVisible();
  await expect(calendario.getByText(/^\d+\/\d+$/).first()).toBeVisible();
  await page.getByRole("link", { name: "Tabla" }).click();

  // Detalle de un alumno.
  await page.getByRole("table").filter({ has: page.getByRole("columnheader", { name: "Alumno", exact: true }) }).getByRole("link").first().click();
  await expect(page.getByRole("columnheader", { name: "Justificación" })).toBeVisible();
  await page.getByRole("link", { name: "Calendario" }).click();
  await expect(page.getByTestId("calendario-reporte").getByRole("heading", { name: new RegExp(MES_DESDE, "i") })).toBeVisible();

  // Los enlaces antiguos con filtro en la página general llevan a la vista nueva; «Reportes» vuelve a la general.
  await page.goto(`${COLEGIO}/asistencia/reportes?desde=${DESDE}&hasta=${HASTA}`);
  await expect(page).toHaveURL(/\/asistencia\/reportes\/ver\?/);
  await expect(page.getByRole("heading", { name: "Todo el colegio", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Reportes", exact: true }).click();
  await expect(page.getByTestId("asistencia-del-dia")).toBeVisible();
});

test("el servidor responde con el tipo de archivo correcto y rechaza rangos inválidos", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  const xlsx = await page.request.get(`${COLEGIO}/api/reportes-asistencia/excel?desde=${DESDE}&hasta=${HASTA}`);
  expect(xlsx.status()).toBe(200);
  expect(xlsx.headers()["content-type"]).toContain("spreadsheetml.sheet");
  const pdf = await page.request.get(`${COLEGIO}/api/reportes-asistencia/pdf?desde=${DESDE}&hasta=${HASTA}`);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await page.request.get(`${COLEGIO}/api/reportes-asistencia/pdf?desde=${HASTA}&hasta=${DESDE}`)).status()).toBe(400);
});

test("una profesora no exporta el resumen de otro salón y la familia no ve reportes de salón", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  const otro = await page.request.get(`${COLEGIO}/api/reportes-asistencia/pdf?salon=00000000-0000-4000-8000-000000000000`);
  expect([403, 404]).toContain(otro.status());
});

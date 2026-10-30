import { expect, test } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const BASE = `http://losolivos.lvh.me:${PUERTO}`;

async function entrar(page: import("@playwright/test").Page, correo: string, colegio = COLEGIO) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${colegio}/inicio`);
}

test("dirección abre el tablero desde el inicio, cambia de periodo y ve los indicadores", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.getByRole("link", { name: /Tablero/ }).first().click();
  await expect(page).toHaveURL(`${COLEGIO}/tablero`);
  await expect(page.getByRole("heading", { name: "Tablero de dirección", exact: true })).toBeVisible();
  await expect(page.getByTestId("kpi-asistencia")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rendimiento académico" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avance de registro de notas" })).toBeVisible();
  await expect(page.getByTestId("resumen-avisos")).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Periodo del tablero" });
  await expect(nav.getByRole("link", { name: "Mes actual" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Año" }).click();
  await expect(page).toHaveURL(/p=anio/);
  await expect(nav.getByRole("link", { name: "Año" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "III Bimestre" }).click();
  await expect(page).toHaveURL(/p=[0-9a-f-]{36}/);
  await expect(page.getByRole("heading", { name: "Tablero de dirección", exact: true })).toBeVisible();

  // Umbral de ausentismo configurable.
  await page.getByLabel("Asistencia menor a (%)").fill("95");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page).toHaveURL(/umbral=95/);
  await expect(page.getByTestId("ausentismo-cronico")).toBeVisible();
});

test("dirección descarga el consolidado de notas en Excel y PDF", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/tablero/consolidado`);
  await expect(page.getByRole("heading", { name: "Consolidado de notas", exact: true })).toBeVisible();
  await page.getByRole("combobox", { name: "Salón", exact: true }).selectOption({ label: "3.° B" });
  await page.getByRole("combobox", { name: "Periodo", exact: true }).selectOption({ label: "III Bimestre" });
  await page.getByRole("button", { name: "Ver consolidado" }).click();
  await expect(page).toHaveURL(/salon=.*periodo=/);
  await expect(page.getByRole("columnheader", { name: "En riesgo" })).toBeVisible();

  const [excel] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar Excel" }).click()]);
  expect(excel.suggestedFilename()).toBe("consolidado-notas-3-b-iii-bimestre.xlsx");
  const [pdf] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Descargar PDF" }).click()]);
  expect(pdf.suggestedFilename()).toBe("consolidado-notas-3-b-iii-bimestre.pdf");
});

test("el servidor valida el consolidado: tipos correctos, 400 sin filtros válidos y 403 para otros roles", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/tablero/consolidado`);
  const opcion = async (nombre: string) => page.getByRole("combobox", { name: nombre, exact: true }).locator("option:not([disabled])").first().getAttribute("value");
  const q = `salon=${await opcion("Salón")}&periodo=${await opcion("Periodo")}`;
  const xlsx = await page.request.get(`${COLEGIO}/api/tablero/consolidado/excel?${q}`);
  expect(xlsx.status()).toBe(200);
  expect(xlsx.headers()["content-type"]).toContain("spreadsheetml.sheet");
  const pdf = await page.request.get(`${COLEGIO}/api/tablero/consolidado/pdf?${q}`);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  expect((await page.request.get(`${COLEGIO}/api/tablero/consolidado/pdf?salon=x&periodo=y`)).status()).toBe(400);
});

test("una profesora no entra al tablero ni descarga el consolidado", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await esperarSinAcceso(page, await page.goto(`${COLEGIO}/tablero`));
  await expect(page.getByTestId("kpi-asistencia")).toHaveCount(0);
  const r = await page.request.get(`${COLEGIO}/api/tablero/consolidado/excel?salon=00000000-0000-4000-8000-000000000000&periodo=00000000-0000-4000-8000-000000000000`);
  expect(r.status()).toBe(403);
});

test("en Khipu Base el inicio muestra el candado y el tablero responde 403", async ({ page }) => {
  await entrar(page, "direccion@losolivos.demo", BASE);
  const mosaico = page.getByRole("main").locator("li", { hasText: "Asistencia, notas y avisos del colegio" });
  await expect(mosaico).toContainText("Khipu Pro");
  await esperarSinAcceso(page, await page.goto(`${BASE}/tablero`));
  expect((await page.request.get(`${BASE}/api/tablero/consolidado/pdf`)).status()).toBe(403);
});

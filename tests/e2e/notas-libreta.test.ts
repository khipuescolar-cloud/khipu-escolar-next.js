import { expect, test, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (slug: string, ruta: string) => `http://${slug}.lvh.me:${PUERTO}${ruta}`;

async function entrar(page: Page, correo: string, slug: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(correo === "rosa.quispe@gmail.com" ? "**/elegir-colegio" : colegio(slug, "/inicio"));
}

test("profesor de la academia (vigesimal) registra una nota de 0 a 20", async ({ page }) => {
  await entrar(page, "jorge.ramos@academiaeuler.demo", "academiaeuler");
  await page.goto(colegio("academiaeuler", "/notas"));
  await expect(page.getByRole("heading", { name: "Notas" })).toBeVisible();
  const celda = page.getByLabel("Nota de Franco en Simulacro 1");
  await celda.fill("13");
  await celda.blur();
  await expect(page.getByText("Guardado").first()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nota de Franco en Simulacro 1")).toHaveValue("13");
  // Una nota fuera de rango se rechaza con un mensaje claro.
  await page.getByLabel("Nota de Franco en Simulacro 1").fill("25");
  await page.getByLabel("Nota de Franco en Simulacro 1").blur();
  await expect(page.getByText("Escribe una nota entre 0 y 20.")).toBeVisible();
  // Restaura el valor original del seed (9).
  await page.getByLabel("Nota de Franco en Simulacro 1").fill("9");
  await page.getByLabel("Nota de Franco en Simulacro 1").blur();
  await expect(page.getByText("Guardado").first()).toBeVisible();
});

test("apoderada descarga la libreta en PDF de su hijo", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com", "nuevohorizonte");
  await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  await page.waitForURL(colegio("nuevohorizonte", "/inicio"));
  await page.goto(colegio("nuevohorizonte", "/libreta"));
  await expect(page.getByRole("heading", { name: "Libreta" })).toBeVisible();
  await expect(page.getByText("Quispe Huamán, Mateo")).toBeVisible();
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar PDF" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^libreta-quispe-huaman-mateo.*\.pdf$/);
  const ruta = await archivo.path();
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(ruta).subarray(0, 5).toString()).toBe("%PDF-");
});

test("apoderada ve las notas de su hijo sin comparaciones", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com", "nuevohorizonte");
  await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  await page.waitForURL(colegio("nuevohorizonte", "/inicio"));
  await page.goto(colegio("nuevohorizonte", "/notas"));
  await expect(page.getByRole("heading", { name: "Matemática" })).toBeVisible();
  await expect(page.getByText(/promedio del salón|ranking|puesto/i)).toHaveCount(0);
});

test("dirección del plan Básico recibe 403 en /notas", async ({ page }) => {
  await entrar(page, "direccion@losolivos.demo", "losolivos");
  const respuesta = await page.goto(colegio("losolivos", "/notas"));
  expect(respuesta?.status()).toBe(403);
  await expect(page.getByText("No tienes acceso a esta sección")).toBeVisible();
});

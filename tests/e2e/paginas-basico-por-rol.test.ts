import { expect, test, type Page } from "@playwright/test";

// Las páginas del plan Básico cargan para cada rol (specs/04, 05, 06, 07). Solo lectura: no cambia datos demo.
const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("dirección ve el resumen del día, carnets, portería, justificaciones y avisos", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/asistencia`);
  await expect(page.getByRole("heading", { name: "Asistencia del día en el colegio" })).toBeVisible();
  await page.goto(`${COLEGIO}/gestion/carnets`);
  await expect(page.getByRole("heading", { name: "Carnets con QR" })).toBeVisible();
  await expect(page.getByText("3.° B")).toBeVisible();
  await page.goto(`${COLEGIO}/porteria`);
  await expect(page.getByRole("button", { name: "Encender cámara" })).toBeVisible();
  await page.getByPlaceholder("Nombre, apellido o código").fill("Quispe");
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("Mateo Quispe Huamán")).toBeVisible();
  await page.goto(`${COLEGIO}/justificaciones`);
  await expect(page.getByRole("heading", { name: "Justificaciones" })).toBeVisible();
  await page.goto(`${COLEGIO}/avisos`);
  await expect(page.getByRole("heading", { name: "Avisos enviados" })).toBeVisible();
});

test("la familia ve la asistencia de su hijo y sus preferencias de aviso", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com");
  await page.waitForURL("**/elegir-colegio");
  await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/asistencia`);
  await expect(page.getByRole("heading", { name: /Mateo Quispe Huamán/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tus avisos" })).toBeVisible();
  await expect(page.getByLabel("Recibir avisos por correo")).toBeVisible();
});

test("portería no puede entrar a pasar lista", async ({ page }) => {
  await entrar(page, "porteria@nuevohorizonte.demo");
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/asistencia`);
  await expect(page.getByRole("heading", { name: "No tienes acceso a esta sección" })).toBeVisible();
});

test("el QR abierto sin sesión no muestra datos del alumno", async ({ page }) => {
  await page.goto(`/q/${"A".repeat(43)}`);
  await expect(page.getByRole("heading", { name: "Carnet escolar de Khipu" })).toBeVisible();
});

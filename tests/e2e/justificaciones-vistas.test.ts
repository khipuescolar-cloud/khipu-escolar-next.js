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

// specs/07: una sola vista para quien revisa (tabla con filtros, pendientes primero) y el detalle en un panel.
test("dirección filtra la tabla y abre el detalle de una pendiente en un panel", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/justificaciones`);
  await expect(page.getByRole("navigation", { name: "Vistas de justificaciones" })).toHaveCount(0);
  await expect(page.getByLabel("Alumno")).toBeVisible();

  // «Revisar» abre el panel con el detalle y la decisión, sin salir de la tabla.
  await page.getByRole("button", { name: /^Revisar la justificación de/ }).first().click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByText("Motivo", { exact: true })).toBeVisible();
  await expect(panel.getByText("Enviada por")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Aceptar" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "Rechazar" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);

  await page.getByLabel("Estado").selectOption("aceptada");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/estado=aceptada/);
  // Todas las filas visibles están aceptadas (o no hay ninguna).
  await expect(page.getByRole("table").getByText("Pendiente", { exact: true })).toHaveCount(0);

  await page.getByLabel("Alumno").fill("zzzz-nadie");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByText("Ninguna justificación coincide")).toBeVisible();
  await page.getByRole("link", { name: "Limpiar" }).click();
  await expect(page).toHaveURL(/\/justificaciones$/);
});

test("la familia ve solo su lista, sin pestañas", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("rosa.quispe@gmail.com");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/justificaciones`);
  await expect(page.getByRole("heading", { name: "Justificaciones", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Vistas de justificaciones" })).toHaveCount(0);
});

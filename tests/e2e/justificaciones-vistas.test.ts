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

// specs/07: dos vistas para quien revisa — «Por revisar» (bandeja) e «Historial» (tabla con filtros).
test("dirección pasa de «Por revisar» al historial y filtra por estado y alumno", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/justificaciones`);
  const vistas = page.getByRole("navigation", { name: "Vistas de justificaciones" });
  await expect(vistas.getByRole("link", { name: /Por revisar/ })).toHaveAttribute("aria-current", "page");

  await vistas.getByRole("link", { name: "Historial" }).click();
  await expect(page).toHaveURL(/vista=historial/);
  await expect(vistas.getByRole("link", { name: "Historial" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByLabel("Alumno")).toBeVisible();

  await page.getByLabel("Estado").selectOption("aceptada");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/estado=aceptada/);
  // Todas las filas visibles están aceptadas (o no hay ninguna).
  await expect(page.getByRole("table").getByText("Pendiente", { exact: true })).toHaveCount(0);

  await page.getByLabel("Alumno").fill("zzzz-nadie");
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByText("Ninguna justificación coincide")).toBeVisible();
  await page.getByRole("link", { name: "Limpiar" }).click();
  await expect(page).toHaveURL(/\/justificaciones\?vista=historial$/);
});

test("la familia ve solo su lista, sin pestañas", async ({ page }) => {
  // Rosa tiene hijos en dos colegios: elige Nuevo Horizonte.
  await page.goto("/login");
  await page.getByLabel("Correo").fill("rosa.quispe@gmail.com");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/elegir-colegio");
  await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/justificaciones`);
  await expect(page.getByRole("heading", { name: "Justificaciones", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Vistas de justificaciones" })).toHaveCount(0);
});

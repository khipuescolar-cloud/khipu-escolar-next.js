import { expect, test, type Page } from "@playwright/test";

const puerto = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) =>
  `http://nuevohorizonte.lvh.me:${puerto}${ruta}`;
const marca = Date.now().toString(36);

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("direccion@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("/inicio"));
}

test("crear, ver y anular un permiso desde los drawers", async ({ page }) => {
  await entrar(page);
  await page.goto(colegio("/permisos"));
  await page.getByRole("button", { name: "Nuevo permiso" }).click();
  const hoja = page.getByRole("dialog");
  await expect(
    hoja.getByRole("heading", { name: "Nuevo permiso" }),
  ).toBeVisible();
  await hoja.getByRole("combobox", { name: "Alumno" }).click();
  await page.getByRole("option").first().click();
  await hoja
    .getByRole("textbox", { name: /Motivo/ })
    .fill(`Cita familiar ${marca}`);
  await hoja.getByRole("button", { name: "Registrar permiso" }).click();
  await expect(hoja).toBeHidden();
  const fila = page
    .getByRole("row")
    .filter({ hasText: `Cita familiar ${marca}` });
  await expect(fila).toBeVisible();
  await fila.getByRole("button", { name: /Ver permiso/ }).click();
  await expect(hoja.getByText(`Cita familiar ${marca}`)).toBeVisible();
  await hoja.getByRole("button", { name: "Anular permiso" }).click();
  await hoja
    .getByRole("textbox", { name: "Motivo de la anulación" })
    .fill("Registro duplicado de prueba");
  await hoja.getByRole("button", { name: "Confirmar anulación" }).click();
  await expect(hoja).toBeHidden();
  await expect(fila.getByText("Anulado")).toBeVisible();
});

test("crear y ver una incidencia desde los drawers", async ({ page }) => {
  await entrar(page);
  await page.goto(colegio("/incidencias"));
  await page.getByRole("button", { name: "Registrar incidencia" }).click();
  const hoja = page.getByRole("dialog");
  await hoja.getByRole("combobox", { name: "Alumno" }).click();
  await page.getByRole("option").first().click();
  await hoja.getByRole("button", { name: "Continuar" }).click();
  await expect(hoja.getByText("Paso 2 de 2")).toBeVisible();
  await hoja
    .getByRole("textbox", { name: "Qué pasó" })
    .fill(`Tropezó en el patio ${marca}`);
  await hoja.getByRole("button", { name: "Registrar incidencia" }).click();
  await expect(hoja).toBeHidden();
  const fila = page
    .getByRole("row")
    .filter({ hasText: `Tropezó en el patio ${marca}` });
  await expect(fila).toBeVisible();
  await fila.getByRole("button", { name: /Ver incidencia/ }).click();
  await expect(hoja.getByText(`Tropezó en el patio ${marca}`)).toBeVisible();
  await hoja.getByRole("button", { name: "Cerrar" }).first().click();
  await expect(hoja).toBeHidden();
});

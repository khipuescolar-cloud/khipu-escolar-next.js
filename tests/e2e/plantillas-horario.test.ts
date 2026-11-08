// Plantillas de horario (specs/34): secretaría crea una plantilla con dos recreos, ve la vista previa y la elimina.
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) => `http://nuevohorizonte.lvh.me:${PUERTO}${ruta}`;
const NOMBRE = `Jornada e2e ${randomUUID().slice(0, 6)}`;

async function entrar(page: Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/elegir-colegio|\/inicio/);
  if (page.url().includes("elegir-colegio")) await page.getByRole("link", { name: /Nuevo Horizonte/ }).click();
  await page.waitForURL(colegio("/inicio"));
}

test("secretaría crea una plantilla de horario, ve las horas calculadas y la elimina", async ({ page }) => {
  await entrar(page, "secretaria@nuevohorizonte.demo");
  // Las plantillas viven en la Agenda (specs/34): menú «Agenda» → pestaña «Plantillas de horario».
  await page.getByRole("link", { name: "Agenda", exact: true }).first().click();
  await page.getByRole("link", { name: "Plantillas de horario" }).first().click();
  await expect(page.getByRole("heading", { name: "Plantillas de horario", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Primaria", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Nueva plantilla" }).click();
  await page.getByLabel("Nombre de la plantilla").fill(NOMBRE);
  await page.getByLabel("Hora de entrada").fill("07:45");
  await page.getByLabel("Hora de salida").fill("13:15");
  await page.getByLabel("Recreo · desde").fill("10:00");
  await page.getByLabel("hasta").first().fill("10:30");
  await page.getByRole("button", { name: "Agregar recreo" }).click();
  await page.getByLabel("Recreo 2 · desde").fill("12:00");
  await page.getByLabel("hasta").nth(1).fill("12:15");

  const vista = page.getByRole("complementary", { name: "Vista previa" });
  await expect(vista.getByText("6 horas de clase de 45 min")).toBeVisible();
  await expect(vista.getByText("Recreo 2")).toBeVisible();
  await expect(vista.getByText("Tardanza desde las 07:45 · falta desde las 08:45.")).toBeVisible();

  await page.getByRole("button", { name: "Crear plantilla" }).click();
  await page.waitForURL(colegio("/agenda/horario/plantillas"));
  const tarjeta = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: NOMBRE }) });
  await expect(tarjeta.getByText("Sin salones")).toBeVisible();
  await expect(tarjeta.getByText("10:00–10:30 · 12:00–12:15")).toBeVisible();

  await tarjeta.getByRole("button", { name: "Eliminar" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByRole("heading", { name: NOMBRE })).toHaveCount(0);
});

import { expect, test, type Page } from "@playwright/test";

// Pendientes v2 · frente día a día: calendario mensual de la familia, lista y portería sin conexión,
// PDF de carnets y avisos de hoy en el inicio de dirección (specs/04, 05, 10).
const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("la familia ve el calendario del mes de su hijo y navega al mes anterior", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com");
  await page.waitForURL("**/elegir-colegio");
  await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/asistencia`);
  const main = page.getByRole("main");
  await expect(main.getByRole("table")).toBeVisible();
  await expect(main.getByRole("list", { name: "Leyenda" })).toBeVisible();
  await main.getByRole("link", { name: "Mes anterior" }).click();
  await expect(page).toHaveURL(/asistencia\?mes=\d{4}-\d{2}/);
  await expect(main.getByRole("table")).toBeVisible();
  await expect(main.getByRole("link", { name: "Mes siguiente" })).toBeVisible();
});

test("dirección ve los avisos de hoy en el inicio y descarga el PDF de carnets", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.waitForURL(`${COLEGIO}/inicio`);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Avisos de hoy" })).toBeVisible();
  await expect(main.getByRole("link", { name: /Ver todos los avisos/ })).toHaveAttribute("href", "/avisos");

  await page.goto(`${COLEGIO}/gestion/carnets`);
  const generar = main.getByRole("button", { name: "Generar carnets" }).first();
  if (await generar.isVisible()) await generar.click();
  const enlace = main.getByRole("link", { name: "Descargar PDF" }).first();
  await expect(enlace).toBeVisible();
  const href = await enlace.getAttribute("href");
  const respuesta = await page.request.get(`${COLEGIO}${href}`);
  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()["content-type"]).toBe("application/pdf");
  expect((await respuesta.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("sin conexión, la lista queda guardada en el dispositivo y se envía sola al volver la red", async ({ page, context }) => {
  test.setTimeout(120_000);
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/asistencia`);
  await page.getByRole("link", { name: "Asistencia del día · 3.° B" }).click();
  await expect(page.getByRole("heading", { name: "Asistencia del día · 3.° B" })).toBeVisible();
  const main = page.getByRole("main");

  await page.getByRole("button", { name: "Marcar a todos «Llegó»" }).click();
  await context.setOffline(true);
  await expect(main.getByTestId("indicador-sin-conexion").getByText("Sin conexión")).toBeVisible();
  await page.getByRole("button", { name: "Guardar y avisar a los padres" }).first().click();
  await expect(main.getByText("la lista quedó guardada en este dispositivo")).toBeVisible();
  await expect(main.getByTestId("indicador-sin-conexion")).toContainText("Sin conexión · 1 lista pendiente de enviar");

  await context.setOffline(false);
  await expect(page.getByText("Se envió la lista guardada sin conexión")).toBeVisible({ timeout: 30_000 });
  await expect(main.getByTestId("indicador-sin-conexion")).not.toContainText("pendiente");
});

test("portería avisa que está sin conexión y no permite la búsqueda manual", async ({ page, context }) => {
  await entrar(page, "porteria@nuevohorizonte.demo");
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/porteria`);
  await expect(page.getByRole("button", { name: "Encender cámara" })).toBeVisible();
  await context.setOffline(true);
  const main = page.getByRole("main");
  await expect(main.getByTestId("indicador-sin-conexion").getByText("Sin conexión")).toBeVisible();
  await expect(main.getByRole("button", { name: "Buscar" })).toBeDisabled();
  await context.setOffline(false);
  await expect(main.getByRole("button", { name: "Buscar" })).toBeEnabled();
});

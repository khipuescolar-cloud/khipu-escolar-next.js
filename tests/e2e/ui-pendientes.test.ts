import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function entrar(browser: Browser, correo: string, elegirColegio: boolean): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  if (elegirColegio) {
    await page.waitForURL("**/elegir-colegio");
    await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  }
  await page.waitForURL(`${COLEGIO}/inicio`);
  return page;
}

// Restaura la BD demo compartida: conversaciones de Rosa, sus avisos y el logo del colegio.
test.afterAll(async () => {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  await cliente.query(
    `delete from conversaciones where apoderado_id in (select m.id from memberships m join profiles p on p.id = m.user_id where p.email = 'rosa.quispe@gmail.com')`,
  );
  await cliente.query(`delete from avisos where plantilla = 'mensaje_nuevo' and destinatario = 'rosa.quispe@gmail.com'`);
  await cliente.query(`update tenants set logo_archivo_id = null where slug = 'nuevohorizonte'`);
  await cliente.query(`delete from archivos where tenant_id in (select id from tenants where slug = 'nuevohorizonte') and public_id like '%/logo/%'`);
  await cliente.end();
});

test("la tutora ve el contador de mensajes sin leer y la familia le escribe desde Asistencia", async ({ browser }) => {
  const rosa = await entrar(browser, "rosa.quispe@gmail.com", true);

  // «Escribir a la tutora» desde la asistencia de cada hijo.
  await rosa.goto(`${COLEGIO}/asistencia`);
  await rosa.getByRole("link", { name: "Escribir a la tutora" }).first().click();
  await rosa.waitForURL(/\/mensajes\/nuevo\?alumno=[0-9a-f-]{36}/);
  const fila = rosa.getByRole("listitem").filter({ hasText: "Lucía García Paz · Tutora de 3.° B" });
  await fila.getByRole("button", { name: "Escribir" }).click();
  await rosa.waitForURL(/\/mensajes\/[0-9a-f-]{36}$/);
  await rosa.getByLabel("Tu mensaje").fill(`Buenos días (${Date.now()})`);
  await rosa.getByRole("button", { name: "Enviar" }).click();

  // La tutora ve el contador en el mosaico de Mensajes, con texto además del número.
  const lucia = await entrar(browser, "lucia.garcia@nuevohorizonte.demo", false);
  await expect(lucia.getByTestId("contador-mensajes")).toBeVisible();
  await expect(lucia.getByText("1 mensaje sin leer")).toBeAttached();
  await expect(lucia.locator("body")).toContainText("Profesora");
});

test("dirección sube el logo, se ve en el encabezado y se puede quitar", async ({ browser }) => {
  const dir = await entrar(browser, "direccion@nuevohorizonte.demo", false);
  await dir.goto(`${COLEGIO}/configuracion`);
  await dir.locator('input[name="logo"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await dir.getByRole("button", { name: "Subir logo" }).click();
  await expect(dir.getByText("Logo actualizado.")).toBeVisible();
  await expect(dir.getByRole("link", { name: /ir al inicio/ }).getByRole("img", { name: /Logo de/ })).toBeVisible();

  // Un archivo que no es imagen se rechaza.
  await dir.locator('input[name="logo"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from("no soy una imagen") });
  await dir.getByRole("button", { name: "Subir logo" }).click();
  await expect(dir.getByText("El logo debe ser una imagen PNG, JPG o WEBP.")).toBeVisible();

  await dir.getByRole("button", { name: "Quitar logo" }).click();
  await expect(dir.getByText("Logo quitado.")).toBeVisible();
  await expect(dir.getByRole("link", { name: /ir al inicio/ }).getByRole("img", { name: /Logo de/ })).toHaveCount(0);
});

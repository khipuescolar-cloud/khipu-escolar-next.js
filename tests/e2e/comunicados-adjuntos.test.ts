import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const TITULO = `Circular con adjunto ${Date.now()}`;

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

// Limpia lo que crea la prueba en la BD demo compartida (el comunicado, sus archivos y sus avisos).
test.afterAll(async () => {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  await cliente.query(`delete from avisos where plantilla = 'comunicado' and payload->>'titulo' = $1`, [TITULO]);
  await cliente.query(`delete from comunicados where titulo = $1`, [TITULO]);
  await cliente.query(
    `delete from preferencias_aviso where apoderado_id in (select m.id from memberships m join profiles p on p.id = m.user_id where p.email = 'lucia.garcia@nuevohorizonte.demo')`,
  );
  await cliente.end();
});

test("dirección publica un comunicado con PDF y solo quien puede verlo lo descarga", async ({ browser }) => {
  const direccion = await entrar(browser, "direccion@nuevohorizonte.demo", false);
  await direccion.goto(`${COLEGIO}/comunicados`);
  await direccion.getByRole("button", { name: "Publicar un comunicado" }).first().click();
  const dialogo = direccion.getByRole("dialog");
  await dialogo.getByLabel("Título").fill(TITULO);
  await dialogo.getByLabel("Mensaje").fill("Revisa la circular adjunta.");
  await dialogo.getByLabel("Adjuntar archivos (opcional)").setInputFiles({
    name: "circular.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%circular de prueba\n"),
  });
  await expect(dialogo.getByRole("list", { name: "Archivos elegidos" }).getByText("circular.pdf")).toBeVisible();
  await dialogo.getByRole("button", { name: "Publicar y avisar" }).click();

  const tarjeta = direccion.getByRole("main").getByRole("listitem").filter({ hasText: TITULO });
  await expect(tarjeta.getByRole("link", { name: /circular\.pdf/ })).toBeVisible();
  const href = await tarjeta.getByRole("link", { name: /circular\.pdf/ }).getAttribute("href");
  expect(href).toMatch(/^\/archivos\/[0-9a-f-]{36}$/);
  const id = (await tarjeta.getAttribute("id"))!;
  expect(id).toMatch(/^comunicado-[0-9a-f-]{36}$/);

  // Rosa (apoderada del colegio) llega con el enlace directo y descarga el PDF.
  const rosa = await entrar(browser, "rosa.quispe@gmail.com", true);
  await rosa.goto(`${COLEGIO}/comunicados#${id}`);
  const suyo = rosa.getByRole("main").locator(`#${id}`);
  await expect(suyo.getByText(TITULO)).toBeVisible();
  await expect(suyo.getByText(/\d+ B|KB/)).toBeVisible();
  const descarga = await rosa.request.get(`${COLEGIO}${href}`);
  expect(descarga.status()).toBe(200);
  expect(descarga.headers()["content-disposition"]).toContain("attachment");
  expect(descarga.headers()["content-disposition"]).toContain("circular.pdf");

  // Portería no ve comunicados: no descarga el adjunto.
  const porteria = await entrar(browser, "porteria@nuevohorizonte.demo", false);
  expect((await porteria.request.get(`${COLEGIO}${href}`)).status()).toBe(403);

  // Dirección borra el comunicado (y sus archivos).
  await tarjeta.getByRole("button", { name: "Borrar" }).click();
  await direccion.getByRole("button", { name: "Borrar comunicado" }).click();
  await expect(direccion.getByText(TITULO)).toHaveCount(0);
});

test("la profesora elige sus avisos (correo y push) en su perfil", async ({ browser }) => {
  const lucia = await entrar(browser, "lucia.garcia@nuevohorizonte.demo", false);
  await lucia.goto(`${COLEGIO}/perfil`);
  const seccion = lucia.getByRole("region", { name: "Tus avisos" });
  await expect(seccion.getByLabel("Recibir avisos por correo")).toBeChecked();
  await seccion.getByLabel("Recibir avisos por correo").uncheck();
  await seccion.getByRole("button", { name: "Guardar" }).click();
  await expect(seccion.getByText("Guardamos tus preferencias.")).toBeVisible();
  await lucia.reload();
  await expect(lucia.getByRole("region", { name: "Tus avisos" }).getByLabel("Recibir avisos por correo")).not.toBeChecked();
  await expect(lucia.getByRole("region", { name: "Tus avisos" }).getByLabel(/Recibir notificaciones/)).toBeChecked();
});

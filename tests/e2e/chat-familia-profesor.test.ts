import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

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

// Limpia lo que crea la prueba en la BD demo compartida (conversaciones de Rosa y sus avisos).
test.afterAll(async () => {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  await cliente.query(
    `delete from conversaciones where apoderado_id in (select m.id from memberships m join profiles p on p.id = m.user_id where p.email = 'rosa.quispe@gmail.com')`,
  );
  await cliente.query(`delete from avisos where plantilla = 'mensaje_nuevo' and destinatario = 'rosa.quispe@gmail.com'`);
  await cliente.end();
});

test("Rosa y la tutora Lucía conversan sin ver teléfonos ni correos", async ({ browser }) => {
  const mensajeRosa = `Hola profesora, Mateo llegará tarde mañana (${Date.now()})`;
  const respuesta = `Gracias por avisar, lo esperamos (${Date.now()})`;

  // Rosa escribe a la tutora.
  const rosa = await entrar(browser, "rosa.quispe@gmail.com", true);
  await rosa.goto(`${COLEGIO}/mensajes/nuevo`);
  const fila = rosa.getByRole("listitem").filter({ hasText: "Lucía García Paz · Tutora de 3.° B" });
  await fila.getByRole("button", { name: "Escribir" }).click();
  await rosa.waitForURL(/\/mensajes\/[0-9a-f-]{36}$/);
  await rosa.getByLabel("Tu mensaje").fill(mensajeRosa);
  await rosa.getByRole("button", { name: "Enviar" }).click();
  await expect(rosa.getByText(mensajeRosa)).toBeVisible();
  await expect(rosa.locator("body")).not.toContainText("@nuevohorizonte.demo");

  // Lucía ve el mensaje sin leer, lo abre y responde.
  const lucia = await entrar(browser, "lucia.garcia@nuevohorizonte.demo", false);
  await lucia.goto(`${COLEGIO}/mensajes`);
  await expect(lucia.getByRole("main").getByText("1 sin leer")).toBeVisible();
  await expect(lucia.getByText("Rosa Quispe Mamani · madre de Mateo Quispe Huamán")).toBeVisible();
  await lucia.getByRole("link", { name: /Rosa Quispe Mamani/ }).click();
  await expect(lucia.getByText(mensajeRosa)).toBeVisible();
  await lucia.getByLabel("Tu mensaje").fill(respuesta);
  await lucia.getByRole("button", { name: "Enviar" }).click();
  await expect(lucia.getByText(respuesta)).toBeVisible();

  // Rosa recibe la respuesta por el refresco automático (cada 10 s).
  await expect(rosa.getByText(respuesta)).toBeVisible({ timeout: 20_000 });
});

// Comunicados por grado y por nivel (specs/09): dirección y secretaría eligen el destino; solo lo ven las familias de ese destino.
import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const SUFIJO = Date.now();
const DEL_GRADO = `Paseo de tercer grado ${SUFIJO}`;
const DEL_NIVEL = `Feria de ciencias de secundaria ${SUFIJO}`;

async function entrar(browser: Browser, correo: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
  return page;
}

async function publicar(page: Page, titulo: string, elegir: (dialogo: ReturnType<Page["getByRole"]>) => Promise<void>) {
  await page.goto(`${COLEGIO}/comunicados`);
  await page.getByRole("button", { name: "Publicar un comunicado" }).first().click();
  const dialogo = page.getByRole("dialog");
  await elegir(dialogo);
  await dialogo.getByLabel("Título").fill(titulo);
  await dialogo.getByLabel("Mensaje").fill("Más detalles en la agenda.");
  await dialogo.getByRole("button", { name: "Publicar y avisar" }).click();
  await expect(page.getByText(/Comunicado publicado\. Se avisó a \d+ famili/)).toBeVisible();
}

// Limpia lo que crea en la BD demo compartida (los comunicados y sus avisos).
test.afterAll(async () => {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  await cliente.query(`delete from avisos where plantilla = 'comunicado' and payload->>'titulo' = any($1)`, [[DEL_GRADO, DEL_NIVEL]]);
  await cliente.query(`delete from comunicados where titulo = any($1)`, [[DEL_GRADO, DEL_NIVEL]]);
  await cliente.end();
});

test("dirección publica para un grado y secretaría para un nivel; cada familia ve solo lo suyo", async ({ browser }) => {
  const direccion = await entrar(browser, "direccion@nuevohorizonte.demo");
  await publicar(direccion, DEL_GRADO, async (dialogo) => {
    const paraQuien = dialogo.getByRole("group", { name: "Para quién" });
    await paraQuien.getByRole("radio", { name: "Un grado", exact: true }).check();
    await dialogo.getByRole("combobox", { name: "Grado", exact: true }).selectOption({ label: "3.° grado de primaria" });
  });
  await expect(direccion.getByRole("main").getByRole("listitem").filter({ hasText: DEL_GRADO }).getByText("Para: 3.° grado de primaria", { exact: true })).toBeVisible();

  const secretaria = await entrar(browser, "secretaria@nuevohorizonte.demo");
  await publicar(secretaria, DEL_NIVEL, async (dialogo) => {
    await dialogo.getByRole("radio", { name: "Por nivel", exact: true }).check();
    await dialogo.getByRole("group", { name: "Niveles" }).getByLabel("Secundaria").check();
  });
  await expect(secretaria.getByRole("main").getByRole("listitem").filter({ hasText: DEL_NIVEL }).getByText("Para: Secundaria", { exact: true })).toBeVisible();

  // Rosa: Mateo está en 3.° B (primaria) y Sofía en 1.° A Sec. → ve los dos, cada uno con su destino.
  const rosa = await entrar(browser, "rosa.quispe@gmail.com");
  await rosa.goto(`${COLEGIO}/comunicados`);
  const lista = rosa.getByRole("main").getByRole("listitem");
  await expect(lista.filter({ hasText: DEL_GRADO }).getByText("Para: 3.° grado de primaria", { exact: true })).toBeVisible();
  await expect(lista.filter({ hasText: DEL_NIVEL }).getByText("Para: Secundaria", { exact: true })).toBeVisible();

  // La familia de Lucas (5.° A de primaria) no ve ninguno de los dos.
  const huaman = await entrar(browser, "familia.huaman@familia.demo");
  await huaman.goto(`${COLEGIO}/comunicados`);
  await expect(huaman.getByRole("heading", { name: "Comunicados", level: 1 })).toBeVisible();
  await expect(huaman.getByText(DEL_GRADO)).toHaveCount(0);
  await expect(huaman.getByText(DEL_NIVEL)).toHaveCount(0);
});

test("la profesora solo puede elegir entre sus salones", async ({ browser }) => {
  const lucia = await entrar(browser, "lucia.garcia@nuevohorizonte.demo");
  await lucia.goto(`${COLEGIO}/comunicados`);
  await lucia.getByRole("button", { name: "Publicar un comunicado" }).first().click();
  const dialogo = lucia.getByRole("dialog");
  await expect(dialogo.getByRole("radio")).toHaveCount(0);
  await expect(dialogo.getByLabel("Para quién").locator("option", { hasText: "3.° B" })).toHaveCount(1);
});

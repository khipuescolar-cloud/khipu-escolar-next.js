import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";

const puerto = process.env.E2E_PORT ?? "3070";
const colegio = `http://nuevohorizonte.lvh.me:${puerto}`;
const nombre = `Competencia de prueba ${Date.now()}`;
const capturas = "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad";

async function entrar(page: Page, correo: string) {
  await page.goto(`${colegio}/login`);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/inicio");
}

async function miembroLucia(): Promise<string> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    const { rows } = await cliente.query<{ id: string }>("select m.id from memberships m join profiles p on p.id=m.user_id where p.email=$1 and m.rol='profesor'", ["lucia.garcia@nuevohorizonte.demo"]);
    return rows[0].id;
  } finally { await cliente.end(); }
}

test.afterAll(async () => {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    await cliente.query("update memberships set gestiona_competencias=false where id=$1", [await miembroLucia()]);
    await cliente.query("delete from competencias where nombre=$1", [nombre]);
  } finally { await cliente.end(); }
});

test("dirección autoriza a Lucía, quien crea y desactiva una competencia", async ({ page, browser }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(`${colegio}/gestion/profesores/${await miembroLucia()}`);
  await expect(page.getByText("Puede gestionar competencias")).toBeVisible();
  if (await page.getByRole("button", { name: "Activar permiso" }).isVisible()) {
    await page.getByRole("button", { name: "Activar permiso" }).click();
    await expect(page.getByRole("button", { name: "Desactivar permiso" })).toBeVisible();
  }
  const sesion = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const lucia = await sesion.newPage();
  await entrar(lucia, "lucia.garcia@nuevohorizonte.demo");
  await lucia.goto(`${colegio}/notas/competencias`);
  await expect(lucia.getByRole("heading", { name: "Competencias", exact: true })).toBeVisible();
  await lucia.getByRole("button", { name: "Nueva competencia" }).click();
  await lucia.getByLabel("Nombre", { exact: true }).fill(nombre);
  await lucia.getByRole("button", { name: "Guardar competencia" }).click();
  await expect(lucia.getByText(nombre, { exact: true })).toBeVisible();
  await lucia.screenshot({ path: `${capturas}/notasA-escritorio.png`, fullPage: true });
  const fila = lucia.getByRole("listitem").filter({ hasText: nombre });
  await fila.getByRole("button", { name: "Desactivar", exact: true }).click();
  await lucia.getByRole("button", { name: "Desactivar", exact: true }).last().click();
  await expect(fila.getByText("Desactivada", { exact: true })).toBeVisible();
  await lucia.setViewportSize({ width: 390, height: 844 });
  await lucia.screenshot({ path: `${capturas}/notasA-movil.png`, fullPage: true });
  await sesion.close();
});

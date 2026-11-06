import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";
import { crearColegioTemporal } from "./ayudantes/colegio-temporal";

// Biblioteca de documentos (specs/31): dirección crea una carpeta y sube un PDF para las familias; la apoderada Rosa lo ve y
// lo descarga; la profesora no ve lo que no es para su rol; Khipu Base ve el candado.
const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const SUFIJO = Date.now();
const CARPETA = `Reglamento E2E ${SUFIJO}`;
const TITULO = `Reglamento de convivencia ${SUFIJO}`;
const INTERNO = `Acta interna ${SUFIJO}`;

async function entrar(browser: Browser, correo: string, destino: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(destino);
  return page;
}

test.afterAll(async () => {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  await cliente.query(`delete from carpetas_documento where nombre = $1`, [CARPETA]);
  await cliente.query(`delete from documentos where titulo in ($1, $2)`, [TITULO, INTERNO]);
  await cliente.end();
});

test("dirección crea una carpeta y sube un PDF para las familias; Rosa lo ve y lo descarga", async ({ browser }) => {
  const direccion = await entrar(browser, "direccion@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await direccion.goto(`${COLEGIO}/documentos`);
  await expect(direccion.getByRole("heading", { name: "Documentos", level: 1 })).toBeVisible();

  await direccion.getByRole("button", { name: "Nueva carpeta" }).first().click();
  await direccion.getByRole("dialog").getByLabel("Nombre de la carpeta").fill(CARPETA);
  await direccion.getByRole("dialog").getByRole("button", { name: "Crear carpeta" }).click();
  await expect(direccion.getByText("Carpeta creada.")).toBeVisible();
  await direccion.getByRole("link", { name: new RegExp(CARPETA) }).click();
  await expect(direccion.getByText("Esta carpeta está vacía")).toBeVisible();

  await direccion.getByRole("button", { name: "Subir documento" }).first().click();
  const dialogo = direccion.getByRole("dialog");
  await dialogo.getByLabel("Título").fill(TITULO);
  await dialogo.getByLabel("Archivo", { exact: true }).setInputFiles({ name: "reglamento.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%reglamento de prueba\n") });
  await dialogo.getByLabel("Familias", { exact: true }).check();
  await dialogo.getByRole("button", { name: "Publicar documento" }).click();
  await expect(direccion.getByText("Documento publicado.")).toBeVisible();
  await expect(direccion.getByRole("heading", { name: TITULO })).toBeVisible();

  // Un documento sin casillas es un borrador: solo dirección.
  await direccion.getByRole("button", { name: "Subir documento" }).first().click();
  await direccion.getByRole("dialog").getByLabel("Título").fill(INTERNO);
  await direccion.getByRole("dialog").getByLabel("Archivo", { exact: true }).setInputFiles({ name: "acta.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%acta\n") });
  await direccion.getByRole("dialog").getByRole("button", { name: "Publicar documento" }).click();
  await expect(direccion.getByRole("heading", { name: INTERNO })).toBeVisible();
  await expect(direccion.getByText("Solo dirección")).toBeVisible();

  // Rosa (apoderada) entra a la carpeta, ve el documento para familias, busca por título y lo descarga.
  const rosa = await entrar(browser, "rosa.quispe@gmail.com", `${COLEGIO}/inicio`);
  await rosa.goto(`${COLEGIO}/documentos`);
  await rosa.getByRole("link", { name: new RegExp(CARPETA) }).click();
  await expect(rosa.getByRole("heading", { name: TITULO })).toBeVisible();
  await expect(rosa.getByRole("heading", { name: INTERNO })).toHaveCount(0);
  await expect(rosa.getByRole("button", { name: "Subir documento" })).toHaveCount(0);

  await rosa.goto(`${COLEGIO}/documentos?q=${encodeURIComponent(String(SUFIJO))}`);
  await expect(rosa.getByRole("heading", { name: TITULO })).toBeVisible();
  const href = await rosa.getByRole("link", { name: new RegExp(`Descargar ${TITULO}`) }).getAttribute("href");
  expect(href).toMatch(/^\/archivos\/[0-9a-f-]{36}$/);
  const descarga = await rosa.request.get(`${COLEGIO}${href}`);
  expect(descarga.status()).toBe(200);
  expect(descarga.headers()["content-disposition"]).toContain("attachment");
  expect((await descarga.body()).toString()).toContain("%PDF-1.4");

  // Portería no usa la biblioteca: no descarga el archivo.
  const porteria = await entrar(browser, "porteria@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  expect((await porteria.request.get(`${COLEGIO}${href}`)).status()).toBe(403);
  await esperarSinAcceso(porteria, await porteria.goto(`${COLEGIO}/documentos`), "portería");

  // Dirección borra el documento con confirmación y luego la carpeta.
  await direccion.goto(`${COLEGIO}/documentos`);
  await direccion.getByRole("link", { name: new RegExp(CARPETA) }).click();
  await direccion.getByRole("button", { name: new RegExp(`Borrar ${TITULO}`) }).click();
  await direccion.getByRole("button", { name: "Borrar documento" }).click();
  await expect(direccion.getByText("Documento borrado.")).toBeVisible();
  await expect(direccion.getByRole("heading", { name: TITULO })).toHaveCount(0);
  expect((await rosa.request.get(`${COLEGIO}${href}`)).status()).toBe(404);
});

test("Khipu Base ve el candado de Documentos y no puede abrirlos", async ({ browser }) => {
  const colegioBase = await crearColegioTemporal({ plan: "base", prefijo: "e2e-base" });
  try {
    const URL_BASE = `http://${colegioBase.slug}.lvh.me:${PUERTO}`;
    const base = await entrar(browser, colegioBase.correos.direccion, `${URL_BASE}/inicio`);
    await expect(base.locator('[data-slot="sidebar-menu-item"]', { hasText: "Documentos" })).toContainText("bloqueado, plan Khipu Pro");
    await esperarSinAcceso(base, await base.goto(`${URL_BASE}/documentos`), "Khipu Base");
  } finally {
    await colegioBase.limpiar();
  }
});

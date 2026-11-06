import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";
import { crearColegioTemporal } from "./ayudantes/colegio-temporal";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const SUFIJO = Date.now();
const CARPETA = `Material Lucía E2E ${SUFIJO}`;
const TITULO = `Guía para 3.° B ${SUFIJO}`;

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
  await cliente.query("delete from carpetas_documento where nombre = $1", [CARPETA]);
  await cliente.query("delete from documentos where titulo = $1", [TITULO]);
  await cliente.end();
});

test("Lucía comparte carpeta con familias; Rosa descarga; Pedro no ve; papelera y restauración", async ({ browser }) => {
  const lucia = await entrar(browser, "lucia.garcia@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await lucia.goto(`${COLEGIO}/documentos?vista=unidad`);
  await expect(lucia.getByRole("heading", { name: "Documentos", level: 1 })).toBeVisible();
  await lucia.getByRole("button", { name: "Nuevo", exact: true }).click();
  await lucia.getByRole("menuitem", { name: "Nueva carpeta" }).click();
  await lucia.getByRole("dialog").getByLabel("Nombre de la carpeta").fill(CARPETA);
  await lucia.getByRole("dialog").getByRole("button", { name: "Crear", exact: true }).click();
  await expect(lucia.getByText("Carpeta creada.")).toBeVisible();
  await lucia.getByRole("button", { name: `Opciones de ${CARPETA}` }).click();
  await lucia.getByRole("menuitem", { name: "Compartir" }).click();
  await expect(lucia.getByRole("dialog", { name: `Compartir «${CARPETA}»` })).toBeVisible();
  const grupoFamilias = await lucia.getByRole("dialog").getByLabel("Agregar personas y grupos").locator("option").filter({ hasText: /Familias de 3\.° B/ }).first().getAttribute("value");
  await lucia.getByRole("dialog").getByLabel("Agregar personas y grupos").selectOption(grupoFamilias!);
  await lucia.getByRole("dialog").getByRole("button", { name: "Compartir", exact: true }).click();
  await expect(lucia.getByText("Acceso compartido.")).toBeVisible();
  await lucia.getByRole("button", { name: CARPETA, exact: true }).click();
  await lucia.getByRole("button", { name: "Nuevo", exact: true }).click();
  await lucia.getByRole("menuitem", { name: "Subir archivo" }).click();
  await lucia.getByRole("dialog").getByLabel("Título").fill(TITULO);
  await lucia.getByRole("dialog").getByLabel("Archivo", { exact: true }).setInputFiles({ name: "guia.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%guia de prueba\n") });
  await lucia.getByRole("dialog").getByRole("button", { name: "Subir archivo" }).click();
  await expect(lucia.getByText("Documento publicado.")).toBeVisible();
  await expect(lucia.getByRole("button", { name: TITULO, exact: true })).toBeVisible();

  const rosa = await entrar(browser, "rosa.quispe@gmail.com", `${COLEGIO}/inicio`);
  await rosa.goto(`${COLEGIO}/documentos?vista=compartido`);
  await expect(rosa.getByRole("button", { name: CARPETA, exact: true })).toBeVisible();
  await rosa.getByRole("button", { name: CARPETA, exact: true }).click();
  await expect(rosa.getByRole("button", { name: TITULO, exact: true })).toBeVisible();
  await rosa.getByRole("button", { name: TITULO, exact: true }).click();
  const href = await rosa.getByRole("dialog").getByRole("link", { name: "Descargar" }).getAttribute("href");
  expect(href).toMatch(/^\/archivos\/[0-9a-f-]{36}$/);
  const descarga = await rosa.request.get(`${COLEGIO}${href}`);
  expect(descarga.status()).toBe(200);
  expect(descarga.headers()["content-disposition"]).toContain("attachment");
  expect((await descarga.body()).toString()).toContain("%PDF-1.4");

  const pedro = await entrar(browser, "pedro.salas@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await pedro.goto(`${COLEGIO}/documentos?vista=compartido`);
  await expect(pedro.getByRole("button", { name: CARPETA, exact: true })).toHaveCount(0);

  await lucia.goto(`${COLEGIO}/documentos?vista=unidad`);
  await lucia.getByRole("button", { name: `Opciones de ${CARPETA}` }).click();
  await lucia.getByRole("menuitem", { name: "Mover a la papelera" }).click();
  await expect(lucia.getByRole("button", { name: CARPETA, exact: true })).toHaveCount(0);
  await lucia.goto(`${COLEGIO}/documentos?vista=papelera`);
  await expect(lucia.getByRole("button", { name: CARPETA, exact: true })).toBeVisible();
  await lucia.getByRole("button", { name: `Opciones de ${CARPETA}` }).click();
  await lucia.getByRole("menuitem", { name: "Restaurar" }).click();
  await lucia.goto(`${COLEGIO}/documentos?vista=unidad`);
  await expect(lucia.getByRole("button", { name: CARPETA, exact: true })).toBeVisible();
});

test("portería no accede y Khipu Base ve el candado", async ({ browser }) => {
  const porteria = await entrar(browser, "porteria@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await esperarSinAcceso(porteria, await porteria.goto(`${COLEGIO}/documentos`), "portería");
  const colegioBase = await crearColegioTemporal({ plan: "base", prefijo: "e2e-base" });
  try {
    const URL_BASE = `http://${colegioBase.slug}.lvh.me:${PUERTO}`;
    const base = await entrar(browser, colegioBase.correos.direccion, `${URL_BASE}/inicio`);
    await expect(base.locator('[data-slot="sidebar-menu-item"]', { hasText: "Documentos" })).toContainText("bloqueado, plan Khipu Pro");
    await esperarSinAcceso(base, await base.goto(`${URL_BASE}/documentos`), "Khipu Base");
  } finally { await colegioBase.limpiar(); }
});

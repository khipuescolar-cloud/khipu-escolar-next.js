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
const CARPETA_DESDE_PAPELERA = `Carpeta desde papelera ${SUFIJO}`;
const ARCHIVOS_DESDE_RECIENTES = [`Archivo reciente A ${SUFIJO}`, `Archivo reciente B ${SUFIJO}`];
const CARPETA_EDITOR = `Carpeta editor ${SUFIJO}`;
const SUBCARPETA_EDITOR = `Nueva del editor ${SUFIJO}`;

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
  await cliente.query("delete from carpetas_documento where nombre = $1", [CARPETA_DESDE_PAPELERA]);
  await cliente.query("delete from documentos where titulo = any($1)", [ARCHIVOS_DESDE_RECIENTES]);
  await cliente.query("delete from carpetas_documento where nombre = $1", [CARPETA_EDITOR]);
  await cliente.end();
});

test("Un Editor crea dentro de la carpeta compartida y permanece allí", async ({ browser }) => {
  const lucia = await entrar(browser, "lucia.garcia@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await lucia.goto(`${COLEGIO}/documentos?vista=unidad`);
  await lucia.getByRole("button", { name: "Nuevo", exact: true }).click();
  await lucia.getByRole("menuitem", { name: "Nueva carpeta" }).click();
  await lucia.getByRole("dialog").getByLabel("Nombre de la carpeta").fill(CARPETA_EDITOR);
  await lucia.getByRole("dialog").getByRole("button", { name: "Crear", exact: true }).click();
  await expect(lucia.getByRole("button", { name: `Opciones de ${CARPETA_EDITOR}` })).toBeVisible();
  await lucia.getByRole("button", { name: `Opciones de ${CARPETA_EDITOR}` }).click();
  await lucia.getByRole("menuitem", { name: "Compartir" }).click();
  const dialogo = lucia.getByRole("dialog", { name: `Compartir «${CARPETA_EDITOR}»` });
  await dialogo.getByRole("combobox", { name: "Agregar personas y grupos" }).fill("Pedro Salas");
  await dialogo.getByRole("option", { name: /Pedro Salas/ }).click();
  await dialogo.getByRole("button", { name: "Nivel de acceso de las personas elegidas: Lector" }).click();
  await lucia.getByRole("menuitemradio", { name: /Editor/ }).click();
  await lucia.keyboard.press("Escape");
  await dialogo.getByRole("button", { name: "Compartir", exact: true }).click();
  await expect(lucia.getByText("Acceso compartido.")).toBeVisible();

  const pedro = await entrar(browser, "pedro.salas@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await pedro.goto(`${COLEGIO}/documentos?vista=compartido`);
  await pedro.getByRole("button", { name: CARPETA_EDITOR, exact: true }).click();
  await expect(pedro).toHaveURL(/seccion=compartido&carpeta=/);
  const urlCarpeta = pedro.url().split("&nuevo=")[0];
  await pedro.getByRole("button", { name: "Nuevo", exact: true }).click();
  await pedro.getByRole("menuitem", { name: "Nueva carpeta" }).click();
  await pedro.getByRole("dialog").getByLabel("Nombre de la carpeta").fill(SUBCARPETA_EDITOR);
  await pedro.getByRole("dialog").getByRole("button", { name: "Crear", exact: true }).click();
  await expect(pedro).toHaveURL(new RegExp(urlCarpeta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  await expect(pedro.getByRole("button", { name: SUBCARPETA_EDITOR, exact: true })).toBeFocused();
  await expect(pedro.getByText("Carpeta creada en la carpeta compartida.")).toBeVisible();
});

test("Lucía comparte carpeta con familias; Rosa descarga; Pedro no ve; renombrar, papelera y restauración", async ({ browser }) => {
  const lucia = await entrar(browser, "lucia.garcia@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await lucia.goto(`${COLEGIO}/documentos?vista=unidad`);
  await expect(lucia.getByRole("heading", { name: "Documentos", level: 1 })).toBeVisible();
  await lucia.getByRole("button", { name: "Nuevo", exact: true }).click();
  await lucia.getByRole("menuitem", { name: "Nueva carpeta" }).click();
  await lucia.getByRole("dialog").getByLabel("Nombre de la carpeta").fill(CARPETA);
  await lucia.getByRole("dialog").getByRole("button", { name: "Crear", exact: true }).click();
  await expect(lucia.getByText("Carpeta creada en Mi unidad.")).toBeVisible();

  // Compartir: buscador de personas y grupos, chip, nivel Lector y «Compartir»; el pie conserva «Copiar enlace» y «Listo».
  await lucia.getByRole("button", { name: `Opciones de ${CARPETA}` }).click();
  await lucia.getByRole("menuitem", { name: "Compartir" }).click();
  const dialogo = lucia.getByRole("dialog", { name: `Compartir «${CARPETA}»` });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByText("Personas con acceso")).toBeVisible();
  await expect(dialogo.getByText("Propietario", { exact: true })).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Copiar enlace" })).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Listo" })).toBeVisible();
  await expect(dialogo.locator("select")).toHaveCount(0); // niveles y acceso general son menús del sistema, no selects nativos
  await dialogo.getByRole("combobox", { name: "Agregar personas y grupos" }).fill("Familias de 3");
  await dialogo.getByRole("option", { name: /Familias de 3\.° B/ }).click();
  await expect(dialogo.getByRole("button", { name: "Quitar a Familias de 3.° B" })).toBeVisible();
  await expect(dialogo.getByRole("button", { name: "Compartir", exact: true })).toBeVisible();
  await dialogo.getByRole("button", { name: "Compartir", exact: true }).click();
  await expect(lucia.getByText("Acceso compartido.")).toBeVisible();
  await expect(dialogo.getByRole("button", { name: /^Nivel de acceso de Familias de 3\.° B: Lector/ })).toBeVisible();
  await dialogo.getByRole("button", { name: "Listo" }).click();

  // Subir un PDF dentro (selector de archivos del menú «Nuevo») con progreso por archivo.
  await lucia.getByRole("button", { name: CARPETA, exact: true }).click();
  await expect(lucia.getByRole("navigation", { name: "Ruta de carpetas" }).getByRole("link", { name: CARPETA })).toBeVisible();
  await lucia.getByTestId("subir-archivos").setInputFiles({ name: `${TITULO}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%guia de prueba\n") });
  await expect(lucia.getByText("Archivo subido a Mi unidad.")).toBeVisible();
  await expect(lucia.getByRole("button", { name: TITULO, exact: true })).toBeVisible({ timeout: 20_000 });

  // Renombrar con F2.
  await lucia.getByRole("button", { name: TITULO, exact: true }).focus();
  await lucia.keyboard.press("F2");
  await lucia.getByRole("dialog").getByLabel("Nombre").fill(`${TITULO} v2`);
  await lucia.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(lucia.getByRole("button", { name: `${TITULO} v2`, exact: true })).toBeVisible();
  await lucia.getByRole("button", { name: `Opciones de ${TITULO} v2` }).click();
  await lucia.getByRole("menuitem", { name: "Renombrar" }).click();
  await lucia.getByRole("dialog").getByLabel("Nombre").fill(TITULO);
  await lucia.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(lucia.getByRole("button", { name: TITULO, exact: true })).toBeVisible();

  const rosa = await entrar(browser, "rosa.quispe@gmail.com", `${COLEGIO}/inicio`);
  await rosa.goto(`${COLEGIO}/documentos?vista=compartido`);
  await expect(rosa.getByRole("button", { name: CARPETA, exact: true })).toBeVisible();
  await expect(rosa.getByRole("button", { name: "Nuevo", exact: true })).toHaveCount(0);
  await rosa.getByRole("button", { name: CARPETA, exact: true }).click();
  await expect(rosa.getByRole("button", { name: TITULO, exact: true })).toBeVisible();
  await expect(rosa.getByRole("button", { name: `Opciones de ${TITULO}` })).toBeVisible();
  await rosa.getByRole("button", { name: TITULO, exact: true }).click();
  await expect(rosa.getByRole("dialog").locator("iframe")).toHaveAttribute("src", /\/archivos\/[0-9a-f-]{36}\?vista=1/);
  const href = await rosa.getByRole("dialog").getByRole("link", { name: "Descargar" }).getAttribute("href");
  expect(href).toMatch(/^\/archivos\/[0-9a-f-]{36}$/);
  const descarga = await rosa.request.get(`${COLEGIO}${href}`);
  expect(descarga.status()).toBe(200);
  expect(descarga.headers()["content-disposition"]).toContain("attachment");
  expect((await descarga.body()).toString()).toContain("%PDF-1.4");
  // La vista previa se puede incrustar solo desde el mismo origen; la descarga no.
  const previa = await rosa.request.get(`${COLEGIO}${href}?vista=1`);
  expect(previa.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  expect(descarga.headers()["x-frame-options"]).toBe("DENY");

  const pedro = await entrar(browser, "pedro.salas@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await pedro.goto(`${COLEGIO}/documentos?vista=compartido`);
  await expect(pedro.getByRole("button", { name: CARPETA, exact: true })).toHaveCount(0);

  await lucia.goto(`${COLEGIO}/documentos?vista=unidad`);
  await lucia.getByRole("button", { name: `Opciones de ${CARPETA}` }).click();
  await lucia.getByRole("menuitem", { name: "Mover a la papelera" }).click();
  await expect(lucia.getByRole("button", { name: CARPETA, exact: true })).toHaveCount(0);
  await rosa.reload();
  await expect(rosa.getByRole("button", { name: CARPETA, exact: true })).toHaveCount(0);
  await lucia.goto(`${COLEGIO}/documentos?vista=papelera`);
  await expect(lucia.getByRole("button", { name: CARPETA, exact: true })).toBeVisible();
  await lucia.getByRole("button", { name: `Opciones de ${CARPETA}` }).click();
  await lucia.getByRole("menuitem", { name: "Restaurar" }).click();
  // Espera a que la acción termine (sale de la papelera) antes de navegar; si no, la navegación la cancela.
  await expect(lucia.getByRole("button", { name: CARPETA, exact: true })).toHaveCount(0);
  await lucia.goto(`${COLEGIO}/documentos?vista=unidad`);
  await expect(lucia.getByRole("button", { name: CARPETA, exact: true })).toBeVisible();
});

test("Nuevo aparece en todas las vistas y muestra carpeta y archivos creados en Mi unidad", async ({ browser }) => {
  const pagina = await entrar(browser, "lucia.garcia@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  for (const vista of ["unidad", "compartido", "biblioteca", "recientes", "destacados", "papelera"]) {
    await pagina.goto(`${COLEGIO}/documentos?vista=${vista}`);
    await expect(pagina.getByRole("button", { name: "Nuevo", exact: true })).toBeVisible();
  }
  await pagina.getByRole("button", { name: "Nuevo", exact: true }).click();
  await pagina.getByRole("menuitem", { name: "Nueva carpeta" }).click();
  await pagina.getByRole("dialog").getByLabel("Nombre de la carpeta").fill(CARPETA_DESDE_PAPELERA);
  await pagina.getByRole("dialog").getByRole("button", { name: "Crear", exact: true }).click();
  await expect(pagina).toHaveURL(/documentos\?seccion=borradores/);
  const carpeta = pagina.locator("[data-documento-id]", { has: pagina.getByRole("button", { name: CARPETA_DESDE_PAPELERA, exact: true }) });
  await expect(carpeta).toHaveClass(/bg-sec-suave/);
  await expect(pagina.getByRole("button", { name: CARPETA_DESDE_PAPELERA, exact: true })).toBeFocused();
  await expect(pagina.getByText("Carpeta creada en Mi unidad.")).toBeVisible();
  await pagina.setViewportSize({ width: 1440, height: 900 });
  await pagina.screenshot({ path: "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad/docs-nuevo-desktop.png" });
  await expect(pagina).not.toHaveURL(/nuevo=/, { timeout: 8_000 });

  await pagina.setViewportSize({ width: 390, height: 844 });
  await pagina.goto(`${COLEGIO}/documentos?vista=recientes`);
  const archivos = ARCHIVOS_DESDE_RECIENTES.map((nombre) => ({ name: `${nombre}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%archivo de prueba\n") }));
  await pagina.getByRole("button", { name: "Nuevo", exact: true }).click();
  const selector = pagina.waitForEvent("filechooser");
  await pagina.getByRole("menuitem", { name: "Subir archivo" }).click();
  await (await selector).setFiles(archivos);
  await expect(pagina.getByText("2 archivos subidos a Mi unidad.")).toBeVisible({ timeout: 20_000 });
  await expect(pagina).toHaveURL(/documentos\?seccion=borradores/, { timeout: 20_000 });
  for (const nombre of ARCHIVOS_DESDE_RECIENTES) {
    const fila = pagina.locator("[data-documento-id]", { has: pagina.getByText(nombre, { exact: true }) });
    await expect(fila).toHaveClass(/bg-sec-suave/);
  }
  const archivoEnfocado = pagina.locator("[data-documento-id]", { has: pagina.getByText(ARCHIVOS_DESDE_RECIENTES[0], { exact: true }) }).locator("[data-documento-abrir]");
  await expect(archivoEnfocado).toBeFocused();
  await expect(archivoEnfocado).toBeInViewport({ ratio: 1 });
  await expect(pagina.getByText("2 archivos subidos a Mi unidad.")).toBeVisible();
  await pagina.screenshot({ path: "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad/docs-nuevo-mobile.png" });
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

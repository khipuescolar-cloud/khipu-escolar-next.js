import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";
import { crearColegioTemporal } from "./ayudantes/colegio-temporal";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const NOMBRE = `Borrador privado ${Date.now()}`;
const CICLO = `Borrador recuperable ${Date.now()}`;

async function entrar(browser: Browser, correo: string, destino: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(destino);
  return page;
}

test.afterAll(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    await db.query("delete from carpetas_documento where nombre=$1", [NOMBRE]);
    await db.query("delete from carpetas_documento where nombre=$1", [CICLO]);
  }
  finally { await db.end(); }
});

test("un borrador se renombra, pasa por la papelera y se restaura", async ({ browser }) => {
  const pagina = await entrar(browser, "lucia.garcia@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await pagina.goto(`${COLEGIO}/documentos?seccion=borradores`);
  await pagina.getByRole("button", { name: "Nuevo", exact: true }).click();
  await pagina.getByRole("menuitem", { name: "Nueva carpeta" }).click();
  await pagina.getByRole("dialog").getByLabel("Nombre de la carpeta").fill(CICLO);
  await pagina.getByRole("dialog").getByRole("button", { name: "Crear", exact: true }).click();
  await expect(pagina.getByRole("button", { name: CICLO, exact: true })).toBeVisible();
  await pagina.getByRole("button", { name: CICLO, exact: true }).focus();
  await pagina.keyboard.press("F2");
  await pagina.getByRole("dialog").getByLabel("Nombre").fill(`${CICLO} v2`);
  await pagina.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(pagina.getByRole("button", { name: `${CICLO} v2`, exact: true })).toBeVisible();
  await pagina.getByRole("button", { name: `Opciones de ${CICLO} v2` }).click();
  await pagina.getByRole("menuitem", { name: "Renombrar" }).click();
  await pagina.getByRole("dialog").getByLabel("Nombre").fill(CICLO);
  await pagina.getByRole("dialog").getByRole("button", { name: "Guardar" }).click();
  await expect(pagina.getByRole("button", { name: CICLO, exact: true })).toBeVisible();
  await pagina.getByRole("button", { name: `Opciones de ${CICLO}` }).click();
  await pagina.getByRole("menuitem", { name: "Mover a la papelera" }).click();
  await expect(pagina.getByRole("button", { name: CICLO, exact: true })).toHaveCount(0);
  await pagina.goto(`${COLEGIO}/documentos?seccion=papelera`);
  await expect(pagina.getByRole("button", { name: CICLO, exact: true })).toBeVisible();
  await pagina.getByRole("button", { name: `Opciones de ${CICLO}` }).click();
  await pagina.getByRole("menuitem", { name: "Restaurar" }).click();
  await expect(pagina.getByRole("button", { name: CICLO, exact: true })).toHaveCount(0);
  await pagina.goto(`${COLEGIO}/documentos?seccion=borradores`);
  await expect(pagina.getByRole("button", { name: CICLO, exact: true })).toBeVisible();
});

test("los borradores son privados en la navegación y conservan su organización", async ({ browser }) => {
  const lucia = await entrar(browser, "lucia.garcia@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await lucia.goto(`${COLEGIO}/documentos?seccion=borradores`);
  await lucia.getByRole("button", { name: "Nuevo", exact: true }).click();
  await lucia.getByRole("menuitem", { name: "Nueva carpeta" }).click();
  await lucia.getByRole("dialog").getByLabel("Nombre de la carpeta").fill(NOMBRE);
  await lucia.getByRole("dialog").getByRole("button", { name: "Crear", exact: true }).click();
  await expect(lucia.getByRole("button", { name: NOMBRE, exact: true })).toBeVisible();
  await lucia.getByRole("button", { name: `Opciones de ${NOMBRE}` }).click();
  await expect(lucia.getByRole("menuitem", { name: "Compartir" })).toHaveCount(0);
  await lucia.goto(`${COLEGIO}/documentos?seccion=recientes`);
  await expect(lucia.getByText("Biblioteca del colegio")).toHaveCount(0);
  const pedro = await entrar(browser, "pedro.salas@nuevohorizonte.demo", `${COLEGIO}/inicio`);
  await pedro.goto(`${COLEGIO}/documentos?seccion=borradores`);
  await expect(pedro.getByRole("button", { name: NOMBRE, exact: true })).toHaveCount(0);
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

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";

// specs/22: el super administrador publica un anuncio; la dirección de un colegio lo ve bajo la barra superior y lo cierra
// (queda cerrado al recargar). También revisa «Equipo Khipu» y «Configuración». Limpia el anuncio al terminar.

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `lvh.me:${PUERTO}`;
const sufijo = randomUUID().slice(0, 8);
const TITULO = `Mantenimiento ${sufijo}`;

test.afterAll(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("delete from anuncios_plataforma where titulo = $1", [TITULO]);
  await c.query("delete from auditoria_plataforma where detalle->>'titulo' = $1", [TITULO]);
  await c.end();
});

async function entrar(page: Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("anuncio de plataforma: se publica, lo ve la dirección y lo cierra", async ({ page }) => {
  await entrar(page, "admin@khipuescolar.demo");
  await page.waitForURL(`http://admin.${BASE}/`);

  await page.goto(`http://admin.${BASE}/equipo`);
  await expect(page.getByRole("heading", { name: "Equipo Khipu" })).toBeVisible();
  await expect(page.getByText("admin@khipuescolar.demo")).toBeVisible();

  await page.goto(`http://admin.${BASE}/configuracion`);
  await expect(page.getByRole("heading", { name: /Feriados y días no laborables/ })).toBeVisible();
  await expect(page.getByTestId("feriado-fijo").first()).toBeVisible();
  await expect(page.getByTestId("datos-plataforma")).toContainText("Dominio base");

  await page.goto(`http://admin.${BASE}/anuncios`);
  await page.getByRole("button", { name: "Nuevo anuncio" }).click();
  await page.getByLabel("Título", { exact: true }).fill(TITULO);
  await page.getByLabel("Mensaje").fill("Esta noche habrá una pausa breve.");
  await page.getByLabel("Nivel").selectOption("mantenimiento");
  await page.getByLabel("Quién lo ve").selectOption("direccion");
  await expect(page.getByTestId("vista-previa-anuncio")).toContainText(TITULO);
  await page.getByRole("button", { name: "Publicar anuncio" }).click();
  await expect(page.getByTestId("fila-anuncio").filter({ hasText: TITULO })).toContainText("Vigente");

  // Sale y entra la dirección de Nuevo Horizonte.
  await page.getByRole("button", { name: "Menú de tu cuenta" }).click();
  await page.getByRole("menuitem", { name: "Salir" }).click();
  await page.waitForURL("**/login");
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.waitForURL(new RegExp(`nuevohorizonte\\.${BASE.replace(".", "\\.")}/inicio`));
  const franja = page.getByTestId("anuncio-plataforma").filter({ hasText: TITULO });
  await expect(franja).toBeVisible();
  await expect(franja).toContainText("Mantenimiento");

  await franja.getByRole("button", { name: /Cerrar anuncio/ }).click();
  await expect(franja).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByTestId("anuncio-plataforma").filter({ hasText: TITULO })).toHaveCount(0);
});

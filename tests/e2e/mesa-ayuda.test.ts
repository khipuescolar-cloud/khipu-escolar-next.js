import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";

// specs/23: la dirección de Nuevo Horizonte abre una conversación → el super admin la ve en la mesa de ayuda, agrega una nota
// interna y responde → la dirección ve la respuesta (y no la nota) y la marca como resuelta. Limpia lo que crea.
// Con CAPTURAS=<carpeta> guarda capturas a 1366 y 390 px.

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `lvh.me:${PUERTO}`;
const COLEGIO = `http://nuevohorizonte.${BASE}`;
const PANEL = `http://admin.${BASE}`;
const sufijo = randomUUID().slice(0, 8);
const ASUNTO = `No llegan los avisos ${sufijo}`;
const NOTA = `Revisar la cola de correo ${sufijo}`;
const RESPUESTA = `Ya lo revisamos: vuelve a intentarlo ${sufijo}`;
const CAPTURAS = process.env.CAPTURAS;

test.afterAll(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query<{ id: string }>("select id from tickets_soporte where asunto = $1", [ASUNTO]);
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    await c.query("delete from avisos where referencia_id = any($1::text[])", [ids]);
    await c.query("delete from auditoria_plataforma where detalle->>'ticketId' = any($1::text[])", [ids]);
    await c.query("delete from tickets_soporte where id = any($1::uuid[])", [ids]);
  }
  await c.end();
});

async function entrar(browser: Browser, correo: string, destino: RegExp): Promise<Page> {
  const page = await (await browser.newContext({ locale: "es-PE", viewport: { width: 1366, height: 900 } })).newPage();
  await page.goto(`http://${BASE}/login`);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(destino);
  return page;
}

async function capturar(page: Page, nombre: string) {
  if (!CAPTURAS) return;
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.screenshot({ path: `${CAPTURAS}/${nombre}-1366.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${CAPTURAS}/${nombre}-390.png`, fullPage: true });
  await page.setViewportSize({ width: 1366, height: 900 });
}

test("mesa de ayuda: el colegio pregunta, Khipu anota y responde, el colegio resuelve", async ({ browser }) => {
  // 1. Dirección abre la conversación.
  const dir = await entrar(browser, "direccion@nuevohorizonte.demo", /nuevohorizonte\.lvh\.me:\d+\/inicio/);
  await dir.goto(`${COLEGIO}/soporte`);
  await expect(dir.getByRole("heading", { name: "Soporte Khipu", level: 1 })).toBeVisible();
  await expect(dir.getByText("No compartas datos personales de alumnos si no es necesario.").first()).toBeVisible();
  await dir.getByRole("button", { name: "Nueva conversación" }).click();
  await dir.getByLabel("Asunto").fill(ASUNTO);
  await dir.getByLabel("Categoría").selectOption("problema");
  await dir.getByLabel("Prioridad").selectOption("alta");
  await dir.getByLabel("Mensaje").fill("Desde ayer las familias no reciben el aviso de llegada.");
  await dir.getByRole("button", { name: "Enviar consulta" }).click();
  await dir.waitForURL(/\/soporte\/[0-9a-f-]{36}/);
  await expect(dir.getByTestId("asunto-ticket")).toHaveText(ASUNTO);
  await expect(dir.getByTestId("estado-ticket").first()).toContainText("Enviada");
  await capturar(dir, "colegio-hilo-nuevo");

  // 2. El super admin la ve en la bandeja, agrega una nota interna y responde.
  const kh = await entrar(browser, "admin@khipuescolar.demo", /admin\.lvh\.me:\d+\/$/);
  await kh.goto(`${PANEL}/mesa-ayuda`);
  await expect(kh.getByRole("heading", { name: "Mesa de ayuda", level: 1 })).toBeVisible();
  await expect(kh).toHaveTitle(/^\(\d+\) Mesa de ayuda/);
  const fila = kh.getByTestId("fila-bandeja").filter({ hasText: ASUNTO });
  await expect(fila).toContainText("Sin respuesta hace");
  await capturar(kh, "khipu-bandeja");
  await fila.getByRole("link", { name: ASUNTO }).click();
  await expect(kh.getByTestId("asunto-ticket")).toHaveText(ASUNTO);
  await expect(kh.getByTestId("abierta-por")).toContainText("direccion@nuevohorizonte.demo");

  await kh.getByRole("button", { name: "Nota interna" }).click();
  await kh.getByLabel("Nota interna").fill(NOTA);
  await kh.getByRole("button", { name: "Guardar nota" }).click();
  await expect(kh.getByTestId("nota-interna").filter({ hasText: NOTA })).toContainText("Nota interna · solo el equipo");

  await kh.getByRole("button", { name: "Responder al colegio" }).click();
  await kh.getByLabel("Tu mensaje").fill(RESPUESTA);
  await kh.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(kh.getByTestId("mensaje-soporte").filter({ hasText: RESPUESTA })).toBeVisible();
  await expect(kh.getByTestId("estado-ticket").first()).toContainText("Esperando al colegio");
  await capturar(kh, "khipu-detalle");

  // 3. La dirección ve la respuesta por sondeo (sin recargar), nunca la nota, y la marca como resuelta.
  await expect(dir.getByTestId("mensaje-soporte").filter({ hasText: RESPUESTA })).toBeVisible({ timeout: 15_000 });
  await expect(dir.getByText("Equipo Khipu ·").first()).toBeVisible();
  await expect(dir.getByText(NOTA)).toHaveCount(0);
  await dir.reload();
  await expect(dir.getByText(NOTA)).toHaveCount(0);
  await dir.getByRole("button", { name: "Marcar como resuelto" }).click();
  await dir.getByRole("button", { name: "Marcar como resuelta" }).click();
  await expect(dir.getByTestId("estado-ticket").first()).toContainText("Resuelta");
  await expect(dir.getByRole("heading", { name: "¿Cómo te atendimos?" })).toBeVisible();
  await capturar(dir, "colegio-hilo-resuelto");

  await dir.goto(`${COLEGIO}/soporte`);
  await expect(dir.getByTestId("fila-ticket").filter({ hasText: ASUNTO })).toContainText("Resuelta");
  await capturar(dir, "colegio-lista");
});

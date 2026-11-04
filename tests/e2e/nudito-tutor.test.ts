import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";
import { NUDITO_PLUS_DISPONIBLE } from "../../src/lib/planes";

// Tutor Nudito (specs/41) con la cuenta demo de Lucas (alumno 5.° A de Nuevo Horizonte).
// El módulo usa la clave interna `nudito_plus`, hoy apagada en el producto (NUDITO_PLUS_DISPONIBLE = false): el servidor de
// e2e no puede encenderla, así que estas pruebas se saltan hasta activarlo (la lógica la cubre
// tests/integracion/nudito-sesiones.test.ts). Para correrlas a mano: cambiar la constante en local, sin commitear.
test.skip(!NUDITO_PLUS_DISPONIBLE, "Nudito desactivado en el producto (NUDITO_PLUS_DISPONIBLE = false)");

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const LUCAS = "lucas.huaman@nuevohorizonte.demo";

async function sql<T extends Record<string, unknown>>(texto: string, valores: unknown[] = []): Promise<T[]> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    return (await cliente.query<T>(texto, valores)).rows;
  } finally {
    await cliente.end();
  }
}

/** Lo que este archivo cambia en la BD demo, para dejarla como estaba. */
const restaurar = { tenantId: "", configPrevia: null as null | { activo: boolean }, configCreada: false, consentimientoId: null as string | null };

async function entrar(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(LUCAS);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
}

test.beforeAll(async () => {
  const [{ id: tenantId }] = await sql<{ id: string }>("select id from tenants where slug = 'nuevohorizonte'");
  restaurar.tenantId = tenantId;
  // Nudito activo en el colegio (sin fila = apagado, specs/44).
  const [previa] = await sql<{ activo: boolean }>("select activo from nudito_config_colegio where tenant_id = $1", [tenantId]);
  if (previa) {
    restaurar.configPrevia = previa;
    await sql("update nudito_config_colegio set activo = true, bloqueado_plataforma = false, updated_at = now() where tenant_id = $1", [tenantId]);
  } else {
    restaurar.configCreada = true;
    await sql("insert into nudito_config_colegio (id, tenant_id, activo, updated_at) values (gen_random_uuid(), $1, true, now())", [tenantId]);
  }
  // Consentimiento de IA vigente de un apoderado de Lucas (solo si no lo tiene ya).
  const [config] = await sql<{ version: string | null }>("select valor->>'version' as version from config_plataforma where clave = 'nudito_plus:consentimiento'");
  const version = config?.version ?? "v1";
  const [lucas] = await sql<{ id: string }>(
    "select a.id from alumnos a join memberships m on m.id = a.cuenta_id join profiles p on p.id = m.user_id where p.email = $1 and a.tenant_id = $2",
    [LUCAS, tenantId],
  );
  const [vigente] = await sql("select id from consentimientos_ia where alumno_id = $1 and revocado_at is null and version_texto = $2", [lucas.id, version]);
  if (!vigente) {
    const [apoderado] = await sql<{ apoderado_id: string }>("select apoderado_id from apoderados_alumnos where alumno_id = $1 limit 1", [lucas.id]);
    const [fila] = await sql<{ id: string }>(
      "insert into consentimientos_ia (id, tenant_id, apoderado_id, alumno_id, version_texto) values (gen_random_uuid(), $1, $2, $3, $4) returning id",
      [tenantId, apoderado.apoderado_id, lucas.id, version],
    );
    restaurar.consentimientoId = fila.id;
  }
});

test.afterAll(async () => {
  if (!restaurar.tenantId) return;
  if (restaurar.configCreada) await sql("delete from nudito_config_colegio where tenant_id = $1", [restaurar.tenantId]);
  else if (restaurar.configPrevia) await sql("update nudito_config_colegio set activo = $2 where tenant_id = $1", [restaurar.tenantId, restaurar.configPrevia.activo]);
  if (restaurar.consentimientoId) await sql("delete from consentimientos_ia where id = $1", [restaurar.consentimientoId]);
});

test("el alumno practica un tema completo: curso, tema, repaso, ejercicio, pista y resultados", async ({ page }) => {
  await entrar(page);
  await page.goto(`${COLEGIO}/nudito`);
  await expect(page.getByText("Soy Nudito, un asistente con IA.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /¡Hola, Lucas!/ })).toBeVisible();

  await page.getByRole("button", { name: /Empecemos|Empezar algo nuevo/ }).click();
  await expect(page.getByRole("heading", { name: "¿Qué curso practicamos?" })).toBeFocused();
  await page.getByRole("list").getByRole("button").first().click();

  await expect(page.getByRole("heading", { name: /¿Qué tema de/ })).toBeVisible();
  await page.getByRole("list").getByRole("button").filter({ hasNotText: "Otro tema" }).first().click();

  await expect(page.getByRole("heading", { name: /Repasemos:/ })).toBeVisible();
  await page.getByRole("button", { name: "Explícame otra vez" }).click();
  await page.getByRole("button", { name: "¡A practicar!" }).click();

  await expect(page.getByText(/Ejercicio 1 de \d+/)).toBeVisible();
  await page.getByRole("button", { name: "Dame una pista" }).click();
  await expect(page.getByText(/Pista 1 · quedan 2/)).toBeVisible();

  // La solución nunca llega al cliente: el HTML no trae «solucion» ni «pistas».
  expect(await page.content()).not.toMatch(/"solucion"|"distractores"/);

  await page.getByRole("button", { name: "Terminar" }).click();
  await expect(page.getByRole("heading", { name: "¡Terminaste la práctica!" })).toBeVisible();
  await expect(page.getByText("aciertos")).toBeVisible();
});

test("móvil: bienvenida y tarjetas de curso visibles, sin scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await entrar(page);
  await page.goto(`${COLEGIO}/nudito`);
  await expect(page.getByRole("heading", { name: /¡Hola, Lucas!/ })).toBeVisible();
  await page.getByRole("button", { name: /Empecemos|Empezar algo nuevo/ }).click();
  await expect(page.getByRole("heading", { name: "¿Qué curso practicamos?" })).toBeVisible();
  await expect(page.getByRole("list").getByRole("button").first()).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});

test("/nudito-plus/chat redirige a /nudito", async ({ page }) => {
  await entrar(page);
  await page.goto(`${COLEGIO}/nudito-plus/chat`);
  await page.waitForURL(`${COLEGIO}/nudito`);
  await expect(page.getByRole("heading", { name: "Nudito", exact: true })).toBeVisible();
});

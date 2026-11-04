import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";
import { NUDITO_LICENCIAS_FAMILIARES } from "../../src/lib/planes";

// Flujo histórico de Nudito+ con licencia familiar (specs/28–29): se salta mientras las licencias familiares estén
// apagadas; la lógica inerte sigue cubierta por tests/integracion/nudito-plus-*.test.ts.
test.skip(!NUDITO_LICENCIAS_FAMILIARES, "el chat /nudito-plus/chat con licencia familiar fue reemplazado por el tutor /nudito (specs/41, specs/44)");

// Nudito+ · tutor (specs/29). Crea en Nuevo Horizonte su propio alumno con cuenta (5.° A), una familia con un hijo
// sin cuenta (3.° B), licencias de prueba, consentimientos de IA y un sitio permitido; borra todo al terminar.
// Con CAPTURAS_DIR=<carpeta> guarda capturas de escritorio y de 390 px.
const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const azar = Date.now().toString(36);
const CLAVE = `Nudito-${azar}-2026`;
const ALUMNO = { nombres: `Kiara${azar}`, email: `kiara-${azar}@test-nudito.demo` };
const FAMILIA = { email: `familia-${azar}@test-nudito.demo` };
const HIJO = { nombres: `Bruno${azar}` };
const SITIO = `e2e-${azar}.edu.pe`;
const ids = { alumno: randomUUID(), hijo: randomUUID(), alumnoUser: "", familiaUser: "", cuentaAlumno: randomUUID(), apoderado: randomUUID() };

async function sql<T extends Record<string, unknown>>(texto: string, valores: unknown[] = []): Promise<T[]> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    return (await cliente.query<T>(texto, valores)).rows;
  } finally {
    await cliente.end();
  }
}

const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const CLAVE_SERVICIO = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const cabeceras = { apikey: CLAVE_SERVICIO, Authorization: `Bearer ${CLAVE_SERVICIO}`, "Content-Type": "application/json" };

async function crearUsuarioAuth(email: string): Promise<string> {
  const res = await fetch(`${SUPABASE}/auth/v1/admin/users`, { method: "POST", headers: cabeceras, body: JSON.stringify({ email, password: CLAVE, email_confirm: true }) });
  const json = (await res.json()) as { id: string };
  if (!json.id) throw new Error(`No se creó ${email}`);
  return json.id;
}

async function entrar(page: Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
}

async function capturas(page: Page, nombre: string) {
  const dir = process.env.CAPTURAS_DIR;
  if (!dir) return;
  await page.screenshot({ path: `${dir}/${nombre}-escritorio.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${dir}/${nombre}-390.png`, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
}

test.beforeAll(async () => {
  const [{ tenant_id }] = await sql<{ tenant_id: string }>("select id as tenant_id from tenants where slug = 'nuevohorizonte'");
  const [{ id: salon5 }] = await sql<{ id: string }>("select id from salones where tenant_id = $1 and nombre like '5%' order by nombre limit 1", [tenant_id]);
  const [{ id: salon3 }] = await sql<{ id: string }>("select id from salones where tenant_id = $1 and nombre like '3%' order by nombre limit 1", [tenant_id]);
  ids.alumnoUser = await crearUsuarioAuth(ALUMNO.email);
  ids.familiaUser = await crearUsuarioAuth(FAMILIA.email);
  await sql("insert into profiles (id, email, nombres, apellidos) values ($1, $2, $3, 'Prueba Nudito'), ($4, $5, 'Familia', 'Prueba Nudito')", [ids.alumnoUser, ALUMNO.email, ALUMNO.nombres, ids.familiaUser, FAMILIA.email]);
  await sql("insert into memberships (id, tenant_id, user_id, rol) values ($1, $2, $3, 'alumno'), ($4, $2, $5, 'apoderado')", [ids.cuentaAlumno, tenant_id, ids.alumnoUser, ids.apoderado, ids.familiaUser]);
  await sql("insert into alumnos (id, tenant_id, salon_id, nombres, apellidos, cuenta_id) values ($1, $2, $3, $4, 'Prueba Nudito', $5), ($6, $2, $7, $8, 'Prueba Nudito', null)", [ids.alumno, tenant_id, salon5, ALUMNO.nombres, ids.cuentaAlumno, ids.hijo, salon3, HIJO.nombres]);
  const [{ id: consentimiento }] = await sql<{ id: string }>("insert into consentimientos (id, tenant_id, apoderado_id, version_texto) values (gen_random_uuid(), $1, $2, 'e2e') returning id", [tenant_id, ids.apoderado]);
  // El consentimiento de IA solo vale para la versión vigente del texto (specs/28; por defecto «v1»).
  const [config] = await sql<{ version: string | null }>("select valor->>'version' as version from config_plataforma where clave = 'nudito_plus:consentimiento'");
  const versionIa = config?.version ?? "v1";
  for (const alumno of [ids.alumno, ids.hijo]) {
    await sql("insert into apoderados_alumnos (id, tenant_id, apoderado_id, alumno_id, consentimiento_id) values (gen_random_uuid(), $1, $2, $3, $4)", [tenant_id, ids.apoderado, alumno, consentimiento]);
    await sql("insert into licencias_nudito (id, tenant_id, alumno_id, origen, desde, hasta, registrada_por, updated_at) values (gen_random_uuid(), $1, $2, 'prueba', current_date - 1, current_date + 30, $3, now())", [tenant_id, alumno, randomUUID()]);
    await sql("insert into consentimientos_ia (id, tenant_id, apoderado_id, alumno_id, version_texto) values (gen_random_uuid(), $1, $2, $3, $4)", [tenant_id, ids.apoderado, alumno, versionIa]);
  }
  await sql("insert into sitios_permitidos (id, dominio, nombre, creado_por, updated_at) values (gen_random_uuid(), $1, 'Sitio e2e', $2, now())", [SITIO, randomUUID()]);
});

test.afterAll(async () => {
  await sql("delete from alumnos where id = any($1::uuid[])", [[ids.alumno, ids.hijo]]);
  await sql("delete from auditoria where actor_id = any($1::uuid[])", [[ids.alumnoUser, ids.familiaUser].filter(Boolean)]);
  await sql("delete from profiles where id = any($1::uuid[])", [[ids.alumnoUser, ids.familiaUser].filter(Boolean)]);
  await sql("delete from sitios_permitidos where dominio = $1", [SITIO]);
  for (const id of [ids.alumnoUser, ids.familiaUser].filter(Boolean)) await fetch(`${SUPABASE}/auth/v1/admin/users/${id}`, { method: "DELETE", headers: cabeceras });
});

test("el alumno con licencia conversa con Nudito+ y recibe una guía con un enlace permitido", async ({ page }) => {
  await entrar(page, ALUMNO.email);
  await page.getByRole("link", { name: "Nudito+" }).first().click();
  await page.waitForURL(`${COLEGIO}/nudito-plus/chat`);
  await expect(page.getByTestId("aviso-ia")).toHaveText("Soy Nudito, un asistente con IA. Te ayudo a aprender; no reemplazo a tu profesor.");

  const entrada = page.getByLabel("Escribe tu mensaje a Nudito");
  await entrada.fill("No entiendo las fracciones");
  await entrada.press("Enter");
  const respuesta = page.locator('[data-autor="nudito"]').last();
  await expect(respuesta).toContainText("¿qué fracción comiste?");
  const href = await respuesta.getByRole("link").first().getAttribute("href");
  const dominios = (await sql<{ dominio: string }>("select dominio from sitios_permitidos where activo")).map((s) => s.dominio);
  const host = new URL(href!).hostname.replace(/^www\./, "");
  expect(dominios.some((d) => host === d || host.endsWith(`.${d}`))).toBe(true);
  await expect(entrada).toBeFocused();

  // La conversación queda en su historial.
  await page.reload();
  await expect(page.getByRole("link", { name: /No entiendo las fracciones/ }).first()).toBeAttached();
  await capturas(page, "nudito-plus-alumno");
});

test("la familia abre el modo hijo para su hijo sin cuenta y él conversa", async ({ page }) => {
  await entrar(page, FAMILIA.email);
  await page.goto(`${COLEGIO}/nudito-plus/hijo/${ids.hijo}`);
  await expect(page.getByTestId("banner-modo-hijo")).toContainText(`Modo hijo: está usando Nudito+ ${HIJO.nombres}`);
  await expect(page.getByRole("link", { name: "Salir del modo hijo" })).toBeVisible();
  await page.getByRole("button", { name: "¡Hola, Nudito!" }).click();
  await expect(page.locator('[data-autor="nudito"]').last()).toContainText(`¡Hola, ${HIJO.nombres}! Soy Nudito`);
  await capturas(page, "nudito-plus-modo-hijo");

  // Su otro hijo tiene cuenta propia: no hay modo hijo para él.
  await page.goto(`${COLEGIO}/nudito-plus/hijo/${ids.alumno}`);
  await expect(page.getByText(`${ALUMNO.nombres} ya tiene su propia cuenta`)).toBeVisible();
});

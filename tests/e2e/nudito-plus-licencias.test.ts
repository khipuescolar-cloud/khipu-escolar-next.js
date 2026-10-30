import "dotenv/config";
import { randomInt } from "node:crypto";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";

// Nudito+ (specs/28): Rosa reporta un Yape para Mateo (Nuevo Horizonte) y acepta la autorización de IA; el super
// administrador verifica el pago en admin.lvh.me; Rosa ve «Activa hasta …». Usa los datos demo y deja todo como estaba:
// guarda las licencias y consentimientos de Mateo antes y los restaura al terminar.

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `lvh.me:${PUERTO}`;
const REFERENCIA = String(randomInt(10_000_000, 99_999_999));
const colegio = (ruta: string) => `http://nuevohorizonte.${BASE}${ruta}`;

type Licencia = { id: string; estado: string; desde: string; hasta: string; notas: string | null };
let alumnoId = "";
let licenciasAntes: Licencia[] = [];
let consentimientosRevocados: string[] = [];
const inicio = new Date();

async function conBd<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

test.beforeAll(async () => {
  await conBd(async (c) => {
    const { rows } = await c.query<{ id: string }>(
      `select a.id::text from alumnos a
         join apoderados_alumnos aa on aa.alumno_id = a.id
         join memberships m on m.id = aa.apoderado_id
         join profiles p on p.id = m.user_id
         join tenants t on t.id = a.tenant_id
       where p.email = 'rosa.quispe@gmail.com' and t.slug = 'nuevohorizonte' order by a.nombres limit 1`,
    );
    alumnoId = rows[0].id;
    licenciasAntes = (await c.query<Licencia>(`select id::text, estado::text, desde::text, hasta::text, notas from licencias_nudito where alumno_id = $1`, [alumnoId])).rows;
    // Para probar el flujo de autorización, se retiran (temporalmente) los consentimientos vigentes de Mateo.
    consentimientosRevocados = (await c.query<{ id: string }>(`update consentimientos_ia set revocado_at = now() where alumno_id = $1 and revocado_at is null returning id::text`, [alumnoId])).rows.map((r) => r.id);
  });
});

test.afterAll(async () => {
  await conBd(async (c) => {
    const pagos = (await c.query<{ id: string }>(`select id::text from pagos_nudito where referencia = $1`, [REFERENCIA])).rows.map((r) => r.id);
    await c.query(`delete from avisos where referencia_id = any($1::text[])`, [pagos.map((id) => `nudito-pago:${id}`)]);
    await c.query(`delete from auditoria_plataforma where accion like 'nudito_%' and detalle->>'pagoId' = any($1::text[])`, [pagos]);
    await c.query(`delete from pagos_nudito where referencia = $1`, [REFERENCIA]);
    await c.query(`delete from licencias_nudito where alumno_id = $1 and not (id = any($2::uuid[]))`, [alumnoId, licenciasAntes.map((l) => l.id)]);
    for (const l of licenciasAntes) {
      await c.query(`update licencias_nudito set estado = $2::"EstadoLicenciaNudito", desde = $3::date, hasta = $4::date, notas = $5 where id = $1`, [l.id, l.estado, l.desde, l.hasta, l.notas]);
    }
    await c.query(`delete from consentimientos_ia where alumno_id = $1 and aceptado_at >= $2`, [alumnoId, inicio]);
    await c.query(`update consentimientos_ia set revocado_at = null where id = any($1::uuid[])`, [consentimientosRevocados]);
  });
});

async function entrar(page: Page, correo: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function entrarComoRosa(page: Page) {
  await entrar(page, "rosa.quispe@gmail.com");
  await page.waitForURL("**/elegir-colegio");
  await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  await page.waitForURL(colegio("/inicio"));
}

test("Rosa paga con Yape y autoriza; el equipo Khipu verifica y la licencia queda activa", async ({ page }) => {
  await entrarComoRosa(page);
  await page.goto(colegio("/nudito-plus"));
  await expect(page.getByRole("heading", { name: "Nudito+", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /^(Activar Nudito\+|Renovar)$/ }).first().click();
  await page.waitForURL(colegio(`/nudito-plus/${alumnoId}/activar`));
  await expect(page.getByTestId("yape-numero")).toBeVisible();
  await page.getByLabel("Meses que pagaste").selectOption("1");
  await page.getByLabel("Número de operación").fill(REFERENCIA);
  await page.getByRole("button", { name: "Enviar pago para revisión" }).click();
  await page.waitForURL(new RegExp(`/nudito-plus/${alumnoId}\\?ok=`));
  await expect(page.getByText("Recibimos tu pago")).toBeVisible();
  await expect(page.getByText(REFERENCIA)).toBeVisible();

  // Autorización de IA (se guarda con la IP).
  await page.getByRole("link", { name: "Leer y autorizar" }).click();
  await page.getByRole("button", { name: "Acepto y autorizo" }).click();
  await page.waitForURL(new RegExp(`/nudito-plus/${alumnoId}\\?ok=`));
  await expect(page.getByText("Autorizado", { exact: true })).toBeVisible();

  // El super administrador verifica el pago en el panel.
  await entrar(page, "admin@khipuescolar.demo");
  await page.waitForURL(`http://admin.${BASE}/`);
  await page.goto(`http://admin.${BASE}/nudito-plus`);
  const tarjeta = page.getByTestId(`pago-${REFERENCIA}`);
  await expect(tarjeta).toBeVisible();
  await tarjeta.getByRole("button", { name: "Verificar" }).click();
  await page.getByRole("button", { name: "Verificar y activar" }).click();
  await expect(page.getByText(/Pago verificado\. Licencia (activa|extendida) hasta el/)).toBeVisible();
  await expect(page.getByTestId(`pago-${REFERENCIA}`)).toHaveCount(0);

  // Rosa ve la licencia activa.
  await entrarComoRosa(page);
  await page.goto(colegio(`/nudito-plus/${alumnoId}`));
  await expect(page.getByTestId("estado-nudito")).toHaveText(/Activa hasta \d{2}\/\d{2}\/\d{4}/);
  await expect(page.getByRole("link", { name: "Usar en modo hijo" })).toBeVisible();
});

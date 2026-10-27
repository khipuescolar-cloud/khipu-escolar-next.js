import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";

// Dirección crea la cuenta propia de un alumno; el alumno entra con su DNI, cambia la contraseña y ve su inicio.
// Crea su propio alumno y su apoderado (con consentimiento) en Nuevo Horizonte y los borra al terminar: no toca el seed.
const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const azar = Date.now().toString(36);
const ALUMNO = { nombres: `Tito${azar}`, apellidos: "Prueba Alumno", email: `alumno-${azar}@test-alumno.demo`, dni: String(40000000 + (Date.now() % 9999999)) };
const ids = { alumno: randomUUID(), apoderadoUser: randomUUID(), apoderado: randomUUID() };

async function sql<T extends Record<string, unknown>>(texto: string, valores: unknown[] = []): Promise<T[]> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    return (await cliente.query<T>(texto, valores)).rows;
  } finally {
    await cliente.end();
  }
}

async function entrar(page: Page, correo: string, clave: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.beforeAll(async () => {
  const [{ tenant_id, salon_id }] = await sql<{ tenant_id: string; salon_id: string }>(
    "select t.id as tenant_id, s.id as salon_id from tenants t join salones s on s.tenant_id = t.id where t.slug = 'nuevohorizonte' and s.nombre like '3%B%' limit 1",
  );
  await sql("insert into profiles (id, email, nombres, apellidos) values ($1, $2, 'Apoderada', 'Prueba Alumno')", [ids.apoderadoUser, `apo-${azar}@test-alumno.demo`]);
  await sql("insert into memberships (id, tenant_id, user_id, rol) values ($1, $2, $3, 'apoderado')", [ids.apoderado, tenant_id, ids.apoderadoUser]);
  const [{ id: consentimiento }] = await sql<{ id: string }>("insert into consentimientos (id, tenant_id, apoderado_id, version_texto) values (gen_random_uuid(), $1, $2, 'e2e') returning id", [tenant_id, ids.apoderado]);
  await sql("insert into alumnos (id, tenant_id, salon_id, nombres, apellidos) values ($1, $2, $3, $4, $5)", [ids.alumno, tenant_id, salon_id, ALUMNO.nombres, ALUMNO.apellidos]);
  await sql("insert into apoderados_alumnos (id, tenant_id, apoderado_id, alumno_id, consentimiento_id) values (gen_random_uuid(), $1, $2, $3, $4)", [tenant_id, ids.apoderado, ids.alumno, consentimiento]);
});

test.afterAll(async () => {
  const cuentas = await sql<{ id: string }>("select id from profiles where email = $1", [ALUMNO.email]);
  await sql("delete from auditoria where entidad_id = $1", [ids.alumno]);
  await sql("delete from avisos where destinatario = $1", [ALUMNO.email]);
  await sql("delete from alumnos where id = $1", [ids.alumno]);
  await sql("delete from profiles where id = any($1::uuid[])", [[ids.apoderadoUser, ...cuentas.map((c) => c.id)]]);
  for (const { id } of cuentas) {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
  }
});

test("dirección crea la cuenta del alumno; el alumno entra con su DNI, cambia la contraseña y ve solo lo suyo", async ({ page, browser }) => {
  const nombre = `${ALUMNO.nombres} ${ALUMNO.apellidos}`;
  await entrar(page, "direccion@nuevohorizonte.demo", "demo123");
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/gestion/alumnos`);
  await page.getByRole("button", { name: `Acciones para ${nombre}` }).click();
  await page.getByRole("menuitem", { name: "Crear cuenta del alumno" }).click();
  await page.getByLabel("Correo del alumno").fill(ALUMNO.email);
  await page.getByLabel("Número de documento").fill(ALUMNO.dni);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page.getByText(/Cuenta del alumno creada/)).toBeVisible();

  const ctx = await browser.newContext({ baseURL: `http://lvh.me:${PUERTO}` });
  const p2 = await ctx.newPage();
  await entrar(p2, ALUMNO.email, ALUMNO.dni);
  await p2.waitForURL("**/cambiar-password**");
  await p2.getByLabel("Nueva contraseña").fill("ClaveAlumno2026");
  await p2.getByLabel("Repite la contraseña").fill("ClaveAlumno2026");
  await p2.getByRole("button", { name: "Guardar y entrar" }).click();
  await p2.waitForURL(`${COLEGIO}/inicio`);
  await expect(p2.getByRole("heading", { name: `Hola, ${ALUMNO.nombres}` })).toBeVisible();
  const main = p2.getByRole("main");
  for (const t of ["Mi asistencia", "Comunicados", "Notas", "Libreta", "Tareas", "Agenda"]) await expect(main.getByText(t, { exact: true })).toBeVisible();
  for (const t of ["Mensajes", "Nudito", "Gestión"]) await expect(main.getByText(t, { exact: true })).toHaveCount(0);

  await p2.goto(`${COLEGIO}/tareas`);
  await expect(p2.getByRole("heading", { name: "Tareas" })).toBeVisible();
  await expect(p2.getByText("Lo que tienes que entregar.")).toBeVisible();
  await esperarSinAcceso(p2, await p2.goto(`${COLEGIO}/mensajes`));
  await esperarSinAcceso(p2, await p2.goto(`${COLEGIO}/gestion/alumnos`));
  await esperarSinAcceso(p2, await p2.goto(`${COLEGIO}/nudito`));
  await ctx.close();
});

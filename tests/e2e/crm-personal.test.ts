import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const azar = Date.now().toString(36);
const PROFE = { email: `profe-${azar}@test-crm.demo`, dni: String(60000000 + (Date.now() % 9999999)) };
const SECRE = { email: `secre-${azar}@test-crm.demo`, dni: String(50000000 + (Date.now() % 9999999)) };
const EMAILS = [PROFE.email, SECRE.email];

async function entrar(page: Page, correo: string, clave: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function correoPara(email: string) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const json = (await res.json()) as { messages: { ID: string }[] };
    if (json.messages.length > 0) return (await (await fetch(`${MAILPIT}/api/v1/message/${json.messages[0].ID}`)).json()) as { Text: string; Subject: string };
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó el correo a ${email}`);
}

test.afterAll(async () => {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  const { rows } = await cliente.query<{ id: string }>("select id from profiles where email = any($1)", [EMAILS]);
  const ids = rows.map((r) => r.id);
  await cliente.query("delete from auditoria where entidad_id in (select id::text from memberships where user_id = any($1::uuid[]))", [ids]);
  await cliente.query("delete from avisos where destinatario = any($1)", [EMAILS]);
  await cliente.query("delete from profiles where id = any($1::uuid[])", [ids]);
  await cliente.end();
  for (const id of ids) {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
  }
  const todos = await (await fetch(`${MAILPIT}/api/v1/messages?limit=200`)).json() as { messages: { ID: string; To: { Address: string }[] }[] };
  const mios = todos.messages.filter((m) => m.To.some((t) => EMAILS.includes(t.Address))).map((m) => m.ID);
  if (mios.length) await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ IDs: mios }) });
});

test("dirección registra un profesor con DNI; recibe la bienvenida y entra con el DNI cambiando la contraseña", async ({ page, browser }) => {
  await entrar(page, "direccion@nuevohorizonte.demo", "demo123");
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/gestion/profesores`);
  await expect(page.getByRole("heading", { name: "Profesores", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Agregar profesor" }).click();
  await page.getByLabel("Nombres").fill("Elena");
  await page.getByLabel("Apellidos").fill("Prueba Crm");
  await page.getByLabel("Número de documento").fill(PROFE.dni);
  await page.getByLabel("Correo", { exact: true }).fill(PROFE.email);
  await page.getByLabel("Teléfono").fill("987654321");
  await page.getByLabel("Cargo").fill("Docente de Arte");
  await page.getByRole("button", { name: "Registrar y enviar bienvenida" }).click();
  await expect(page.getByText(/Profesor\(a\) registrado\(a\)/)).toBeVisible();

  // Aparece en la lista (con su documento) y su ficha se abre.
  await page.getByLabel("Buscar").fill(PROFE.dni);
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByRole("link", { name: "Prueba Crm, Elena" })).toBeVisible();
  await expect(page.getByText(`DNI ${PROFE.dni}`)).toBeVisible();
  await page.getByRole("link", { name: "Prueba Crm, Elena" }).click();
  await expect(page.getByRole("heading", { name: "Elena Prueba Crm" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historial de cambios" })).toBeVisible();

  // La bienvenida llega a Mailpit y no lleva el DNI.
  const correo = await correoPara(PROFE.email);
  expect(correo.Subject).toContain("Bienvenido");
  expect(correo.Text).toContain(PROFE.email);
  expect(correo.Text).not.toContain(PROFE.dni);

  // La profesora entra con su DNI y debe cambiar la contraseña.
  const ctx = await browser.newContext({ baseURL: `http://lvh.me:${PUERTO}` });
  const p2 = await ctx.newPage();
  await entrar(p2, PROFE.email, PROFE.dni);
  await p2.waitForURL("**/cambiar-password**");
  await p2.getByLabel("Nueva contraseña").fill(PROFE.dni);
  await p2.getByLabel("Repite la contraseña").fill(PROFE.dni);
  await p2.getByRole("button", { name: "Guardar y entrar" }).click();
  await expect(p2.getByText("No uses tu número de documento como contraseña.")).toBeVisible();
  await p2.getByLabel("Nueva contraseña").fill("ClaveNueva2026");
  await p2.getByLabel("Repite la contraseña").fill("ClaveNueva2026");
  await p2.getByRole("button", { name: "Guardar y entrar" }).click();
  await p2.waitForURL(`${COLEGIO}/inicio`);
  await expect(p2.getByRole("heading", { name: "Hola, Elena" })).toBeVisible();
  // Un profesor no entra a la gestión (403).
  await esperarSinAcceso(p2, await p2.goto(`${COLEGIO}/gestion/profesores`));
  await ctx.close();
});

test("personal administrativo: dirección lo registra y ve su inicio con Comunicados; grados y hub", async ({ page, browser }) => {
  await entrar(page, "direccion@nuevohorizonte.demo", "demo123");
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/gestion/personal`);
  await expect(page.getByRole("heading", { name: "Personal", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Agregar personal" }).click();
  await page.getByLabel("Rol").selectOption("administrativo");
  await page.getByLabel("Nombres").fill("Sara");
  await page.getByLabel("Apellidos").fill("Secretaria Crm");
  await page.getByLabel("Número de documento").fill(SECRE.dni);
  await page.getByLabel("Correo", { exact: true }).fill(SECRE.email);
  await page.getByLabel("Cargo").fill("Secretaria");
  await page.getByRole("button", { name: "Registrar y enviar bienvenida" }).click();
  await expect(page.getByText(/Persona registrada/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "Secretaria", exact: true })).toBeVisible();

  await page.goto(`${COLEGIO}/gestion/salones`);
  await expect(page.getByRole("heading", { name: "Grados y salones", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Primaria" })).toBeVisible();
  await page.goto(`${COLEGIO}/gestion`);
  for (const t of ["Profesores", "Personal", "Grados y salones", "Alumnos", "Familias", "Carnets"]) {
    await expect(page.getByRole("link", { name: new RegExp(`^${t}`) }).first()).toBeVisible();
  }

  const ctx = await browser.newContext({ baseURL: `http://lvh.me:${PUERTO}` });
  const p2 = await ctx.newPage();
  await entrar(p2, SECRE.email, SECRE.dni);
  await p2.waitForURL("**/cambiar-password**");
  await p2.getByLabel("Nueva contraseña").fill("ClaveNueva2026");
  await p2.getByLabel("Repite la contraseña").fill("ClaveNueva2026");
  await p2.getByRole("button", { name: "Guardar y entrar" }).click();
  await p2.waitForURL(`${COLEGIO}/inicio`);
  await expect(p2.getByRole("heading", { name: "Hola, Sara" })).toBeVisible();
  await expect(p2.getByText("Personal administrativo")).toBeVisible();
  await p2.getByRole("main").getByRole("link", { name: /Comunicados/ }).click();
  await expect(p2.getByRole("heading", { name: "Comunicados" })).toBeVisible();
  await esperarSinAcceso(p2, await p2.goto(`${COLEGIO}/gestion/personal`));
  // Permisos del administrativo: alumnos y familias sí; profesores, salones y configuración no; el chat tampoco.
  await p2.goto(`${COLEGIO}/gestion/alumnos`);
  await expect(p2.getByRole("heading", { name: "Alumnos", exact: true })).toBeVisible();
  await p2.goto(`${COLEGIO}/gestion/apoderados`);
  await expect(p2.getByRole("heading", { name: "Familias", exact: true })).toBeVisible();
  await p2.getByLabel("Buscar familia").fill("zzz-no-existe");
  await p2.getByRole("button", { name: "Buscar" }).click();
  await expect(p2.getByText("No encontramos familias con esa búsqueda")).toBeVisible();
  for (const ruta of ["gestion/profesores", "gestion/salones", "configuracion", "mensajes"]) {
    await esperarSinAcceso(p2, await p2.goto(`${COLEGIO}/${ruta}`), ruta);
  }
  await ctx.close();
});

test("dirección archiva un salón y lo reactiva", async ({ page }) => {
  const nombre = `Archivo E2E ${azar}`;
  await entrar(page, "direccion@nuevohorizonte.demo", "demo123");
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/gestion/salones`);
  await page.getByRole("button", { name: "Crear salón" }).first().click();
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByRole("button", { name: "Crear salón" }).last().click();
  await expect(page.getByText("Salón creado.")).toBeVisible();
  const tarjeta = page.getByRole("main").locator("li", { hasText: nombre });
  await tarjeta.getByRole("button", { name: `Acciones para ${nombre}` }).click();
  await page.getByRole("menuitem", { name: "Archivar salón" }).click();
  await page.getByRole("button", { name: "Archivar salón" }).click();
  await expect(page.getByText("Salón archivado.")).toBeVisible();
  await expect(page.getByRole("main").getByText(nombre)).toHaveCount(0);
  await page.getByRole("link", { name: "Ver archivados" }).click();
  await expect(page.getByRole("main").getByText(nombre)).toBeVisible();
  await page.getByRole("button", { name: `Acciones para ${nombre}` }).click();
  await page.getByRole("menuitem", { name: "Reactivar salón" }).click();
  await page.getByRole("button", { name: "Reactivar salón" }).click();
  await expect(page.getByText("Salón reactivado.")).toBeVisible();

  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  await cliente.query("delete from auditoria where entidad = 'salon' and entidad_id in (select id::text from salones where nombre = $1)", [nombre]);
  await cliente.query("delete from salones where nombre = $1", [nombre]);
  await cliente.end();
});

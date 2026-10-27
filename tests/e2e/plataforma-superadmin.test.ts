import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { expect, test } from "@playwright/test";

// Super administrador (specs/16): crea un colegio con insignia y un administrador con DNI; el correo de
// bienvenida llega a Mailpit con el botón al subdominio; el nuevo administrador entra con correo + DNI,
// cambia su contraseña y llega al /inicio de su colegio. Al final borra el colegio y la cuenta de prueba.

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `lvh.me:${PUERTO}`;
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const sufijo = randomUUID().slice(0, 8);
const SLUG = `test-plat-${sufijo}`;
const EMAIL = `e2e-${sufijo}@test-plat.demo`;
const DNI = String(10_000_000 + Math.floor(Math.random() * 89_999_999));
const NOMBRE = `Colegio Prueba Plataforma ${sufijo}`;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

type Mensaje = { ID: string };

async function correoPara(email: string, ms = 30_000): Promise<{ HTML: string; Text: string; Subject: string }> {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const { messages } = (await res.json()) as { messages: Mensaje[] };
    if (messages.length > 0) return (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json();
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó el correo para ${email}`);
}

test.afterAll(async () => {
  try {
    execFileSync("pnpm", ["-s", "khipu:borrar-colegio", SLUG, "--confirmar", SLUG], { stdio: "ignore" });
  } catch {
    // Si la prueba falló antes de crear el colegio, no hay nada que borrar.
  }
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  const { rows } = await cliente.query<{ id: string }>("select id::text from auth.users where email = $1", [EMAIL]);
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  for (const { id } of rows) await supabase.auth.admin.deleteUser(id);
  await cliente.query("delete from profiles where email = $1", [EMAIL]);
  await cliente.query("delete from auditoria_plataforma where detalle->>'slug' = $1", [SLUG]);
  await cliente.end();
});

test("el super administrador crea un colegio y su administrador entra con correo + DNI", async ({ page }) => {
  // 1. Ingreso del super administrador → panel en admin.<dominio>.
  await page.goto("/login");
  await page.getByLabel("Correo").fill("admin@khipuescolar.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`http://admin.${BASE}/`);
  await expect(page.getByRole("link", { name: /Plataforma Khipu/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vista principal" })).toBeVisible();
  await expect(page.getByText("Apertura de la semana")).toBeVisible();

  // 2. Nuevo colegio: insignia, nombre, eslogan, subdominio y administrador principal.
  await page.getByRole("link", { name: "Nuevo colegio" }).first().click();
  await page.waitForURL(`http://admin.${BASE}/colegios/nuevo`);
  await page.getByLabel("Insignia o escudo").setInputFiles({ name: "insignia.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByAltText("Vista previa de la insignia")).toBeVisible();
  await page.getByLabel("Nombre del colegio").fill(NOMBRE);
  await expect(page.getByTestId("subdominio")).toHaveText(`colegio-prueba-plataforma-${sufijo}.${BASE}`);
  await page.getByLabel("Dirección (subdominio)").fill(SLUG);
  await expect(page.getByTestId("subdominio")).toHaveText(`${SLUG}.${BASE}`);
  await page.getByLabel("Eslogan (opcional)").fill("Crecemos juntos");
  await page.getByLabel("Ciudad").fill("Arequipa");
  await page.getByLabel(/^Correo/).fill(EMAIL);
  await page.getByLabel("Cargo").fill("Directora general");
  await page.getByLabel("Nombres", { exact: true }).fill("Elena");
  await page.getByLabel("Apellidos", { exact: true }).fill("Prueba");
  await page.getByLabel("Número de documento").fill(DNI);
  await page.getByRole("button", { name: "Crear colegio" }).click();

  await page.waitForURL(new RegExp(`^http://admin\\.${BASE.replace(".", "\\.")}/colegios/[0-9a-f-]{36}\\?ok=`));
  await expect(page.getByText("Colegio creado.")).toBeVisible();
  await expect(page.getByRole("heading", { name: NOMBRE })).toBeVisible();
  await expect(page.getByText("Crecemos juntos")).toBeVisible();
  await expect(page.getByAltText(`Insignia de ${NOMBRE}`)).toBeVisible();

  // 3. Correo de bienvenida: usuario = correo, contraseña = DNI (sin el número) y botón al subdominio.
  const correo = await correoPara(EMAIL);
  const urlBoton = `http://${SLUG}.${BASE}/inicio`;
  expect(correo.HTML).toContain(`href="${urlBoton}"`);
  expect(correo.HTML).toContain("Ingresar a Khipu Escolar");
  expect(correo.Text).toContain(EMAIL);
  expect(correo.Text).toContain("número de DNI");
  expect(correo.HTML).not.toContain(DNI);
  expect(correo.Text).not.toContain(DNI);

  // 4. Sale el super administrador; el nuevo administrador usa el botón del correo.
  await page.getByRole("button", { name: "Menú de tu cuenta" }).click();
  await page.getByRole("menuitem", { name: "Salir" }).click();
  await page.waitForURL("**/login");
  await page.goto(urlBoton);
  await page.waitForURL("**/login?colegio=*");
  await page.getByLabel("Correo").fill(EMAIL);
  await page.getByLabel("Contraseña").fill(DNI);
  await page.getByRole("button", { name: "Entrar" }).click();

  // 5. Primer ingreso: debe cambiar la contraseña (no puede contener el DNI).
  await page.waitForURL("**/cambiar-password**");
  await page.getByLabel("Nueva contraseña").fill(`x${DNI}y`);
  await page.getByLabel("Repite la contraseña").fill(`x${DNI}y`);
  await page.getByRole("button", { name: "Guardar y entrar" }).click();
  await expect(page.getByText("No uses tu número de documento como contraseña.")).toBeVisible();
  await page.getByLabel("Nueva contraseña").fill("Clave-segura-2026");
  await page.getByLabel("Repite la contraseña").fill("Clave-segura-2026");
  await page.getByRole("button", { name: "Guardar y entrar" }).click();

  // 6. Llega al inicio de su colegio, con el eslogan bajo el nombre.
  await page.waitForURL(urlBoton);
  await expect(page.getByRole("heading", { name: "Hola, Elena" })).toBeVisible();
  await expect(page.getByText("Crecemos juntos")).toBeVisible();
});

test("un usuario de colegio no puede entrar al panel de plataforma", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("direccion@losolivos.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`http://losolivos.${BASE}/inicio`);
  const res = await page.goto(`http://admin.${BASE}/`);
  expect(res?.status()).toBe(403);
  await expect(page.getByText("No tienes acceso a esta sección")).toBeVisible();
});

test("el super administrador entra a un colegio como soporte en solo lectura y sin chats", async ({ page }) => {
  const motivo = `Prueba e2e de soporte ${sufijo}`;
  try {
    await page.goto("/login");
    await page.getByLabel("Correo").fill("admin@khipuescolar.demo");
    await page.getByLabel("Contraseña").fill("demo123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(`http://admin.${BASE}/`);
    await expect(page.getByRole("heading", { name: "Ingresos diarios" })).toBeVisible();

    await page.goto(`http://admin.${BASE}/colegios?q=nuevohorizonte`);
    await page.getByRole("main").getByRole("link", { name: /Nuevo Horizonte/ }).first().click();
    await page.waitForURL(/\/colegios\/[0-9a-f-]{36}/);
    const ficha = page.url();

    await page.getByRole("button", { name: "Entrar como soporte" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("Motivo").fill(motivo);
    await dialogo.getByLabel("Duración").selectOption("30");
    await dialogo.getByRole("button", { name: "Entrar en solo lectura" }).click();

    await page.waitForURL(`http://nuevohorizonte.${BASE}/inicio`);
    await expect(page.getByTestId("banner-soporte")).toContainText("Modo soporte · solo lectura · vence a las");

    const res = await page.goto(`http://nuevohorizonte.${BASE}/mensajes`);
    expect(res?.status()).toBe(403);
    const notas = await page.goto(`http://nuevohorizonte.${BASE}/notas`);
    expect(notas?.status()).toBe(403);

    await page.goto(`http://nuevohorizonte.${BASE}/inicio`);
    await page.getByTestId("banner-soporte").getByRole("button", { name: "Terminar" }).click();
    await page.waitForURL(`${ficha.split("?")[0]}?ok=*`);
    await expect(page.getByText("Acceso de soporte terminado.")).toBeVisible();
    const sinAcceso = await page.goto(`http://nuevohorizonte.${BASE}/inicio`);
    expect(sinAcceso?.status()).toBe(403);
  } finally {
    const cliente = new Client({ connectionString: process.env.DATABASE_URL });
    await cliente.connect();
    const { rows } = await cliente.query<{ id: string }>("select id::text from accesos_soporte where motivo = $1", [motivo]);
    const ids = rows.map((r) => r.id);
    await cliente.query("delete from auditoria where accion = 'soporte_ver' and detalle->>'accesoId' = any($1::text[])", [ids]);
    await cliente.query("delete from auditoria_plataforma where detalle->>'accesoId' = any($1::text[])", [ids]);
    await cliente.query("delete from accesos_soporte where id = any($1::uuid[])", [ids]);
    await cliente.end();
  }
});

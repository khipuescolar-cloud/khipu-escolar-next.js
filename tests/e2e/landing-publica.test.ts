import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";

// Landing pública en la raíz del dominio (specs/25-landing-publica.md).
const PUERTO = process.env.E2E_PORT ?? "3000";
const RAIZ = `http://lvh.me:${PUERTO}`;
const MARCA = `e2e-landing-${Date.now()}`;

async function consultar<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    return (await c.query<T>(sql, params)).rows;
  } finally {
    await c.end();
  }
}

/** IP distinta por prueba: el límite de 3 envíos por hora y por IP no bloquea corridas repetidas. */
async function conIpUnica(page: Page) {
  const n = () => Math.floor(Math.random() * 250) + 1;
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `10.${n()}.${n()}.${n()}` });
}

test.afterAll(async () => {
  await consultar("delete from solicitudes_demo where correo like $1", [`${MARCA}%`]);
});

test("la raíz muestra la landing con sus secciones y los planes del catálogo", async ({ page }) => {
  await page.goto(`${RAIZ}/`);
  await expect(page).toHaveURL(`${RAIZ}/`);
  await expect(page).toHaveTitle("Khipu Escolar · Cada día de tu hijo, bien anudado.");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lo que pasa en el aula, le llega a la familia al toque.");
  await expect(page.locator("h1")).toHaveCount(1);
  for (const id of ["funciones", "como-funciona", "roles", "planes", "preguntas", "demo"]) {
    await expect(page.locator(`section#${id}`)).toHaveCount(1);
  }
  await expect(page.getByText("Programa piloto 2026: buscamos los primeros colegios")).toBeVisible();

  const planes = await consultar<{ nombre: string }>("select nombre from planes_catalogo where activo order by orden");
  const tarjetas = page.getByTestId("planes-landing").locator("> li");
  await expect(tarjetas).toHaveCount(planes.length);
  for (const [i, p] of planes.entries()) await expect(tarjetas.nth(i).getByRole("heading", { level: 3 })).toHaveText(p.nombre);

  // Capturas reales: la del hero carga de inmediato.
  const hero = page.locator("figure img").first();
  await expect(hero).toHaveAttribute("alt", /Asistencia del día/);
});

test("«Ingresar» lleva al login y «Quiero este plan» preselecciona el plan en el formulario", async ({ page }) => {
  await page.goto(`${RAIZ}/`);
  await page.getByRole("link", { name: "Quiero el plan Pro Max" }).click();
  await expect(page).toHaveURL(/\?plan=promax#demo$/);
  await expect(page.getByLabel(/Plan de interés/)).toHaveValue("promax");

  await page.getByRole("banner").getByRole("link", { name: "Ingresar" }).click();
  await page.waitForURL(`${RAIZ}/login`);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("el formulario de demo guarda la solicitud, pide el consentimiento y descarta a los bots", async ({ page }) => {
  await conIpUnica(page);
  await page.goto(`${RAIZ}/#demo`);
  const form = page.locator("section#demo form");
  const correo = `${MARCA}-persona@colegio.pe`;

  // Sin consentimiento ni datos: errores junto a los campos.
  await form.getByRole("button", { name: "Solicitar demo" }).click();
  await expect(form.getByText("Escribe tu nombre.")).toBeVisible();
  await expect(form.getByText("Marca la casilla para que podamos escribirte.")).toBeVisible();

  await form.getByLabel("Nombre y apellido").fill("Ana Torres");
  await form.getByLabel(/^Cargo/).fill("Directora");
  await form.getByLabel(/^Colegio/).fill("I.E.P. Prueba E2E");
  await form.getByLabel(/^Ciudad/).fill("Arequipa");
  await form.getByLabel(/^Correo/).fill(correo);
  await form.getByLabel(/^Teléfono/).fill("987 654 321");
  await form.getByLabel(/Número aproximado/).fill("320");
  await form.getByLabel(/Plan de interés/).selectOption("fase2");
  await form.getByLabel(/^Mensaje/).fill("Queremos verlo antes de diciembre.");
  await form.getByLabel(/Acepto que Khipu Escolar me contacte/).check();
  await form.getByRole("button", { name: "Solicitar demo" }).click();
  await expect(page.getByText("Gracias, Ana. Te escribiremos en menos de 1 día hábil.")).toBeVisible();

  const filas = await consultar<{ colegio: string; alumnos: number; plan_interes: string; ip_hash: string }>(
    "select colegio, alumnos, plan_interes, ip_hash from solicitudes_demo where correo = $1",
    [correo],
  );
  expect(filas).toHaveLength(1);
  expect(filas[0]).toMatchObject({ colegio: "I.E.P. Prueba E2E", alumnos: 320, plan_interes: "fase2" });
  expect(filas[0].ip_hash).not.toMatch(/^10\./);

  // Bot: llena el campo trampa. Ve la misma respuesta, pero no se guarda nada.
  const bot = await page.context().newPage();
  await conIpUnica(bot);
  await bot.goto(`${RAIZ}/#demo`);
  const fb = bot.locator("section#demo form");
  const correoBot = `${MARCA}-bot@spam.pe`;
  await fb.getByLabel("Nombre y apellido").fill("Robot");
  await fb.getByLabel(/^Colegio/).fill("Spam");
  await fb.getByLabel(/^Correo/).fill(correoBot);
  await fb.getByLabel(/Acepto que Khipu Escolar me contacte/).check();
  await bot.locator('input[name="sitio"]').evaluate((el: HTMLInputElement) => (el.value = "https://spam.example"));
  await fb.getByRole("button", { name: "Solicitar demo" }).click();
  await expect(bot.getByText("Gracias, Robot. Te escribiremos en menos de 1 día hábil.")).toBeVisible();
  expect(await consultar("select 1 from solicitudes_demo where correo = $1", [correoBot])).toHaveLength(0);
});

test("los subdominios de colegio y admin. no muestran la landing", async ({ page }) => {
  await page.goto(`http://nuevohorizonte.lvh.me:${PUERTO}/`);
  await expect(page.getByRole("heading", { name: "Lo que pasa en el aula, le llega a la familia al toque." })).toHaveCount(0);
  await expect(page).toHaveURL(/\/login/);

  await page.goto(`http://admin.lvh.me:${PUERTO}/`);
  await expect(page.getByRole("heading", { name: "Lo que pasa en el aula, le llega a la familia al toque." })).toHaveCount(0);
  await expect(page).toHaveURL(/\/login/);

  // Con sesión, la raíz del colegio sigue siendo su inicio.
  await page.goto(`${RAIZ}/login`);
  await page.getByLabel("Correo").fill("direccion@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/nuevohorizonte\.lvh\.me:\d+\/inicio/);
  await page.goto(`http://nuevohorizonte.lvh.me:${PUERTO}/`);
  await expect(page.getByRole("heading", { name: "Hola, Carmen" })).toBeVisible();
});

test("la página de privacidad explica los datos del formulario y está marcada como borrador", async ({ page }) => {
  await page.goto(`${RAIZ}/privacidad`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cómo usamos los datos de la solicitud de demo");
  await expect(page.getByText("Borrador pendiente de revisión por un abogado.")).toBeVisible();
});

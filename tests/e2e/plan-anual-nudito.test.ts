import "dotenv/config";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { NUDITO_TUTOR_DISPONIBLE } from "../../src/lib/planes";
import { crearColegioTemporal, sql, type ColegioTemporal } from "./ayudantes/colegio-temporal";

// Temario de Nudito por la UI: dos profesores aceptan y el alumno ve la versión habilitada (specs/48 y specs/49).
// Colegio temporal Khipu Pro con datos ficticios, preparado en `beforeAll` por SQL (como los demás e2e):
// - Ana Paredes (profesora A) y Bruno Castillo (profesor B) dictan Matemática en 5.° A y 5.° B de primaria.
// - Thiago Ficticio (alumno de 5.° B, con cuenta) y su apoderada con el consentimiento de IA vigente.
// - Nudito activo en `nudito_config_colegio`.
// Todo lo demás (crear el plan, designar coordinador, temas, revisión, publicación, materiales, lecciones, práctica y
// progreso) pasa por la interfaz. Lo único que se hace fuera de la UI es leer la solución del ejercicio abierto en la BD
// para responder bien o mal (el cliente nunca la recibe), igual que en `nudito-tutor.test.ts`.
test.skip(!NUDITO_TUTOR_DISPONIBLE, "Nudito desactivado en el producto");
test.describe.configure({ mode: "serial" });

const PUERTO = process.env.E2E_PORT ?? "3000";
const ANIO = Number(new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }).slice(0, 4));

let c: ColegioTemporal;
let correos: { a: string; b: string; direccion: string; alumno: string };
let alumnoId = "";
let planId = "";

const url = (ruta: string) => `http://${c.slug}.lvh.me:${PUERTO}${ruta}`;

test.beforeAll(async () => {
  c = await crearColegioTemporal({ plan: "pro", prefijo: "e2e-plan-anual" });
  const profesorB = await c.miembro("profesor", `profesor.b@${c.dominio}`, "Bruno", "Castillo");
  const alumnoCuenta = await c.miembro("alumno", `alumno@${c.dominio}`, "Thiago", "Ficticio");
  const apoderada = await c.miembro("apoderado", `familia@${c.dominio}`, "Marta", "Ficticia");
  correos = { a: c.correos.profesor, b: `profesor.b@${c.dominio}`, direccion: c.correos.direccion, alumno: `alumno@${c.dominio}` };

  const salon = async (seccion: string) => (await sql<{ id: string }>(
    "insert into salones (id, tenant_id, nombre, nivel, grado, seccion, anio) values (gen_random_uuid(), $1, $2, 'primaria', 5, $3, $4) returning id",
    [c.tenantId, `5.° ${seccion}`, seccion, ANIO],
  ))[0].id;
  const salon3 = (await sql<{ id: string }>("insert into salones (id, tenant_id, nombre, nivel, grado, seccion, anio) values (gen_random_uuid(), $1, $2, 'primaria', 3, 'A', $3) returning id", [c.tenantId, "3.° A", ANIO]))[0].id;
  await sql("insert into cursos (id, tenant_id, salon_id, nombre, area_cneb, profesor_id) values (gen_random_uuid(), $1, $2, 'Matemática', 'matematica', $3)", [c.tenantId, salon3, c.profesor]);
  const salonA = await salon("A");
  const salonB = await salon("B");
  for (const [salonId, profesorId] of [[salonA, c.profesor], [salonB, profesorB]]) {
    await sql("insert into cursos (id, tenant_id, salon_id, nombre, area_cneb, profesor_id) values (gen_random_uuid(), $1, $2, 'Matemática', 'matematica', $3)", [c.tenantId, salonId, profesorId]);
  }
  alumnoId = (await sql<{ id: string }>(
    "insert into alumnos (id, tenant_id, salon_id, nombres, apellidos, codigo, cuenta_id) values (gen_random_uuid(), $1, $2, 'Thiago', 'Ficticio', 'P-5B-1', $3) returning id",
    [c.tenantId, salonB, alumnoCuenta],
  ))[0].id;
  const [{ id: consentimiento }] = await sql<{ id: string }>("insert into consentimientos (id, tenant_id, apoderado_id, version_texto) values (gen_random_uuid(), $1, $2, 'e2e') returning id", [c.tenantId, apoderada]);
  await sql("insert into apoderados_alumnos (id, tenant_id, apoderado_id, alumno_id, parentesco, consentimiento_id) values (gen_random_uuid(), $1, $2, $3, 'madre', $4)", [c.tenantId, apoderada, alumnoId, consentimiento]);
  const [config] = await sql<{ version: string }>("select valor->>'version' as version from config_plataforma where clave = 'nudito_plus:consentimiento'");
  await sql("insert into consentimientos_ia (id, tenant_id, apoderado_id, alumno_id, version_texto) values (gen_random_uuid(), $1, $2, $3, $4)", [c.tenantId, apoderada, alumnoId, config?.version ?? "v2"]);
  await sql("insert into nudito_config_colegio (id, tenant_id, activo, sesiones_por_dia, updated_at) values (gen_random_uuid(), $1, true, 50, now())", [c.tenantId]);
});

test.afterAll(async () => {
  await c?.limpiar();
});

async function entrar(browser: Browser, correo: string, viewport = { width: 1280, height: 900 }): Promise<Page> {
  const page = await browser.newPage({ baseURL: `http://lvh.me:${PUERTO}`, viewport });
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(url("/inicio"), { timeout: 30_000 });
  return page;
}

test("dos profesores aceptan el temario y el alumno ve la versión habilitada en móvil", async ({ browser }) => {
  test.setTimeout(180_000);
  const a = await entrar(browser, correos.a);
  await a.goto(url("/nudito/temario"));
  await expect(a.getByRole("heading",{name:"Temario de Nudito"})).toBeVisible();
  const grupo = a.locator("article").filter({hasText:"5.° grado"}).filter({has:a.getByRole("heading",{name:"Matemática"})});
  await grupo.getByRole("button",{name:"Crear temario"}).click();
  await a.waitForURL(/\/nudito\/temario\/[0-9a-f-]{36}/);
  planId=a.url().match(/temario\/([0-9a-f-]{36})/)![1];
  await expect(a.getByText("Sin temario",{exact:true})).toBeVisible();
  await a.getByLabel("Números decimales").check();
  await a.getByLabel("Suma y resta de fracciones").check();
  await a.getByRole("button",{name:"Agregar seleccionados"}).click();
  await expect(a.getByText(/En revisión \(falta aceptar:/)).toBeVisible();
  await a.getByRole("button",{name:"Acepto este temario"}).click();
  const direccion=await entrar(browser,correos.direccion);
  await direccion.goto(url("/nudito/temario/"+planId));
  await expect(direccion.getByRole("heading",{name:/En revisión/})).toBeVisible();
  await expect(direccion.getByRole("button",{name:"Acepto este temario"})).toHaveCount(0);
  const b=await entrar(browser,correos.b);
  await b.goto(url("/nudito/temario/"+planId));
  await b.getByRole("button",{name:"Acepto este temario"}).click();
  await expect(b.getByText("Habilitado para alumnos",{exact:true})).toBeVisible();
  const alumno=await entrar(browser,correos.alumno,{width:360,height:740});
  await alumno.goto(url("/nudito"));
  await alumno.getByRole("button",{name:"¡Empecemos!"}).click();
  await expect(alumno.getByText("Matemática",{exact:true}).first()).toBeVisible();
  await alumno.getByRole("button",{name:/Matemática/}).click();
  await expect(alumno.getByText("Números decimales",{exact:true}).first()).toBeVisible();
  expect(await alumno.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await alumno.close(); await b.close(); await direccion.close(); await a.close();
});

test("Matemática 3.° muestra todo el banco (129 temas) sin buscar y cabe en móvil", async ({ browser }) => {
  const page = await entrar(browser, correos.a, { width: 360, height: 740 });
  await page.goto(url("/nudito/temario"));
  const grupo = page.locator("article").filter({ hasText: "3.° grado" }).filter({ has: page.getByRole("heading", { name: "Matemática" }) });
  await grupo.getByRole("button", { name: "Crear temario" }).click();
  await page.waitForURL(/\/nudito\/temario\/[0-9a-f-]{36}/);
  const catalogo = page.getByText(/\d+ temas disponibles para este grado y curso/);
  await expect(catalogo).toBeVisible();
  expect(Number((await catalogo.textContent())?.match(/\d+/)?.[0])).toBe(129);
  await expect(page.getByRole("searchbox", { name: "Filtrar temas (opcional)" })).toHaveValue("");
  await expect(page.locator("#titulo-catalogo")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.close();
});

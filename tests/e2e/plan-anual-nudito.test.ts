import "dotenv/config";
import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { NUDITO_TUTOR_DISPONIBLE } from "../../src/lib/planes";
import { crearColegioTemporal, sql, type ColegioTemporal } from "./ayudantes/colegio-temporal";

// Planificación anual → materiales → Nudito, POR LA UI (specs/48 y specs/49; guion: tests/integracion/plan-anual-flujo-completo).
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
const TEMAS_A = ["Números decimales", "Suma y resta de fracciones"];
const TEMA_B = "Operaciones combinadas";
/** Temas del catálogo de 5.° que nadie agregó al plan: el alumno nunca debe verlos. */
const FUERA_DEL_PLAN = ["Ecuaciones simples (x + a = b)", "Tablas de proporcionalidad"];

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
  await page.waitForURL(url("/inicio"));
  return page;
}

const estadoDelPlan = (page: Page, texto: string) => expect(page.locator("header").getByText(texto, { exact: true })).toBeVisible();

/** Formulario (FormAccion) que contiene el botón indicado. */
const formCon = (page: Page, boton: string) => page.locator("form").filter({ has: page.getByRole("button", { name: boton, exact: true }) });

async function agregarDelCatalogo(page: Page, tema: string) {
  await page.goto(url(`/planificacion/${planId}/temas`));
  const catalogo = page.locator("section").filter({ has: page.getByRole("heading", { name: "Catálogo del grado" }) });
  const fila = catalogo.locator("li").filter({ has: page.getByText(tema, { exact: true }) });
  await fila.getByRole("button", { name: "Agregar" }).click();
  await expect(fila.getByText("En el plan")).toBeVisible();
  const delPlan = page.locator("section").filter({ has: page.getByRole("heading", { name: "Temas del plan" }) });
  await expect(delPlan.getByText(new RegExp(`^\\d+\\. ${tema.replace(/[()+]/g, "\\$&")}$`))).toBeVisible();
}

async function sinDesborde(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("profesores y dirección acuerdan, revisan y publican el plan anual", async ({ browser }) => {
  test.setTimeout(240_000);
  const a = await entrar(browser, correos.a);
  await a.goto(url("/planificacion"));
  await expect(a.getByRole("heading", { name: "Planificación anual" })).toBeVisible();
  const grupo = a.locator("article").filter({ has: a.getByRole("heading", { name: "Matemática" }) });
  await expect(grupo.getByText(`primaria · 5.° grado · ${ANIO}`)).toBeVisible();
  await grupo.getByRole("button", { name: "Crear plan" }).click();
  await grupo.getByRole("link", { name: "Abrir plan" }).click();
  await a.waitForURL(/\/planificacion\/[0-9a-f-]{36}\/temas/);
  planId = a.url().match(/planificacion\/([0-9a-f-]{36})/)![1];
  await estadoDelPlan(a, "Borrador");

  // Antes de publicar, Materiales y Progreso explican que falta publicar (no revientan).
  await a.getByRole("link", { name: "Materiales" }).click();
  await expect(a.getByText("Publica el plan antes de preparar materiales.")).toBeVisible();
  await a.getByRole("link", { name: "Progreso" }).click();
  await expect(a.getByText("Publica el plan para seguir el progreso de tus alumnos en Nudito.")).toBeVisible();

  // Dirección designa coordinadora a Ana desde la pestaña Revisión.
  const direccion = await entrar(browser, correos.direccion);
  await direccion.goto(url(`/planificacion/${planId}/revision`));
  const designar = formCon(direccion, "Designar coordinador");
  await designar.getByLabel("Docente participante").selectOption({ label: "Ana Paredes" });
  await designar.getByLabel("Motivo").fill("Coordina Matemática de 5.° de primaria.");
  await designar.getByRole("button", { name: "Designar coordinador" }).click();
  await expect(direccion.getByText("Ana Paredes · Coordinador")).toBeVisible();
  await direccion.close();

  // A y B agregan temas desde el catálogo.
  for (const tema of TEMAS_A) await agregarDelCatalogo(a, tema);
  const b = await entrar(browser, correos.b);
  await b.goto(url("/planificacion"));
  await b.locator("article").filter({ has: b.getByRole("heading", { name: "Matemática" }) }).getByRole("link", { name: "Abrir plan" }).click();
  await b.waitForURL(url(`/planificacion/${planId}/temas`));
  await agregarDelCatalogo(b, TEMA_B);

  // A envía a revisión.
  await a.goto(url(`/planificacion/${planId}/revision`));
  await a.getByRole("button", { name: "Enviar a revisión" }).click();
  await estadoDelPlan(a, "En revisión");

  // B deja una observación.
  await b.goto(url(`/planificacion/${planId}/revision`));
  const observar = formCon(b, "Agregar observación");
  await observar.getByLabel("Observación").fill("Conviene ver las fracciones después de los decimales.");
  await observar.getByRole("button", { name: "Agregar observación" }).click();
  await estadoDelPlan(b, "Con observaciones");

  // A no puede aprobar ni reenviar con la observación abierta: ve el bloqueo.
  await a.reload();
  await estadoDelPlan(a, "Con observaciones");
  await expect(a.getByRole("button", { name: "Aprobar plan" })).toHaveCount(0);
  await expect(a.getByRole("button", { name: "Publicar plan" })).toHaveCount(0);
  await a.getByRole("button", { name: "Reenviar a revisión" }).click();
  await expect(a.getByText("Resuelve todas las observaciones abiertas.")).toBeVisible();

  // A resuelve y reenvía (ronda 2).
  const resolver = formCon(a, "Resolver");
  await resolver.getByLabel("Cómo se resolvió").fill("Se mantuvo el orden: decimales primero.");
  await resolver.getByRole("button", { name: "Resolver" }).click();
  await expect(a.getByText("Resolución: Se mantuvo el orden: decimales primero.")).toBeVisible();
  await a.getByRole("button", { name: "Reenviar a revisión" }).click();
  await estadoDelPlan(a, "En revisión");
  await expect(a.getByRole("heading", { name: "Ronda de revisión 2" })).toBeVisible();

  // Sin conformidades, aprobar queda bloqueado.
  await a.getByRole("button", { name: "Aprobar plan" }).click();
  await expect(a.getByText("Falta la conformidad de todos los participantes activos en esta ronda.")).toBeVisible();

  // Ambos registran su conformidad.
  for (const p of [a, b]) {
    await p.reload();
    const decision = formCon(p, "Registrar mi decisión");
    await decision.getByLabel("Mi decisión").selectOption("conforme");
    await decision.getByRole("button", { name: "Registrar mi decisión" }).click();
  }
  await a.reload();
  const participantes = a.locator("section div").filter({ has: a.getByRole("heading", { name: "Participantes y conformidades" }) });
  await expect(participantes.locator("li").getByText("Conforme", { exact: true })).toHaveCount(2);

  // A aprueba y publica.
  await a.getByRole("button", { name: "Aprobar plan" }).click();
  await estadoDelPlan(a, "Aprobado");
  await a.getByRole("button", { name: "Publicar plan" }).click();
  await estadoDelPlan(a, "Publicado");

  await a.getByRole("link", { name: "Versiones" }).click();
  await expect(a.getByText("Versión 1 · Vigente")).toBeVisible();
  await expect(a.getByText(/· 3 temas$/)).toBeVisible();
  await a.close();
  await b.close();
});

/** Abre la lección del tema desde la pestaña Materiales. */
async function abrirLeccion(page: Page, tema: string) {
  await page.goto(url(`/planificacion/${planId}/materiales`));
  await page.locator("li").filter({ has: page.getByText(tema, { exact: true }) }).getByRole("link", { name: "Revisar lección" }).click();
  await expect(page.getByRole("heading", { name: tema })).toBeVisible();
}

async function accionLeccion(page: Page, tema: string, boton: string, estado: string) {
  await abrirLeccion(page, tema);
  await page.getByRole("button", { name: boton, exact: true }).click();
  await expect(page.getByText(estado, { exact: true })).toBeVisible();
}

test("materiales: se preparan las lecciones y se revisan y publican dos de tres", async ({ browser }) => {
  test.setTimeout(180_000);
  const a = await entrar(browser, correos.a);
  await a.goto(url(`/planificacion/${planId}/materiales`));
  await a.getByRole("button", { name: "Preparar materiales" }).click();
  const estado = a.getByRole("status").filter({ hasText: /^Trabajo:/ });
  await expect(estado).toBeVisible();
  for (let i = 0; i < 5 && !(await estado.textContent())?.includes("completado"); i++) {
    await a.getByRole("button", { name: "Continuar" }).click();
    await a.waitForTimeout(500);
  }
  await expect(estado).toHaveText("Trabajo: 3 de 3 temas procesados · completado.");
  for (const tema of [...TEMAS_A, TEMA_B]) {
    await expect(a.locator("li").filter({ has: a.getByText(tema, { exact: true }) }).getByText("borrador", { exact: true })).toBeVisible();
  }

  // Números decimales: A envía, B aprueba, A publica. Suma y resta de fracciones: igual. Operaciones combinadas queda en
  // borrador: el alumno no debe verla.
  const b = await entrar(browser, correos.b);
  for (const tema of TEMAS_A) {
    await accionLeccion(a, tema, "Enviar a revisión", "en revision");
    await accionLeccion(b, tema, "Aprobar", "aprobada");
    await accionLeccion(a, tema, "Publicar", "publicada");
  }
  await a.goto(url(`/planificacion/${planId}/materiales`));
  for (const tema of TEMAS_A) await expect(a.locator("li").filter({ has: a.getByText(tema, { exact: true }) }).getByText("publicada", { exact: true })).toBeVisible();
  await a.close();
  await b.close();
});

type Fila = { tipo: string; enunciado: Record<string, unknown>; solucion: { solucion: Record<string, unknown> } };
type Opcion = { id: string; texto: string };

/** Responde en la UI el ejercicio abierto del alumno, bien o mal (lee la solución guardada en la BD). */
async function responderEnUI(page: Page, bien: boolean) {
  const [f] = await sql<Fila>("select tipo::text, enunciado, solucion from nudito_ejercicios where alumno_id = $1 and cerrado_at is null order by presentado_at desc limit 1", [alumnoId]);
  if (!f) throw new Error("No hay ejercicio abierto");
  const { tipo, enunciado: p } = f;
  const s = f.solucion.solucion;
  switch (tipo) {
    case "opcion_multiple": {
      const opciones = p.opciones as Opcion[];
      const elegida = opciones.find((o) => (o.id === s.correcta) === bien)!;
      await page.getByRole("radio", { name: elegida.texto, exact: true }).check();
      break;
    }
    case "numerico":
      await page.getByPlaceholder("Tu respuesta").fill(String(bien ? s.valor : Number(s.valor) + 7));
      break;
    case "fraccion":
      await page.getByLabel("Numerador").fill(String(bien ? s.num : Number(s.num) + 1));
      await page.getByLabel("Denominador").fill(String(s.den));
      break;
    case "texto_corto":
      await page.getByPlaceholder("Escribe tu respuesta").fill(bien ? (s.aceptadas as string[])[0] : "zzz");
      break;
    default:
      throw new Error(`Tipo no previsto en el e2e: ${tipo}`);
  }
  await page.getByRole("button", { name: "Comprobar" }).click();
}

/** Bienvenida → curso → lista de temas. Devuelve la lista para revisarla. */
async function hastaLosTemas(page: Page): Promise<Locator> {
  await page.goto(url("/nudito"));
  await expect(page.getByRole("heading", { name: "¡Hola, Thiago!" })).toBeVisible();
  await page.getByRole("button", { name: /¡Empecemos!|Empezar algo nuevo/ }).click();
  await expect(page.getByRole("heading", { name: "¿Qué curso practicamos?" })).toBeVisible();
  await page.getByRole("button", { name: /^Matemática/ }).click();
  await expect(page.getByRole("heading", { name: /¿Qué tema de Matemática/ })).toBeVisible();
  return page.locator("section").filter({ has: page.getByRole("heading", { name: /¿Qué tema de/ }) });
}

async function temasSoloDelPlan(page: Page, temas: Locator) {
  for (const t of TEMAS_A) await expect(temas.getByRole("button", { name: new RegExp(t) })).toBeVisible();
  for (const t of [TEMA_B, ...FUERA_DEL_PLAN]) await expect(page.getByText(t)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Otro tema", exact: true })).toHaveCount(0);
  await expect(page.getByText("Otro tema", { exact: true })).toHaveCount(0);
}

test("el alumno practica solo los temas publicados del plan", async ({ browser }) => {
  test.setTimeout(120_000);
  const page = await entrar(browser, correos.alumno);
  const temas = await hastaLosTemas(page);
  await temasSoloDelPlan(page, temas);

  await temas.getByRole("button", { name: /Números decimales/ }).click();
  await expect(page.getByRole("heading", { name: "Repasemos: Números decimales" })).toBeVisible();
  const [leccion] = await sql<{ idea: string }>("select contenido->>'idea' as idea from nudito_lecciones where tenant_id = $1 and estado = 'publicada' and tema_clave = 'mat.p5.numeros-decimales'", [c.tenantId]);
  await expect(page.getByText(leccion.idea, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "¡A practicar!" }).click();
  await expect(page.getByText(/Ejercicio 1 de \d+/)).toBeVisible();

  await responderEnUI(page, false);
  await expect(page.getByText(/^(Casi|¡Vas muy bien!)$/)).toBeVisible();
  await page.getByRole("button", { name: "Intentar otra vez" }).click();
  await page.getByRole("button", { name: "Dame una pista" }).click();
  await expect(page.getByText(/Pista 1 · quedan 2/)).toBeVisible();
  await responderEnUI(page, true);
  await expect(page.getByText("¡Correcto!", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Terminar" }).click();
  await expect(page.getByRole("heading", { name: "¡Terminaste la práctica!" })).toBeVisible();
  await expect(page.getByText("1/1")).toBeVisible();
  await expect(page.locator("li").getByText("Números decimales", { exact: true })).toBeVisible();

  // Vuelve a practicar.
  await page.getByRole("button", { name: "Practicar otro tema" }).click();
  await expect(page.getByRole("heading", { name: "¿Qué curso practicamos?" })).toBeVisible();
  await page.getByRole("button", { name: /^Matemática/ }).click();
  await page.getByRole("button", { name: /Números decimales/ }).click();
  await expect(page.getByRole("heading", { name: "Repasemos: Números decimales" })).toBeVisible();
  await page.close();
});

test("el docente ve el progreso del alumno en el plan", async ({ browser }) => {
  const a = await entrar(browser, correos.a);
  await a.goto(url(`/planificacion/${planId}/progreso`));
  await expect(a.getByRole("heading", { name: "Progreso del plan en Nudito" })).toBeVisible();
  await expect(a.getByText("1 alumnos · 2 temas publicados")).toBeVisible();
  const tarjeta = a.locator("li").filter({ has: a.getByRole("heading", { name: "Thiago Ficticio" }) });
  await expect(tarjeta.getByText(/^Números decimales · /)).toBeVisible();
  await expect(tarjeta.getByText("Números decimales · pendiente")).toHaveCount(0);
  await expect(tarjeta.getByText("Suma y resta de fracciones · pendiente")).toBeVisible();
  await expect(tarjeta.getByText(TEMA_B)).toHaveCount(0);
  await a.close();
});

test("móvil 360×740: el recorrido del alumno no tiene scroll horizontal", async ({ browser }) => {
  const page = await entrar(browser, correos.alumno, { width: 360, height: 740 });
  await page.goto(url("/nudito"));
  await expect(page.getByRole("heading", { name: "¡Hola, Thiago!" })).toBeVisible();
  await sinDesborde(page);
  const temas = await hastaLosTemas(page);
  await temasSoloDelPlan(page, temas);
  await sinDesborde(page);
  await temas.getByRole("button", { name: /Suma y resta de fracciones/ }).click();
  await expect(page.getByRole("heading", { name: "Repasemos: Suma y resta de fracciones" })).toBeVisible();
  await sinDesborde(page);
  await page.getByRole("button", { name: "¡A practicar!" }).click();
  await expect(page.getByText(/Ejercicio 1 de \d+/)).toBeVisible();
  await sinDesborde(page);
  await responderEnUI(page, true);
  await expect(page.getByText("¡Correcto!", { exact: true })).toBeVisible();
  await sinDesborde(page);
  await page.getByRole("button", { name: "Terminar" }).click();
  await expect(page.getByRole("heading", { name: "¡Terminaste la práctica!" })).toBeVisible();
  await sinDesborde(page);
  await page.close();
});

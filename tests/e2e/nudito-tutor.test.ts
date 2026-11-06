import "dotenv/config";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { expect, test, type Page } from "@playwright/test";
import { NUDITO_TUTOR_DISPONIBLE } from "../../src/lib/planes";

// Tutor Nudito (specs/41–44) con los datos demo de `pnpm db:reconstruir`: Nuevo Horizonte con Nudito activo, cursos con
// área, Lucas (alumno 5.° A con cuenta) con consentimiento de IA v2, y Rosa (apoderada de Mateo, 3.° B, sin cuenta).
// Recorre las TRES áreas: curso → tema → repaso → ejercicio → respuesta incorrecta → pista → reintento → resultados, y
// «Otro tema» demasiado avanzado. La respuesta correcta/incorrecta se arma leyendo la solución guardada en la BD (el
// cliente nunca la recibe). Opcional: `NUDITO_CAPTURAS=<carpeta>` guarda capturas en escritorio (1280×800) y móvil (390×844).
test.skip(!NUDITO_TUTOR_DISPONIBLE, "Nudito desactivado en el producto");

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const LUCAS = "lucas.huaman@nuevohorizonte.demo";
const CAPTURAS = process.env.NUDITO_CAPTURAS ?? "";

async function sql<T extends Record<string, unknown>>(texto: string, valores: unknown[] = []): Promise<T[]> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    return (await cliente.query<T>(texto, valores)).rows;
  } finally {
    await cliente.end();
  }
}

async function entrar(page: Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
}

/** Captura en escritorio y móvil (solo con NUDITO_CAPTURAS). */
async function captura(page: Page, nombre: string) {
  if (!CAPTURAS) return;
  mkdirSync(CAPTURAS, { recursive: true });
  const antes = page.viewportSize() ?? { width: 1280, height: 800 };
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(CAPTURAS, `nudito-final-${nombre}-escritorio.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(CAPTURAS, `nudito-final-${nombre}-movil.png`), fullPage: true });
  await page.setViewportSize(antes);
}

let lucasId = "";

test.beforeAll(async () => {
  const [lucas] = await sql<{ id: string }>(
    "select a.id from alumnos a join memberships m on m.id = a.cuenta_id join profiles p on p.id = m.user_id where p.email = $1",
    [LUCAS],
  );
  lucasId = lucas.id;
});

/** Práctica limpia de Lucas para que el primer ejercicio de cada tema no sea de comprobación (los datos que deja este
 *  archivo quedan para ver el seguimiento docente y el progreso de la familia). Solo en la primera prueba: si una
 *  prueba falla, Playwright reinicia el worker y vuelve a correr `beforeAll`. */
async function limpiarPracticaDeLucas() {
  await sql("delete from nudito_dominio_eventos where alumno_id = $1", [lucasId]);
  await sql("delete from nudito_dominios where alumno_id = $1", [lucasId]);
  await sql("delete from nudito_sesiones where alumno_id = $1", [lucasId]);
}

type Fila = { tipo: string; enunciado: Record<string, unknown>; solucion: { solucion: Record<string, unknown> } };

async function ejercicioAbierto(): Promise<Fila> {
  const [f] = await sql<Fila>("select tipo::text, enunciado, solucion from nudito_ejercicios where alumno_id = $1 and cerrado_at is null order by presentado_at desc limit 1", [lucasId]);
  if (!f) throw new Error("No hay ejercicio abierto");
  return f;
}

type Opcion = { id: string; texto: string };

/** Responde el ejercicio abierto en la UI: bien o mal, según `bien`. */
async function responderEnUI(page: Page, bien: boolean) {
  const { tipo, enunciado: p, solucion } = await ejercicioAbierto();
  const s = solucion.solucion;
  switch (tipo) {
    case "opcion_multiple": {
      const opciones = p.opciones as Opcion[];
      const elegida = bien ? opciones.find((o) => o.id === s.correcta)! : opciones.find((o) => o.id !== s.correcta)!;
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
    case "lectura": {
      const preguntas = p.preguntas as { id: string; opciones?: Opcion[] }[];
      const respuestas = s.respuestas as Record<string, string | { aceptadas: string[] }>;
      for (const [i, q] of preguntas.entries()) {
        // `article + ol`: el `ol` de las preguntas, no el de las migas del encabezado.
        const grupo = page.locator("article + ol > li").nth(i);
        const r = respuestas[q.id];
        if (q.opciones) {
          const elegida = bien ? q.opciones.find((o) => o.id === r)! : q.opciones.find((o) => o.id !== r)!;
          await grupo.getByRole("radio", { name: elegida.texto, exact: true }).check();
        } else {
          await grupo.getByRole("textbox").fill(bien && typeof r !== "string" ? r.aceptadas[0] : "zzz");
        }
      }
      break;
    }
    case "relacionar": {
      const pares = s.pares as Record<string, string>;
      const izquierda = p.izquierda as Opcion[];
      const ids = izquierda.map((i) => pares[i.id]);
      for (const [n, i] of izquierda.entries()) {
        const valor = bien ? pares[i.id] : ids[(n + 1) % ids.length];
        await page.getByLabel(i.texto, { exact: true }).selectOption(valor);
      }
      break;
    }
    case "verdadero_falso": {
      const valores = s.valores as Record<string, boolean>;
      for (const a of p.afirmaciones as Opcion[]) {
        const v = bien ? valores[a.id] : !valores[a.id];
        await page.getByRole("group", { name: a.texto, exact: true }).getByRole("button", { name: v ? "Verdadero" : "Falso" }).click();
      }
      break;
    }
    default:
      throw new Error(`Tipo no previsto en el e2e: ${tipo}`);
  }
  await page.getByRole("button", { name: "Comprobar" }).click();
}

const AREAS = [
  { area: "matematica", curso: /^Matemática/, tema: "Números decimales" },
  { area: "ciencia-tecnologia", curso: /^Ciencia y Tecnología/, tema: "Célula animal y célula vegetal" },
  { area: "comunicacion", curso: /^Comunicación/, tema: "Idea principal y secundarias" },
] as const;

async function abrirNudito(page: Page) {
  await page.goto(`${COLEGIO}/nudito`);
  await expect(page.getByText("Soy Nudito, un asistente con IA.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /¡Hola, Lucas!/ })).toBeVisible();
}

for (const [n, a] of AREAS.entries()) {
  test(`${a.area}: curso → tema → repaso → error → pista → reintento → resultados`, async ({ page }) => {
    if (n === 0) await limpiarPracticaDeLucas();
    await page.setViewportSize({ width: 1280, height: 800 });
    await entrar(page, LUCAS);
    await abrirNudito(page);
    if (n === 0) await captura(page, "bienvenida");

    await page.getByRole("button", { name: /¡Empecemos!|Empezar algo nuevo/ }).click();
    await expect(page.getByRole("heading", { name: "¿Qué curso practicamos?" })).toBeVisible();
    // Las tres áreas aparecen como cursos del salón de Lucas.
    for (const x of AREAS) await expect(page.getByRole("button", { name: x.curso })).toBeVisible();
    if (n === 0) await captura(page, "cursos");
    await page.getByRole("button", { name: a.curso }).click();

    await expect(page.getByRole("heading", { name: /¿Qué tema de/ })).toBeVisible();
    if (n === 0) await captura(page, "temas");
    await page.getByRole("button", { name: new RegExp(a.tema) }).first().click();

    await expect(page.getByRole("heading", { name: /Repasemos:/ })).toBeVisible();
    if (n === 0) await captura(page, "repaso");
    await page.getByRole("button", { name: "¡A practicar!" }).click();

    await expect(page.getByText(/Ejercicio 1 de \d+/)).toBeVisible();
    // La solución nunca llega al cliente.
    expect(await page.content()).not.toMatch(/"solucion"|"distractores"|"aceptadas"/);
    await captura(page, `ejercicio-${a.area}`);

    // Respuesta incorrecta → retro amable, sin perder la sesión.
    await responderEnUI(page, false);
    await expect(page.getByText(/^(Casi|¡Vas muy bien!)$/)).toBeVisible();
    await captura(page, `retro-error-${a.area}`);

    // Reintento con pista.
    await page.getByRole("button", { name: "Intentar otra vez" }).click();
    await page.getByRole("button", { name: "Dame una pista" }).click();
    await expect(page.getByText(/Pista 1 · quedan 2/)).toBeVisible();
    await responderEnUI(page, true);
    await expect(page.getByText("¡Correcto!", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Terminar" }).click();
    await expect(page.getByRole("heading", { name: "¡Terminaste la práctica!" })).toBeVisible();
    await expect(page.getByText("1/1")).toBeVisible();
    await expect(page.getByText(a.tema, { exact: true })).toBeVisible();
    if (n === 0) await captura(page, "resultados");

    // Quedó registrado el dominio del tema (formativo; no toca notas).
    const [d] = await sql<{ estado: string }>("select estado::text from nudito_dominios where alumno_id = $1 and area = $2", [lucasId, a.area]);
    expect(d?.estado).toBeTruthy();
  });
}

test("«Otro tema» demasiado avanzado: Nudito propone temas de su grado y no deja practicarlo", async ({ page }) => {
  await entrar(page, LUCAS);
  await abrirNudito(page);
  await page.getByRole("button", { name: /¡Empecemos!|Empezar algo nuevo/ }).click();
  await page.getByRole("button", { name: /^Matemática/ }).click();
  await page.getByRole("button", { name: "Otro tema" }).click();
  await page.getByLabel("¿Qué tema quieres practicar?").fill("derivadas");
  await page.getByRole("button", { name: "Buscar tema" }).click();
  await expect(page.getByText(/más adelante|todavía no|aún no/i).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /Repasemos:/ })).toHaveCount(0);
  await captura(page, "otro-tema-avanzado");
});

test("escritura con rúbrica: proveedor simulado → «Lo revisamos juntos» con retro formativa (no cuenta para dominio)", async ({ page }) => {
  await entrar(page, LUCAS);
  await abrirNudito(page);
  await page.getByRole("button", { name: /¡Empecemos!|Empezar algo nuevo/ }).click();
  await page.getByRole("button", { name: /^Comunicación/ }).click();
  await page.getByRole("button", { name: /Escribo una carta/ }).first().click();
  await page.getByRole("button", { name: "¡A practicar!" }).click();
  await page.getByRole("textbox", { name: "Tu texto" }).fill(
    "Querida abuela:\nTe escribo porque te extraño mucho. Además quiero contarte que en el colegio sembramos un biohuerto. Por eso aprendí a regar las plantas.\nCon cariño, Lucas.",
  );
  await page.getByRole("button", { name: "Comprobar" }).click();
  await expect(page.getByText("Lo revisamos juntos", { exact: true })).toBeVisible();
  await expect(page.getByText(/Revisión automática orientativa/)).toBeVisible();
  await captura(page, "retro-escritura");
  await page.getByRole("button", { name: "Terminar" }).click();
});

test("foto del cuaderno (si el colegio la permite): el simulado no la lee y pide escribirla", async ({ page }) => {
  const [{ permitir }] = await sql<{ permitir: boolean }>("select permitir_fotos as permitir from nudito_config_colegio c join tenants t on t.id = c.tenant_id where t.slug = 'nuevohorizonte'");
  await sql("update nudito_config_colegio set permitir_fotos = true where tenant_id = (select id from tenants where slug = 'nuevohorizonte')");
  try {
    await entrar(page, LUCAS);
    await abrirNudito(page);
    await page.getByRole("button", { name: /¡Empecemos!|Empezar algo nuevo/ }).click();
    await page.getByRole("button", { name: /^Matemática/ }).click();
    await page.getByRole("button", { name: /Operaciones combinadas/ }).first().click();
    await page.getByRole("button", { name: "¡A practicar!" }).click();
    await expect(page.getByText(/Ejercicio 1 de \d+/)).toBeVisible();
    // Avanza hasta un ejercicio con respuesta escrita (numérico): ahí aparece el botón de foto.
    for (let i = 0; i < 5 && (await ejercicioAbierto()).tipo !== "numerico"; i++) {
      await responderEnUI(page, true);
      await page.getByRole("button", { name: "Siguiente" }).click();
      await expect(page.getByText(new RegExp(`Ejercicio ${i + 2} de`))).toBeVisible();
    }
    // PNG mínimo válido (1×1).
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    await page.getByTestId("nudito-foto-input").setInputFiles({ name: "cuaderno.png", mimeType: "image/png", buffer: png });
    await expect(page.getByText(/No pude leer bien la foto\. Escríbelo aquí/)).toBeVisible();
    await captura(page, "foto-ilegible");
    await page.getByRole("button", { name: "Terminar" }).click();
  } finally {
    await sql("update nudito_config_colegio set permitir_fotos = $1 where tenant_id = (select id from tenants where slug = 'nuevohorizonte')", [permitir]);
  }
});

test("móvil: bienvenida y tarjetas de curso visibles, sin scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrar(page, LUCAS);
  await abrirNudito(page);
  await page.getByRole("button", { name: /¡Empecemos!|Empezar algo nuevo/ }).click();
  await expect(page.getByRole("heading", { name: "¿Qué curso practicamos?" })).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});

test("/nudito-plus/chat redirige a /nudito", async ({ page }) => {
  await entrar(page, LUCAS);
  await page.goto(`${COLEGIO}/nudito-plus/chat`);
  await page.waitForURL(`${COLEGIO}/nudito`);
  await expect(page.getByRole("heading", { name: "Nudito", exact: true })).toBeVisible();
});

test("modo hijo: Rosa practica con Mateo (sin cuenta) y el enlace antiguo redirige", async ({ page }) => {
  const [mateo] = await sql<{ id: string }>("select id from alumnos where nombres = 'Mateo' and apellidos = 'Quispe Huamán'");
  await entrar(page, "rosa.quispe@gmail.com");
  await page.goto(`${COLEGIO}/nudito-plus/hijo/${mateo.id}`);
  await page.waitForURL(`${COLEGIO}/nudito?alumno=${mateo.id}`);
  await expect(page.getByText("Practicando con Mateo.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /¡Hola, Mateo!/ })).toBeVisible();
});

test("seguimiento docente y progreso de la familia muestran la práctica de Lucas", async ({ page }) => {
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/nudito/seguimiento`);
  await expect(page.getByRole("heading", { name: "Seguimiento de Nudito" })).toBeVisible();
  await captura(page, "seguimiento-docente");
  await page.locator('a[href^="/nudito/seguimiento/curso/"]').filter({ hasText: "Matemática" }).filter({ hasText: /5/ }).first().click();
  await expect(page.getByText(/Lucas/).first()).toBeVisible();
  await captura(page, "seguimiento-curso");

  await page.context().clearCookies();
  await entrar(page, "familia.huaman@familia.demo");
  await page.goto(`${COLEGIO}/nudito-plus`);
  await expect(page.getByRole("heading", { name: "Nudito", exact: true })).toBeVisible();
  await expect(page.getByText(/Lucas/).first()).toBeVisible();
  await captura(page, "progreso-familia");
  await page.goto(`${COLEGIO}/nudito-plus/${lucasId}`);
  await expect(page.getByText(/Números decimales|Célula animal/).first()).toBeVisible();
  await captura(page, "progreso-familia-detalle");
});

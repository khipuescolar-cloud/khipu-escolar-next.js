// Capturas reales del producto para la landing (specs/25-landing-publica.md).
// Entra a los colegios demo (datos ficticios del seed, contraseña demo123), toma pantallas en tema claro a
// 1366 px (escritorio) y 390 px (celular) y las guarda en WebP (≤ 200 KB) en public/landing/.
//
// Uso (con la app corriendo y la BD con seed):
//   E2E_PORT=3082 pnpm exec tsx scripts/capturas-landing.ts
// Para el chat y la mesa de ayuda crea una conversación de ejemplo (ficticia) y la borra al terminar.
// Opcional: CAPTURAS_SOLO=pasar-lista,chat  (regenera solo esas)  ·  CAPTURAS_PNG=1 (guarda también el PNG crudo)
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";
import { Client } from "pg";
import sharp from "sharp";

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `http://lvh.me:${PUERTO}`;
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const CLAVE = "demo123";
const SALIDA = path.join(process.cwd(), "public", "landing");
const MAX_BYTES = 200 * 1024;
const PANEL = `http://admin.lvh.me:${PUERTO}`;
const ASUNTO_SOPORTE = "¿Cómo importo a los alumnos desde un CSV?";
const SOLO = process.env.CAPTURAS_SOLO?.split(",").map((s) => s.trim()).filter(Boolean);

type Vista = "escritorio" | "celular";
const TAMANOS: Record<Vista, { width: number; height: number }> = {
  escritorio: { width: 1366, height: 854 },
  celular: { width: 390, height: 844 },
};

type Captura = {
  nombre: string;
  cuenta: string;
  vista: Vista;
  /** Navega y deja la pantalla lista. */
  preparar: (page: Page) => Promise<void>;
  /** Ancho final del WebP (px). */
  ancho: number;
};

async function entrar(page: Page, correo: string) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(inicio|elegir-colegio)/, { timeout: 60_000 });
  if (page.url().includes("elegir-colegio")) {
    await page.getByRole("link", { name: /Nuevo Horizonte/ }).click();
    await page.waitForURL(/\/inicio/, { timeout: 60_000 });
  }
}

/** Oculta correos completos: cualquier texto con «@» visible se reemplaza por «correo oculto». */
async function ocultarCorreos(page: Page) {
  await page.evaluate(() => {
    const re = /[\w.+-]+@[\w-]+(\.[\w-]+)+/g;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodos: Text[] = [];
    while (walker.nextNode()) nodos.push(walker.currentNode as Text);
    for (const n of nodos) if (re.test(n.data)) n.data = n.data.replace(re, "correo oculto");
    document.querySelectorAll<HTMLInputElement>("input").forEach((i) => {
      if (re.test(i.value)) i.value = "correo oculto";
    });
  });
}

/** Quita lo que no aporta a la captura (avisos de desarrollo de Next, toasts). */
async function limpiar(page: Page) {
  await page.addStyleTag({
    content: `nextjs-portal, [data-sonner-toaster], [data-nextjs-toast] { display: none !important; }
      *, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`,
  });
}

const CAPTURAS: Captura[] = [
  {
    nombre: "pasar-lista",
    cuenta: "lucia.garcia@nuevohorizonte.demo",
    vista: "escritorio",
    ancho: 1366,
    preparar: async (page) => {
      await page.goto(`${COLEGIO}/asistencia`);
      await page.getByRole("link", { name: /Asistencia del día/ }).first().click();
      await page.waitForURL(/ambito=/);
      await page.getByRole("button", { name: /Guardar y avisar/ }).first().waitFor();
      // Sin guardar: solo para que se vea un estado distinto en la lista y en el resumen.
      await page.getByRole("button", { name: "Tarde" }).nth(1).click();
    },
  },
  {
    nombre: "familia-asistencia",
    cuenta: "rosa.quispe@gmail.com",
    vista: "celular",
    ancho: 390,
    preparar: async (page) => {
      await page.goto(`${COLEGIO}/asistencia`);
      await page.getByRole("heading", { level: 1 }).waitFor();
    },
  },
  {
    nombre: "chat",
    cuenta: "rosa.quispe@gmail.com",
    vista: "celular",
    ancho: 390,
    preparar: async (page) => {
      if (!ejemplo.conversacion) throw new Error("No hay conversación de ejemplo");
      await page.goto(`${COLEGIO}/mensajes/${ejemplo.conversacion}`);
      await page.getByText(RESPUESTA_TUTORA).first().waitFor();
    },
  },
  {
    nombre: "notas",
    cuenta: "lucia.garcia@nuevohorizonte.demo",
    vista: "escritorio",
    ancho: 1366,
    preparar: async (page) => {
      await page.goto(`${COLEGIO}/notas`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      const selector = page.getByLabel("Curso");
      const opcion = await selector.locator("option", { hasText: "Matemática" }).first().getAttribute("value");
      if (opcion) {
        await selector.selectOption(opcion);
        await page.getByRole("button", { name: "Ver", exact: true }).click();
        await page.waitForURL(/curso=/);
        await page.getByRole("table").first().waitFor();
      }
    },
  },
  {
    nombre: "direccion-inicio",
    cuenta: "direccion@nuevohorizonte.demo",
    vista: "escritorio",
    ancho: 1366,
    preparar: async (page) => {
      await page.goto(`${COLEGIO}/inicio`);
      await page.getByRole("heading", { level: 1 }).waitFor();
    },
  },
  {
    nombre: "nudito",
    cuenta: "rosa.quispe@gmail.com",
    vista: "celular",
    ancho: 390,
    preparar: async (page) => {
      await page.goto(`${COLEGIO}/inicio`);
      await page.getByRole("button", { name: /Abrir a Nudito/ }).click();
      await page.getByRole("button", { name: "¿Qué tareas hay esta semana?" }).click();
      await page.getByRole("log", { name: "Conversación con Nudito" }).getByText(/tarea/i).nth(1).waitFor({ timeout: 20_000 });
      await page.waitForTimeout(1500);
    },
  },
  {
    nombre: "porteria",
    cuenta: "porteria@nuevohorizonte.demo",
    vista: "celular",
    ancho: 390,
    preparar: async (page) => {
      await page.goto(`${COLEGIO}/porteria`);
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.getByPlaceholder(/Nombre, apellido/).fill("Quispe");
      await page.getByRole("button", { name: "Buscar" }).click();
      await page.getByRole("button", { name: /Registrar llegada/ }).first().waitFor();
      await page.getByRole("heading", { name: "¿No trae su carnet?" }).scrollIntoViewIfNeeded();
    },
  },
  {
    nombre: "carnets",
    cuenta: "direccion@nuevohorizonte.demo",
    vista: "escritorio",
    ancho: 1366,
    preparar: async (page) => {
      await page.goto(`${COLEGIO}/gestion/carnets`);
      await page.getByRole("link", { name: /Ver e imprimir/ }).first().click();
      await page.getByRole("heading", { name: /Carnets ·/ }).waitFor();
    },
  },
  {
    nombre: "mesa-ayuda",
    cuenta: "direccion@nuevohorizonte.demo",
    vista: "escritorio",
    ancho: 1366,
    preparar: async (page) => {
      if (!ejemplo.ticket) throw new Error("No hay conversación de soporte de ejemplo");
      await page.goto(`${COLEGIO}/soporte/${ejemplo.ticket}`);
      await page.getByText(RESPUESTA_SOPORTE).first().waitFor();
    },
  },
];

const MENSAJE_FAMILIA = "Buenos días, profesora. Mateo tiene cita médica mañana a las 9:00 a. m. y llegará después del recreo.";
const RESPUESTA_TUTORA = "Gracias por avisar, señora Rosa. Le guardo la ficha de Matemática para que la haga en casa.";
const MENSAJE_SOPORTE = "Queremos cargar a los alumnos de primaria. ¿Qué columnas debe tener el archivo?";
const RESPUESTA_SOPORTE = "Hola, Carmen. En Gestión › Alumnos usa «Importar CSV» con las columnas nombres, apellidos, código y salón.";

/** Datos de ejemplo creados por el script (se borran al final). */
const ejemplo: { conversacion?: string; ticket?: string } = {};

async function sesion(browser: Browser, correo: string) {
  const contexto = await browser.newContext({ viewport: TAMANOS.escritorio, locale: "es-PE", colorScheme: "light" });
  const page = await contexto.newPage();
  await page.goto(`${BASE}/login`);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(CLAVE);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(inicio|elegir-colegio)|admin\.lvh\.me:\d+\/$/, { timeout: 60_000 });
  if (page.url().includes("elegir-colegio")) {
    await page.getByRole("link", { name: /Nuevo Horizonte/ }).click();
    await page.waitForURL(/\/inicio/);
  }
  return { page, cerrar: () => contexto.close() };
}

/** Espera a que el envío llegue al servidor: recarga hasta ver el texto (la UI es optimista). */
async function guardado(page: Page, texto: string) {
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1500);
    await page.reload();
    if (await page.getByText(texto).count()) return;
  }
  throw new Error(`No se guardó: ${texto}`);
}

async function crearEjemplos(browser: Browser, necesita: (n: string) => boolean) {
  if (necesita("chat")) {
    const rosa = await sesion(browser, "rosa.quispe@gmail.com");
    await rosa.page.goto(`${COLEGIO}/mensajes/nuevo`);
    await rosa.page.getByRole("listitem").filter({ hasText: "Tutora de 3.° B" }).getByRole("button", { name: "Escribir" }).click();
    await rosa.page.waitForURL(/\/mensajes\/[0-9a-f-]{36}$/);
    ejemplo.conversacion = rosa.page.url().split("/").pop();
    await rosa.page.getByLabel("Tu mensaje").fill(MENSAJE_FAMILIA);
    await rosa.page.getByRole("button", { name: "Enviar" }).click();
    await guardado(rosa.page, MENSAJE_FAMILIA);
    await rosa.cerrar();
    const lucia = await sesion(browser, "lucia.garcia@nuevohorizonte.demo");
    await lucia.page.goto(`${COLEGIO}/mensajes/${ejemplo.conversacion}`);
    await lucia.page.getByLabel("Tu mensaje").fill(RESPUESTA_TUTORA);
    await lucia.page.getByRole("button", { name: "Enviar" }).click();
    await guardado(lucia.page, RESPUESTA_TUTORA);
    await lucia.cerrar();
  }
  if (necesita("mesa-ayuda")) {
    const dir = await sesion(browser, "direccion@nuevohorizonte.demo");
    await dir.page.goto(`${COLEGIO}/soporte`);
    await dir.page.getByRole("button", { name: "Nueva conversación" }).click();
    await dir.page.getByLabel("Asunto").fill(ASUNTO_SOPORTE);
    await dir.page.getByLabel("Mensaje").fill(MENSAJE_SOPORTE);
    await dir.page.getByRole("button", { name: "Enviar consulta" }).click();
    await dir.page.waitForURL(/\/soporte\/[0-9a-f-]{36}/);
    ejemplo.ticket = dir.page.url().split("/").pop()?.split("?")[0];
    await dir.cerrar();
    const kh = await sesion(browser, "admin@khipuescolar.demo");
    await kh.page.goto(`${PANEL}/mesa-ayuda/${ejemplo.ticket}`);
    await kh.page.getByRole("button", { name: "Responder al colegio" }).click();
    await kh.page.getByLabel("Tu mensaje").fill(RESPUESTA_SOPORTE);
    await kh.page.getByRole("button", { name: "Enviar", exact: true }).click();
    await guardado(kh.page, RESPUESTA_SOPORTE);
    await kh.cerrar();
  }
}

async function borrarEjemplos() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    if (ejemplo.conversacion) {
      await c.query("delete from avisos where referencia_id = $1", [ejemplo.conversacion]).catch(() => {});
      await c.query("delete from conversaciones where id = $1::uuid", [ejemplo.conversacion]);
    }
    const { rows } = await c.query<{ id: string }>("select id from tickets_soporte where asunto = $1", [ASUNTO_SOPORTE]);
    const ids = rows.map((r) => r.id);
    if (ids.length) {
      await c.query("delete from avisos where referencia_id = any($1::text[])", [ids]);
      await c.query("delete from auditoria_plataforma where detalle->>'ticketId' = any($1::text[])", [ids]);
      await c.query("delete from tickets_soporte where id = any($1::uuid[])", [ids]);
    }
  } finally {
    await c.end();
  }
}

async function guardarWebp(png: Buffer, nombre: string, ancho: number) {
  let calidad = 82;
  let salida = await sharp(png).resize({ width: ancho }).webp({ quality: calidad }).toBuffer();
  while (salida.length > MAX_BYTES && calidad > 40) {
    calidad -= 8;
    salida = await sharp(png).resize({ width: ancho }).webp({ quality: calidad }).toBuffer();
  }
  const meta = await sharp(salida).metadata();
  await writeFile(path.join(SALIDA, `${nombre}.webp`), salida);
  if (process.env.CAPTURAS_PNG) await writeFile(path.join(SALIDA, `${nombre}.png`), png);
  console.log(`${nombre}.webp  ${meta.width}×${meta.height}  ${(salida.length / 1024).toFixed(0)} KB  (calidad ${calidad})`);
}

async function capturar(browser: Browser, c: Captura) {
  const contexto = await browser.newContext({
    viewport: TAMANOS[c.vista],
    deviceScaleFactor: c.vista === "celular" ? 2 : 1,
    colorScheme: "light",
    locale: "es-PE",
    timezoneId: "America/Lima",
  });
  await contexto.addInitScript(() => {
    try {
      localStorage.setItem("theme", "light");
    } catch {}
  });
  const page = await contexto.newPage();
  try {
    await entrar(page, c.cuenta);
    await c.preparar(page);
    await page.waitForLoadState("networkidle").catch(() => {});
    await limpiar(page);
    await ocultarCorreos(page);
    await page.waitForTimeout(400);
    const png = await page.screenshot({ type: "png" });
    await guardarWebp(png, c.nombre, c.ancho * (c.vista === "celular" ? 2 : 1));
  } finally {
    await contexto.close();
  }
}

async function main() {
  await mkdir(SALIDA, { recursive: true });
  // lvh.me resuelve a 127.0.0.1 por DNS público; se fija aquí para no depender de la red.
  const browser = await chromium.launch({ args: ["--host-resolver-rules=MAP *.lvh.me 127.0.0.1, MAP lvh.me 127.0.0.1"] });
  const necesita = (n: string) => !SOLO || SOLO.includes(n);
  try {
    await crearEjemplos(browser, necesita);
    for (const c of CAPTURAS) {
      if (SOLO && !SOLO.includes(c.nombre)) continue;
      try {
        await capturar(browser, c);
      } catch (e) {
        console.error(`No se pudo capturar ${c.nombre}:`, e instanceof Error ? e.message : e);
        process.exitCode = 1;
      }
    }
  } finally {
    await browser.close();
    await borrarEjemplos();
  }
}

void main();

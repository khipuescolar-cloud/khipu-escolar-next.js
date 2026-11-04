// Asistente de reuniones con disponibilidad y solicitud de una familia (specs/40). Usa las cuentas demo de AGENTS.md.
import "dotenv/config";
import pg from "pg";
import { expect, test, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) => `http://nuevohorizonte.lvh.me:${PUERTO}${ruta}`;
const bd = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

async function entrar(page: Page, correo: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("/inicio"));
}

/** Un martes dentro de 1–2 semanas (AAAA-MM-DD, hora de Lima). */
function martesProximo(): string {
  const d = new Date(Date.now() + 7 * 86_400_000);
  while (d.getUTCDay() !== 2) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

test.afterAll(async () => {
  await bd.end();
});

test("dirección arma una reunión con Lucía y Pedro viendo su disponibilidad; Rosa solicita y Lucía confirma", async ({ page }) => {
  test.setTimeout(180_000); // flujo con 3 cuentas y rutas que se compilan en dev la primera vez
  const sello = Date.now();
  const titulo = `Coordinación e2e ${sello}`;
  const motivo = `Solicitud e2e ${sello}`;
  const inicio = new Date();
  const martes = martesProximo();
  try {
    // 1. Dirección: tipo, participantes, fecha y cuadrícula.
    await entrar(page, "direccion@nuevohorizonte.demo");
    await page.goto(colegio("/reuniones/nueva"));
    await page.getByLabel("Tipo de reunión").selectOption("direccion");
    for (const nombre of ["Lucía", "Pedro"]) {
      await page.getByLabel("Personal del colegio").fill(nombre);
      await page.getByRole("button", { name: "Requerido" }).first().click();
    }
    await expect(page.getByRole("list", { name: "Participantes elegidos" }).getByRole("listitem")).toHaveCount(2);
    await page.getByLabel("Familias").selectOption("ninguno");
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByLabel("Fecha", { exact: true }).fill(martes);
    await page.getByLabel("Duración").selectOption("45");
    await page.getByLabel("Hora preferida").fill("10:00");
    await page.getByRole("button", { name: "Ver disponibilidad" }).click();
    await expect(page.getByRole("heading", { name: "Franjas libres para todos los requeridos" })).toBeVisible();
    // Nunca se ven títulos ni motivos ajenos: solo «Ocupado» o «Clase».
    const alternativa = page.getByRole("region", { name: "Franjas libres para todos los requeridos" }).getByRole("button").first();
    await alternativa.click();
    await page.getByRole("button", { name: /Usar .* y seguir/ }).click();

    // 2. Detalles y confirmación (el servidor revalida).
    await page.getByLabel("Título", { exact: true }).fill(titulo);
    await page.getByLabel("Modalidad").selectOption("presencial");
    await page.getByLabel("Lugar", { exact: true }).fill("Dirección");
    await page.getByRole("button", { name: "Confirmar reunión" }).click();
    await page.waitForURL(/\/reuniones\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    await expect(page.getByText("Lucía", { exact: false }).first()).toBeVisible();

    // 3. Lucía (invitada) la ve y la acepta.
    await entrar(page, "lucia.garcia@nuevohorizonte.demo");
    await page.goto(colegio("/reuniones"));
    await page.getByRole("link", { name: titulo }).click();
    await page.waitForURL(/\/reuniones\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    await page.getByRole("button", { name: "Aceptar", exact: true }).click();
    // La sección «Tu respuesta» se vuelve a renderizar con el estado guardado (el toast puede no alcanzar a verse).
    await expect(page.getByText("Aceptada", { exact: false }).first()).toBeVisible();

    // 4. Rosa solicita una reunión a Lucía (tutora de Mateo).
    await entrar(page, "rosa.quispe@gmail.com");
    await page.goto(colegio("/reuniones/solicitar"));
    const valor = async (etiqueta: string, texto: string) => (await page.getByLabel(etiqueta).locator("option", { hasText: texto }).first().getAttribute("value")) ?? "";
    await page.getByLabel("¿Sobre quién?").selectOption(await valor("¿Sobre quién?", "Mateo"));
    await page.getByLabel("¿Con quién?").selectOption(await valor("¿Con quién?", "Lucía"));
    await page.getByLabel("Motivo").fill(motivo);
    await expect(page.getByText("Buscando horarios…")).toHaveCount(0); // espera a que carguen las franjas ofrecidas
    const franjas = page.locator("input[name=franja]");
    if (await franjas.count()) await page.locator("label:has(input[name=franja])").first().click();
    else {
      await page.getByLabel("Fecha", { exact: true }).fill(martes);
      await page.getByLabel("Hora", { exact: true }).fill("15:30");
    }
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await page.waitForURL(/\/reuniones\/[0-9a-f-]{36}$/);
    await expect(page.getByText(/Tu solicitud está por confirmar/)).toBeVisible();
    const url = page.url();

    // 5. Lucía la confirma (revalida su agenda y reserva).
    await entrar(page, "lucia.garcia@nuevohorizonte.demo");
    await page.goto(url.replace(/^https?:\/\/[^/]+/, colegio("")));
    await page.getByRole("button", { name: "Confirmar solicitud" }).click();
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Confirmar solicitud" })).toHaveCount(0);
    await expect(page.getByText("Confirmada", { exact: false }).first()).toBeVisible();
  } finally {
    await bd.query("delete from avisos where plantilla like 'reunion%' and created_at >= $1", [inicio]);
    await bd.query("delete from notificaciones where tipo = 'reunion' and created_at >= $1", [inicio]);
    await bd.query("delete from reuniones where titulo = $1 or motivo = $2", [titulo, motivo]);
  }
});

test("una familia no puede consultar la disponibilidad del personal", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com");
  // /reuniones tiene loading.tsx: la respuesta ya empezó a transmitirse (200) cuando la página llama a forbidden(), así
  // que se comprueba la pantalla de acceso denegado y que no se muestra el asistente.
  await page.goto(colegio("/reuniones/nueva"));
  await expect(page.getByRole("heading", { name: "No tienes acceso a esta sección" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nueva reunión" })).toHaveCount(0);
});

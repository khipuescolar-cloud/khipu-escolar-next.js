import "dotenv/config";
import pg from "pg";
import { expect, test, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";
import { crearColegioTemporal, type ColegioTemporal } from "./ayudantes/colegio-temporal";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (slug: string, ruta: string) => `http://${slug}.lvh.me:${PUERTO}${ruta}`;
const bd = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

async function entrarProfesora(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("lucia.garcia@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("nuevohorizonte", "/inicio"));
}

async function entrarRosa(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("rosa.quispe@gmail.com");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("nuevohorizonte", "/inicio"));
}

test.afterAll(async () => {
  await bd.end();
});

test("Lucía convoca a 3.° B, Rosa confirma, Lucía ve la confirmación y publica el acta, Rosa la lee", async ({ page, context }) => {
  const titulo = `Reunión e2e ${Date.now()}`;
  const inicio = new Date();
  const manana = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });

  try {
    // 1. Lucía convoca a 3.° B con el asistente (specs/40): tutoría, 18:00 (fuera de la jornada, lo confirma).
    await entrarProfesora(page);
    await page.goto(colegio("nuevohorizonte", "/reuniones/nueva"));
    await page.getByLabel("Tipo de reunión").selectOption("tutoria");
    await page.getByLabel("Familias").selectOption("salon");
    await page.getByRole("combobox", { name: /^Salón/ }).selectOption({ label: "3.° B" });
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByLabel("Fecha", { exact: true }).fill(manana);
    await page.getByLabel("Hora preferida").fill("18:00");
    await page.getByRole("button", { name: "Ver disponibilidad" }).click();
    await page.getByRole("button", { name: /Usar 18:00 y seguir/ }).click();
    await page.getByLabel("Título", { exact: true }).fill(titulo);
    await page.getByLabel("Lugar", { exact: true }).fill("Aula 3.° B");
    await page.getByLabel(/Programar igual fuera de la jornada/).check();
    await page.getByRole("button", { name: "Confirmar reunión" }).click();
    await page.waitForURL(/\/reuniones\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();

    // 2. Rosa confirma.
    await context.clearCookies();
    await entrarRosa(page);
    await page.goto(colegio("nuevohorizonte", "/reuniones"));
    const tarjeta = page.locator("li", { hasText: titulo });
    await expect(tarjeta.getByText("Sin respuesta").first()).toBeVisible();
    await tarjeta.getByLabel("Nota (opcional)").fill("Ahí estaré.");
    await tarjeta.getByRole("button", { name: "Aceptar", exact: true }).click();
    await expect(page.getByText("Listo, confirmamos que asistirás.")).toBeVisible();

    // 3. Lucía ve la confirmación.
    await context.clearCookies();
    await entrarProfesora(page);
    await page.goto(colegio("nuevohorizonte", "/reuniones"));
    await page.getByRole("link", { name: titulo }).click();
    await expect(page.getByRole("heading", { name: "Confirmaciones" })).toBeVisible();
    const asistiran = page.locator("section[aria-labelledby=confirmaciones] > div > div", { hasText: "Aceptaron" }).first();
    await expect(asistiran.getByText("Rosa Quispe Mamani")).toBeVisible();
    await expect(asistiran.getByText("«Ahí estaré.»")).toBeVisible();

    // 4. La reunión «ocurre» (se adelanta el inicio en la BD) y Lucía marca asistencia y publica el acta.
    await bd.query("update reuniones set inicio = now() - interval '2 hours' where titulo = $1", [titulo]);
    await page.reload();
    await page.getByRole("button", { name: "Marcar asistencia" }).click();
    await page.getByRole("button", { name: "Guardar asistencia" }).click();
    await expect(page.getByText("Asistencia guardada.")).toBeVisible();
    await page.getByRole("button", { name: "Escribir acta" }).click();
    await page.getByLabel("Acta", { exact: true }).fill("Se acordó revisar las tareas cada viernes. Próxima reunión en noviembre.");
    await page.getByLabel(/Publicar a las familias/).check();
    await page.getByRole("button", { name: "Guardar acta" }).click();
    await expect(page.getByText(/Acta publicada/)).toBeVisible();

    // 5. Rosa lee el acta.
    await context.clearCookies();
    await entrarRosa(page);
    await page.goto(colegio("nuevohorizonte", "/reuniones"));
    await page.getByRole("link", { name: titulo }).first().click();
    await expect(page.getByRole("heading", { name: "Acta" })).toBeVisible();
    await expect(page.getByText("Se acordó revisar las tareas cada viernes.")).toBeVisible();
  } finally {
    await bd.query("delete from avisos where plantilla like 'reunion%' and created_at >= $1", [inicio]);
    await bd.query("delete from notificaciones where tipo = 'reunion' and created_at >= $1", [inicio]);
    await bd.query("delete from reuniones where titulo = $1", [titulo]);
  }
});

test("el colegio con plan Base no tiene reuniones (403)", async ({ page }) => {
  const base: ColegioTemporal = await crearColegioTemporal({ plan: "base", prefijo: "e2e-base" });
  try {
    await page.goto("/login");
    await page.getByLabel("Correo").fill(base.correos.direccion);
    await page.getByLabel("Contraseña").fill("demo123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(colegio(base.slug, "/inicio"));
    const res = await page.goto(colegio(base.slug, "/reuniones"));
    await esperarSinAcceso(page, res);
  } finally {
    await base.limpiar();
  }
});

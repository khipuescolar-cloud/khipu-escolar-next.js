import { strFromU8 } from "fflate";
import { expect, test, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (slug: string, ruta: string) => `http://${slug}.lvh.me:${PUERTO}${ruta}`;

async function entrar(page: Page, correo: string, slug: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio(slug, "/inicio"));
}

test("profesora crea una tarea y la familia la ve agrupada", async ({ page, context }) => {
  const titulo = `Tarea e2e ${Date.now()}`;
  await entrar(page, "lucia.garcia@nuevohorizonte.demo", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/tareas"));
  await page.getByLabel("Título", { exact: true }).fill(titulo);
  const manana = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  await page.getByLabel("Fecha de entrega", { exact: true }).fill(manana);
  await page.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea creada.")).toBeVisible();
  await expect(page.getByText(titulo)).toBeVisible();

  await context.clearCookies();
  await page.goto("/login");
  await page.getByLabel("Correo").fill("rosa.quispe@gmail.com");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/elegir-colegio");
  await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  await page.waitForURL(colegio("nuevohorizonte", "/inicio"));
  await page.goto(colegio("nuevohorizonte", "/tareas"));
  await expect(page.getByRole("heading", { name: "Para mañana" })).toBeVisible();
  await expect(page.getByText(titulo)).toBeVisible();

  // Limpieza: la profesora borra la tarea.
  await context.clearCookies();
  await entrar(page, "lucia.garcia@nuevohorizonte.demo", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/tareas"));
  await page.locator("li", { hasText: titulo }).getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText(titulo)).toHaveCount(0);
});

test("la agenda muestra la semana, el mini calendario y las entregas", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/agenda"));
  await expect(page.getByRole("heading", { name: /Semana del/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Mes siguiente/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nuevo evento" })).toBeVisible();
});

test("dirección ve los periodos y las notas de todos los cursos", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/notas/periodos"));
  await expect(page.getByText("IV Bimestre 2026")).toBeVisible();
  await page.goto(colegio("nuevohorizonte", "/notas"));
  await expect(page.getByRole("link", { name: "Gestionar periodos" })).toBeVisible();
  await page.goto(colegio("nuevohorizonte", "/notas?seccion=periodo"));
  await expect(page.getByText("Calificación del periodo").first()).toBeVisible();
});

test("la profesora edita su tarea y descarga el calendario .ics", async ({ page }) => {
  const titulo = `Tarea editable ${Date.now()}`;
  const nuevo = `${titulo} (corregida)`;
  await entrar(page, "lucia.garcia@nuevohorizonte.demo", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/tareas"));
  await page.getByLabel("Título", { exact: true }).fill(titulo);
  const manana = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  await page.getByLabel("Fecha de entrega", { exact: true }).fill(manana);
  await page.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea creada.")).toBeVisible();

  const fila = page.locator("li", { hasText: titulo }).first();
  await fila.getByText("Editar tarea").click();
  await fila.getByLabel("Nombre de la tarea").fill(nuevo);
  await fila.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Tarea actualizada.")).toBeVisible();
  await expect(page.locator("li", { hasText: nuevo }).first()).toBeVisible();

  const r = await page.request.get(colegio("nuevohorizonte", "/api/agenda.ics"));
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("text/calendar");
  const ics = strFromU8(new Uint8Array(await r.body()));
  expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
  expect(ics).toContain(`Entrega: ${nuevo}`);
  expect(ics).toContain("@khipuescolar");

  await page.goto(colegio("nuevohorizonte", "/agenda"));
  await expect(page.getByRole("link", { name: "Descargar calendario (.ics)" })).toBeVisible();

  // Limpieza.
  await page.goto(colegio("nuevohorizonte", "/tareas"));
  await page.locator("li", { hasText: nuevo }).first().getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByText(nuevo)).toHaveCount(0);
});

// Flujo principal de tareas estilo Classroom (specs/39): el docente crea una tarea para dos salones → la apoderada la
// entrega en nombre de su hijo → el docente la devuelve → la apoderada la reentrega. Datos demo de Nuevo Horizonte.
import { expect, test, type Page } from "@playwright/test";
import { sql } from "./ayudantes/colegio-temporal";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) => `http://nuevohorizonte.lvh.me:${PUERTO}${ruta}`;
const INICIO = new Date();
const titulo = `Tarea classroom e2e ${Date.now()}`;

test.afterAll(async () => {
  // La tarea tiene entregas: no se elimina desde la UI (se archivaría). Se borra aquí con todo en cascada.
  await sql("delete from tareas where titulo = $1", [titulo]);
  await sql("delete from avisos where tipo = 'tarea' and created_at >= $1", [INICIO]);
  await sql("delete from notificaciones where tipo = 'tarea' and created_at >= $1", [INICIO]);
});

async function entrar(page: Page, correo: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("/inicio"));
}

test("docente crea multi-sección → apoderada entrega → docente devuelve → reentrega", async ({ page }) => {
  // 1. Pedro Salas dicta Ciencia y Tecnología en 3.° B, 5.° B y 6.° A: crea la tarea en 3.° B y 5.° B.
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  await page.goto(colegio("/tareas"));
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Curso").selectOption({ label: "Ciencia y Tecnología · 3.° B" });
  await dialogo.getByLabel(/5\.° B/).check();
  await expect(dialogo.getByText(/\d+ estudiantes/)).toBeVisible();
  await dialogo.getByLabel("Título", { exact: true }).fill(titulo);
  await dialogo.getByLabel("Instrucciones (opcional)").fill("Dibuja el ciclo del agua y explícalo.");
  const enTresDias = new Date(Date.now() + 3 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  await dialogo.getByLabel("Fecha de entrega", { exact: true }).fill(enTresDias);
  await dialogo.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea creada.")).toBeVisible();
  const tarjeta = page.locator("li", { hasText: titulo });
  await expect(tarjeta.getByText(/3\.° B · 5\.° B/)).toBeVisible();

  // 2. Rosa Quispe (apoderada de Mateo, 3.° B) la ve y la entrega en su nombre.
  await entrar(page, "rosa.quispe@gmail.com");
  await page.goto(colegio("/tareas"));
  await page.getByRole("link", { name: new RegExp(titulo) }).first().click();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  await page.getByLabel("Respuesta (opcional)").fill("El agua se evapora, se condensa y llueve.");
  await page.getByRole("button", { name: "Entregar" }).click();
  await expect(page.getByText("¡Entregada!")).toBeVisible();
  await expect(page.getByText(/Intento 1/)).toBeVisible();
  const url = page.url();

  // 3. Pedro la devuelve con una observación.
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  await page.goto(colegio("/tareas"));
  await page.locator("li", { hasText: titulo }).getByRole("link", { name: "Revisar entregas" }).click();
  const fila = page.locator("li", { hasText: "El agua se evapora" });
  await fila.getByLabel("Observación (privada)").fill("Agrega la infiltración.");
  await fila.getByRole("button", { name: "Devolver para corregir" }).click();
  await expect(page.getByText("Devuelta para corrección.")).toBeVisible();

  // 4. Rosa ve la observación y reentrega (intento 2).
  await entrar(page, "rosa.quispe@gmail.com");
  await page.goto(url);
  await expect(page.getByText("Agrega la infiltración.")).toBeVisible();
  await page.getByLabel("Respuesta (opcional)").fill("Evaporación, condensación, precipitación e infiltración.");
  await page.getByRole("button", { name: "Entregar" }).click();
  await expect(page.getByText(/Intento 2/)).toBeVisible();
});

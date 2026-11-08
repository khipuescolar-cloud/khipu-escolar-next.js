// Flujo principal de tareas estilo Classroom (specs/39): el docente crea una tarea para dos salones → la apoderada la
// entrega en nombre de su hijo → el docente la revisa con nota y sube las notas → la apoderada ve la calificación y el
// aviso. Datos demo de Nuevo Horizonte.
import { expect, test, type Page } from "@playwright/test";
import { sql } from "./ayudantes/colegio-temporal";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) => `http://nuevohorizonte.lvh.me:${PUERTO}${ruta}`;
const INICIO = new Date();
const titulo = `Tarea classroom e2e ${Date.now()}`;

test.afterAll(async () => {
  // La tarea tiene entregas y notas: no se elimina desde la UI. Se borran aquí su columna del registro y la tarea.
  await sql("delete from eventos_academicos where grupo_id in (select grupo_id from evaluaciones where tarea_id in (select id from tareas where titulo = $1))", [titulo]);
  await sql("delete from historial_notas where evaluacion_id in (select id from evaluaciones where tarea_id in (select id from tareas where titulo = $1))", [titulo]);
  await sql("delete from evaluaciones where tarea_id in (select id from tareas where titulo = $1)", [titulo]);
  await sql("delete from tareas where titulo = $1", [titulo]);
  await sql("delete from notificaciones where tipo = 'calificacion' and created_at >= $1", [INICIO]);
  await sql("delete from avisos where tipo = 'tarea' and created_at >= $1", [INICIO]);
  await sql("delete from notificaciones where tipo = 'tarea' and created_at >= $1", [INICIO]);
});

/** Pestaña «Cursos» (specs/39): abre la carpeta del curso en ese salón. */
async function abrirCarpeta(page: Page, curso: string, salon: string) {
  await page.goto(colegio("/tareas"));
  await page.getByRole("list", { name: "Cursos" }).getByRole("link").filter({ hasText: salon }).filter({ hasText: curso }).first().click();
  await page.waitForURL(/curso=/);
}

async function entrar(page: Page, correo: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("/inicio"));
}

test("docente crea multi-sección → apoderada entrega → docente califica y sube notas → la familia ve la nota", async ({ page }) => {
  // 1. Pedro Salas dicta Ciencia y Tecnología en 3.° B, 5.° B y 6.° A: crea la tarea en 3.° B y 5.° B.
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  await page.goto(colegio("/tareas"));
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("combobox", { name: /^Curso/ }).selectOption({ label: "Ciencia y Tecnología · 3.° B" });
  await dialogo.getByRole("checkbox", { name: /5\.° B/ }).check();
  // Toda tarea lleva nota: competencia del curso de origen y de la sección adicional.
  for (let i = 0; i < 2; i++) {
    await dialogo.getByText("Elige una competencia").first().click();
    await page.getByRole("listbox").getByRole("option").first().click();
  }
  await expect(dialogo.getByText(/\d+ estudiantes/)).toBeVisible();
  await dialogo.getByLabel("Título", { exact: true }).fill(titulo);
  await dialogo.getByLabel("Instrucciones (opcional)").fill("Dibuja el ciclo del agua y explícalo.");
  const enTresDias = new Date(Date.now() + 3 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  await dialogo.getByLabel("Fecha de entrega", { exact: true }).fill(enTresDias);
  await dialogo.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea creada.")).toBeVisible();
  // Pestaña «Cursos» (specs/39): aparece en la carpeta de cada curso, en 3.° B (con «También en 5.° B») y en 5.° B.
  await abrirCarpeta(page, "Ciencia y Tecnología", "3.° B");
  const enTresB = page.getByRole("region", { name: "3.° B" }).locator("li", { hasText: titulo });
  await expect(enTresB.getByText("También en 5.° B")).toBeVisible();
  await abrirCarpeta(page, "Ciencia y Tecnología", "5.° B");
  await expect(page.getByRole("region", { name: "5.° B" }).locator("li", { hasText: titulo })).toBeVisible();

  // 2. Rosa Quispe (apoderada de Mateo, 3.° B) la ve y la entrega en su nombre.
  await entrar(page, "rosa.quispe@gmail.com");
  await page.goto(colegio("/tareas"));
  await page.getByRole("link", { name: new RegExp(titulo) }).first().click();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  await page.getByLabel("Respuesta (opcional)").fill("El agua se evapora, se condensa y llueve.");
  await page.getByRole("button", { name: "Entregar" }).click();
  // Al entregar, el formulario se reemplaza por el estado de la entrega (sin toast).
  await expect(page.getByRole("button", { name: "Anular entrega" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Lo que se entregó" }).getByText(/Enviado el/)).toBeVisible();
  const url = page.url();

  // 3. Pedro la devuelve con una observación.
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  await abrirCarpeta(page, "Ciencia y Tecnología", "3.° B");
  await page.getByRole("region", { name: "3.° B" }).locator("li", { hasText: titulo }).getByRole("link", { name: /Revisar entregas/ }).click();
  // La lista del salón: Mateo «Entregado» con «Revisar»; se califica desde su panel.
  const fila = page.getByRole("row", { name: /Quispe Huamán, Mateo/ });
  await fila.getByRole("button", { name: /^Revisar/ }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByText("El agua se evapora, se condensa y llueve.")).toBeVisible();
  await panel.getByText("Logro destacado").click();
  await panel.getByLabel("Comentario para el estudiante (opcional)").fill("Muy bien explicado.");
  await panel.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByText("Nota guardada.")).toBeVisible();
  await expect(fila.getByRole("cell", { name: "AD", exact: true })).toBeVisible();
  // Subir notas: quienes no entregaron reciben «NE» y la familia recibe el aviso.
  await page.getByRole("button", { name: "Subir notas" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Subir notas" }).click();
  await expect(page.getByText(/Notas subidas\. Las familias/)).toBeVisible();
  await expect(page.getByRole("cell", { name: "NE", exact: true }).first()).toBeVisible();

  // 4. Rosa ve la calificación y el comentario en la tarea, y el aviso en sus notificaciones.
  await entrar(page, "rosa.quispe@gmail.com");
  await page.goto(url);
  await expect(page.getByText("Logro destacado")).toBeVisible();
  await expect(page.getByRole("list", { name: "Avance de la entrega" }).locator("[aria-current=step]")).toContainText("Calificada");
  await expect(page.getByText("Muy bien explicado.")).toBeVisible();
  await expect.poll(async () => {
    await page.goto(colegio("/notificaciones"));
    return page.getByText(new RegExp(`Se calificó la tarea «${titulo}»`)).count();
  }, { timeout: 20_000 }).toBeGreaterThan(0);
});

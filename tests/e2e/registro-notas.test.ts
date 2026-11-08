import "dotenv/config";
import { expect, test } from "@playwright/test";
import { sql } from "./ayudantes/colegio-temporal";

const puerto = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) => `http://nuevohorizonte.lvh.me:${puerto}${ruta}`;
const carpeta = "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad";
const titulo = `Práctica e2e ${Date.now()}`;
const tituloObs = `Observada e2e ${Date.now()}`;
const tituloImp = `Importada e2e ${Date.now()}`;
const tareaTitulo = `Tarea notas e2e ${Date.now()}`;
let cursoId = "";

test.beforeAll(async () => {
  const [c] = await sql<{ id: string }>(`select cu.id from cursos cu join salones s on s.id=cu.salon_id join memberships m on m.id=cu.profesor_id join profiles p on p.id=m.user_id where p.email=$1 and cu.nombre='Matemática' and s.nombre='3.° B' limit 1`, ["lucia.garcia@nuevohorizonte.demo"]);
  cursoId = c.id;
});
test.afterAll(async () => {
  if (!cursoId) return;
  for (const t of [titulo, tituloObs, tituloImp]) {
    await sql(`delete from historial_notas where evaluacion_id in (select id from evaluaciones where curso_id=$1 and titulo=$2)`, [cursoId, t]);
    await sql(`delete from evaluaciones where curso_id=$1 and titulo=$2`, [cursoId, t]);
  }
  await sql(`delete from historial_notas where evaluacion_id in (select e.id from evaluaciones e join tareas t on t.id=e.tarea_id where t.titulo=$1)`, [tareaTitulo]);
  await sql(`delete from evaluaciones where tarea_id in (select id from tareas where titulo=$1)`, [tareaTitulo]);
  await sql(`delete from evaluaciones where curso_id=$1 and titulo=$2`, [cursoId, `Tarea: ${tareaTitulo}`]);
  await sql(`delete from tareas where titulo=$1`, [tareaTitulo]);
});

test("docente crea una calificación y ve una tarea en el mismo registro", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("lucia.garcia@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("/inicio"));
  await page.goto(colegio("/notas"));
  await expect(page.getByRole("heading", { name: "Registro de notas" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${carpeta}/notasB-mis-cursos-1440.png`, fullPage: true });
  await page.getByRole("link", { name: "Abrir registro" }).first().click();
  await page.goto(colegio(`/notas/${cursoId}`));
  await expect(page.getByRole("heading", { name: /Matemática.*3.° B/ })).toBeVisible();
  await page.screenshot({ path: `${carpeta}/notasB-registro-1440.png`, fullPage: true });
  const boton = page.getByRole("button", { name: "Nueva calificación" });
  await boton.click();
  const hoja = page.getByRole("dialog", { name: "Nueva calificación" });
  if (!(await hoja.isVisible())) await boton.click();
  await expect(hoja).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${carpeta}/notasB-nueva-paso1-1440.png` });
  await hoja.getByLabel("Nombre").fill(titulo);
  const fecha = new Date(Date.now() - 10 * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  await hoja.getByLabel("Fecha de la actividad").fill(fecha);
  const notas = hoja.getByRole("combobox", { name: /Nota de/ });
  for (let i = 0; i < 3; i++) {
    await notas.nth(i).click();
    await page.getByRole("option", { name: "A", exact: true }).click();
  }
  await hoja.getByRole("button", { name: "Continuar" }).click();
  await expect(hoja.getByText("¿A qué competencia corresponde esta calificación?")).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${carpeta}/notasB-nueva-paso2-1440.png` });
  await hoja.getByRole("button", { name: /Resuelve problemas/ }).first().click();
  await hoja.getByRole("button", { name: "Guardar calificación" }).click();
  await expect(page.getByText(titulo).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(titulo).first()).toBeVisible();
  await page.getByRole("button", { name: new RegExp(titulo) }).first().click();
  await expect(page.getByRole("dialog", { name: titulo })).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${carpeta}/notasB-detalle-1440.png` });
  await page.getByRole("button", { name: "Cerrar" }).click();
  await page.getByRole("button", { name: new RegExp(`.*, ${titulo}:`) }).first().click();
  await page.screenshot({ path: `${carpeta}/notasB-edicion-1440.png` });
  await page.getByRole("combobox", { name: /Nota de/ }).click();
  await page.getByRole("option", { name: "B", exact: true }).click();
  const correccion = page.getByRole("dialog", { name: "Corregir nota" });
  await expect(correccion).toBeVisible();
  await expect(correccion.getByText("Valor anterior")).toBeVisible();
  await correccion.getByLabel("Motivo de la corrección").fill("corto");
  await correccion.getByRole("button", { name: "Guardar corrección" }).click();
  await expect(correccion.getByText("Escribe al menos 8 caracteres.")).toBeVisible();
  await correccion.getByLabel("Motivo de la corrección").fill("Error de digitación al pasar la nota");
  await correccion.getByRole("button", { name: "Guardar corrección" }).click();
  await expect(correccion).toBeHidden();
  await expect(page.getByRole("button", { name: new RegExp(`.*, ${titulo}: B`) }).first()).toBeVisible();
  const [historial] = await sql<{ n: string }>(`select count(*)::text n from historial_notas h join evaluaciones e on e.id=h.evaluacion_id where e.curso_id=$1 and e.titulo=$2 and h.motivo is not null`, [cursoId, titulo]);
  expect(Number(historial.n)).toBeGreaterThan(0);
  for (const [w, h] of [[1024, 768], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(colegio("/notas"));
    await page.screenshot({ path: `${carpeta}/notasB-mis-cursos-${w}.png` });
    await page.goto(colegio(`/notas/${cursoId}`));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `${carpeta}/notasB-registro-${w}.png` });
    await page.getByRole("button", { name: "Nueva calificación" }).click();
    const nueva = page.getByRole("dialog", { name: "Nueva calificación" });
    await expect(nueva).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${carpeta}/notasB-nueva-paso1-${w}.png` });
    await nueva.getByLabel("Nombre").fill("Borrador de captura");
    await nueva.getByRole("button", { name: "Continuar" }).click();
    await page.screenshot({ path: `${carpeta}/notasB-nueva-paso2-${w}.png` });
    await nueva.getByRole("button", { name: "Cerrar" }).click();
    await page.getByRole("button", { name: new RegExp(titulo) }).first().click();
    await expect(page.getByRole("dialog", { name: titulo })).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${carpeta}/notasB-detalle-${w}.png` });
    await page.getByRole("button", { name: "Cerrar" }).click();
    await page.getByRole("button", { name: new RegExp(`.*, ${titulo}:`) }).first().click();
    await page.screenshot({ path: `${carpeta}/notasB-edicion-${w}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(colegio("/tareas"));
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const tarea = page.getByRole("dialog", { name: "Nueva tarea" });
  await expect(tarea).toBeVisible();
  await tarea.getByRole("combobox", { name: "Curso" }).selectOption({ label: "Matemática · 3.° B" });
  await tarea.getByText("Elige una competencia").click();
  await page.getByRole("option", { name: /Resuelve problemas de cantidad/ }).click();
  await tarea.getByLabel("Título", { exact: true }).fill(tareaTitulo);
  await tarea.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea creada.")).toBeVisible();
  const [creada] = await sql<{ id: string }>(`select id from tareas where titulo=$1`, [tareaTitulo]);
  await page.goto(colegio(`/tareas/${creada.id}/revision`));
  // Nadie entregó por Khipu: se califica a quien lo entregó en físico, desde su panel «Ver».
  const primera = page.getByRole("row").filter({ has: page.getByRole("button", { name: /^Ver/ }) }).first();
  await primera.getByRole("button", { name: /^Ver/ }).click();
  const panel = page.getByRole("dialog");
  await panel.getByText("Lo entregó en físico").click();
  await panel.getByText("Logro esperado").click();
  await panel.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByText("Nota guardada.")).toBeVisible();
  await expect(primera.getByRole("cell", { name: "A", exact: true })).toBeVisible();
  await page.goto(colegio(`/notas/${cursoId}`));
  await expect(page.getByRole("button", { name: new RegExp(tareaTitulo) }).first()).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Manual/ }).first()).toBeVisible();
  const columnaTarea = page.getByRole("columnheader", { name: new RegExp(tareaTitulo) });
  await expect(columnaTarea).toContainText("Tarea");
  await expect(columnaTarea).not.toContainText("Manual");
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(colegio("/notas"));
    await expect(page.getByRole("heading", { name: "Mis cursos" })).toBeVisible();
    await page.screenshot({ path: `${carpeta}/notasC-mis-cursos-${w}.png`, fullPage: true });
    await page.goto(colegio(`/notas/${cursoId}`));
    await expect(page.getByRole("button", { name: new RegExp(tareaTitulo) }).first()).toBeVisible();
    await page.screenshot({ path: `${carpeta}/notasC-registro-${w}.png`, fullPage: true });
    await page.getByRole("button", { name: new RegExp(`.*, ${titulo}:`) }).first().click();
    await page.getByRole("combobox", { name: /Nota de/ }).click();
    await page.getByRole("option", { name: "A", exact: true }).click();
    const dlg = page.getByRole("dialog", { name: "Corregir nota" });
    await expect(dlg).toBeVisible();
    await dlg.getByLabel("Motivo de la corrección").fill("corto");
    await dlg.getByRole("button", { name: "Guardar corrección" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${carpeta}/notasC-correccion-${w}.png` });
    await dlg.getByRole("button", { name: "Cancelar" }).click();
    await page.getByRole("button", { name: new RegExp(tareaTitulo) }).first().click();
    const det = page.getByRole("dialog", { name: new RegExp(tareaTitulo) });
    await expect(det.getByText("Registrada el")).toBeVisible();
    await expect(det.getByRole("link", { name: "Abrir tarea" })).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${carpeta}/notasC-detalle-tarea-${w}.png` });
  }
});

async function entrarLucia(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("lucia.garcia@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("/inicio"));
}

test("observación al crear, plantilla, importación con vista previa e informe de progreso", async ({ page }) => {
  test.setTimeout(120_000);
  await entrarLucia(page);
  for (const [w, h] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(colegio(`/notas/${cursoId}`));
    await expect(page.getByRole("heading", { name: /Matemática.*3.° B/ })).toBeVisible();
    await expect(page.getByTestId("estado-cierre").getByText("Abierto", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${carpeta}/obs-cabecera-${w}.png` });
    // Nueva calificación con observaciones.
    await page.getByRole("button", { name: "Nueva calificación" }).click();
    const hoja = page.getByRole("dialog", { name: "Nueva calificación" });
    await expect(hoja).toBeVisible();
    await page.waitForTimeout(400);
    await hoja.getByLabel("Nombre").fill(w === 1440 ? tituloObs : "Borrador de captura");
    const notas = hoja.getByRole("combobox", { name: /Nota de/ });
    await notas.nth(0).click();
    await page.getByRole("option", { name: "C", exact: true }).click();
    await hoja.getByRole("textbox", { name: /Observación de/ }).nth(0).fill("Conversó durante la prueba y no terminó el ejercicio 3");
    await notas.nth(1).click();
    await page.getByRole("option", { name: "AD", exact: true }).click();
    await hoja.getByRole("textbox", { name: /Observación de/ }).nth(1).fill("Explicó su procedimiento al resto de la clase");
    await page.screenshot({ path: `${carpeta}/obs-nueva-${w}.png` });
    if (w === 390) { await hoja.getByRole("button", { name: "Cerrar" }).click(); continue; }
    await hoja.getByRole("button", { name: "Continuar" }).click();
    await hoja.getByRole("button", { name: /Resuelve problemas/ }).first().click();
    await hoja.getByRole("button", { name: "Guardar calificación" }).click();
    await expect(page.getByText("Calificación guardada.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Observación de .* en .*Observada e2e.* \(privada\)/ }).first()).toBeVisible();
  }
  const [obs] = await sql<{ n: string }>(`select count(*)::text n from notas n join evaluaciones e on e.id=n.evaluacion_id where e.curso_id=$1 and e.titulo=$2 and n.comentario is not null and n.comentario_privado = true`, [cursoId, tituloObs]);
  expect(Number(obs.n)).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(colegio(`/notas/${cursoId}`));
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.screenshot({ path: `${carpeta}/obs-menu-390.png` });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(colegio(`/notas/${cursoId}`));
  await page.screenshot({ path: `${carpeta}/obs-tabla-1440.png`, fullPage: true });

  // Plantilla, importación con vista previa e idempotencia.
  await page.getByRole("button", { name: "Importar / Exportar" }).click();
  const panel = page.getByRole("dialog", { name: "Importar / Exportar" });
  const xlsx = page.waitForEvent("download");
  await panel.getByRole("link", { name: /Descargar plantilla \(Excel\)/ }).click();
  expect((await xlsx).suggestedFilename()).toMatch(/^plantilla-notas-matematica.*\.xlsx$/);
  const descarga = page.waitForEvent("download");
  await panel.getByRole("link", { name: "Plantilla CSV" }).click();
  const archivo = await descarga;
  const { readFileSync, writeFileSync } = await import("node:fs");
  const texto = readFileSync((await archivo.path())!, "utf8");
  expect(texto.startsWith("\uFEFFalumno_id;apellidos_nombres;nota;observacion")).toBe(true);
  const lineas = texto.trim().split("\r\n");
  const filas = lineas.slice(1).map((l) => l.split(";"));
  expect(filas.length).toBeGreaterThanOrEqual(2);
  filas[0][2] = "AD"; filas[0][3] = "Participó activamente";
  filas[1][2] = "Z";
  const contenido = [lineas[0], ...filas.map((f) => f.join(";")), `00000000-0000-4000-8000-000000000000;Fantasma, Ana;A;`].join("\r\n");
  const ruta = `${carpeta}/plantilla-llena-e2e.csv`;
  writeFileSync(ruta, "\uFEFF" + contenido);
  await panel.getByLabel("Nombre de la actividad").fill(tituloImp);
  await panel.getByRole("combobox", { name: "Competencia de la actividad importada" }).click();
  await page.getByRole("option", { name: /Resuelve problemas/ }).first().click();
  await panel.locator('input[type="file"]').setInputFiles(ruta);
  const vista = panel.getByTestId("vista-previa");
  await expect(vista.getByText("Válidas: 1")).toBeVisible();
  await expect(vista.getByText(/Alumno desconocido/)).toBeVisible();
  await expect(vista.getByText(/inválida/)).toBeVisible();
  await page.screenshot({ path: `${carpeta}/obs-importar-1440.png` });
  await panel.getByRole("button", { name: /Importar 1 nota/ }).click();
  await expect(page.getByText(/Importamos 1 nota/)).toBeVisible();
  const [imp] = await sql<{ n: string }>(`select count(*)::text n from notas n join evaluaciones e on e.id=n.evaluacion_id where e.curso_id=$1 and e.titulo=$2 and n.comentario='Participó activamente'`, [cursoId, tituloImp]);
  expect(Number(imp.n)).toBe(1);

  // Informe de progreso.
  await page.reload();
  await page.getByRole("button", { name: "Informe de progreso" }).click();
  const informe = page.getByRole("dialog", { name: "Informe de progreso" });
  await expect(informe.getByLabel("Buscar alumno")).toBeVisible();
  await informe.getByRole("button", { name: /Sin informe|Borrador|Compartido/ }).first().click();
  await expect(informe.getByText("Notas del periodo en esta competencia")).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${carpeta}/obs-informe-1440.png` });
  await informe.getByRole("button", { name: "Cerrar" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("menuitem", { name: "Informe de progreso" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${carpeta}/obs-informe-lista-390.png` });
  await informe.getByRole("button", { name: /Sin informe|Borrador|Compartido/ }).first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${carpeta}/obs-informe-detalle-390.png` });
  await informe.getByRole("button", { name: "Atrás" }).click();
  await informe.getByRole("button", { name: "Cerrar" }).click();
  await page.getByRole("button", { name: "Herramientas" }).click();
  await page.getByRole("menuitem", { name: "Importar / Exportar" }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${carpeta}/obs-importar-390.png` });
});

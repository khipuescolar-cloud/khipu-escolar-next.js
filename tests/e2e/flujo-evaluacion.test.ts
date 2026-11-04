// Flujo de evaluación (specs/11): la profesora crea una prueba escrita de dos competencias, ve el registro auxiliar
// agrupado con el promedio en vivo y comparte el informe de progreso. Crea su propio salón, curso y alumno en Nuevo
// Horizonte (nombres únicos) y los borra al terminar: no toca los datos del seed.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) => `http://nuevohorizonte.lvh.me:${PUERTO}${ruta}`;
const sufijo = randomUUID().slice(0, 6);
const ids = { tenant: "", salon: "", curso: "", alumno: "", ausente: "", periodo: "" };

async function sql<T = Record<string, unknown>>(consulta: string, params: unknown[] = []): Promise<T[]> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    return (await cliente.query(consulta, params)).rows as T[];
  } finally {
    await cliente.end();
  }
}

async function entrar(page: Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("/inicio"));
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const [t] = await sql<{ id: string }>(`select id from tenants where slug = 'nuevohorizonte'`);
  ids.tenant = t.id;
  const [lucia] = await sql<{ id: string }>(
    `select m.id from memberships m join profiles p on p.id = m.user_id where m.tenant_id = $1 and m.rol = 'profesor' and p.email = 'lucia.garcia@nuevohorizonte.demo'`,
    [ids.tenant],
  );
  const [periodo] = await sql<{ id: string }>(
    `select id from periodos where tenant_id = $1 and cerrado = false and 'primaria' = any(niveles) order by anio desc, numero desc limit 1`,
    [ids.tenant],
  );
  ids.periodo = periodo.id;
  ids.salon = (await sql<{ id: string }>(`insert into salones (id, tenant_id, nombre, nivel, anio) values (gen_random_uuid(), $1, $2, 'primaria', 2026) returning id`, [ids.tenant, `E2E Evaluación ${sufijo}`]))[0].id;
  ids.curso = (await sql<{ id: string }>(`insert into cursos (id, tenant_id, salon_id, nombre, profesor_id) values (gen_random_uuid(), $1, $2, 'Comunicación', $3) returning id`, [ids.tenant, ids.salon, lucia.id]))[0].id;
  ids.alumno = (await sql<{ id: string }>(`insert into alumnos (id, tenant_id, salon_id, nombres, apellidos) values (gen_random_uuid(), $1, $2, 'Ana', $3) returning id`, [ids.tenant, ids.salon, `Prueba ${sufijo}`]))[0].id;
  // Beto faltó hoy (falta del día): al crear la evaluación de hoy queda con NSP (specs/37).
  ids.ausente = (await sql<{ id: string }>(`insert into alumnos (id, tenant_id, salon_id, nombres, apellidos) values (gen_random_uuid(), $1, $2, 'Beto', $3) returning id`, [ids.tenant, ids.salon, `Ausente ${sufijo}`]))[0].id;
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  await sql(`insert into asistencias (id, tenant_id, alumno_id, ambito, fecha, hora, estado, origen, updated_at) values (gen_random_uuid(), $1, $2, 'dia', $3, '09:00', 'falta', 'automatico', now())`, [ids.tenant, ids.ausente, hoy]);
  // Rosa (apoderada del seed) queda vinculada a Ana solo durante la prueba: recibe la notificación al publicar (specs/38).
  const [rosa] = await sql<{ id: string }>(
    `select m.id from memberships m join profiles p on p.id = m.user_id where m.tenant_id = $1 and m.rol = 'apoderado' and p.email = 'rosa.quispe@gmail.com'`,
    [ids.tenant],
  );
  await sql(`insert into apoderados_alumnos (id, tenant_id, apoderado_id, alumno_id) values (gen_random_uuid(), $1, $2, $3)`, [ids.tenant, rosa.id, ids.alumno]);
  for (const [orden, nombre] of [[1, "Lee diversos tipos de textos"], [2, "Escribe diversos tipos de textos"]] as const) {
    await sql(`insert into competencias (id, tenant_id, curso_id, nombre, orden) values (gen_random_uuid(), $1, $2, $3, $4)`, [ids.tenant, ids.curso, nombre, orden]);
  }
});

test.afterAll(async () => {
  if (!ids.salon) return;
  await sql(`delete from avisos where plantilla = 'informe_progreso' and referencia_id = $1`, [ids.curso]);
  await sql(`delete from avisos where referencia_id in (select grupo_id::text from evaluaciones where curso_id = $1)`, [ids.curso]);
  await sql(`delete from eventos_academicos where grupo_id in (select grupo_id from evaluaciones where curso_id = $1)`, [ids.curso]);
  // historial_notas → evaluaciones es RESTRICT (specs/37): en la limpieza de datos de prueba se borra primero el historial.
  await sql(`delete from historial_notas where evaluacion_id in (select id from evaluaciones where curso_id = $1)`, [ids.curso]);
  await sql(`delete from evaluaciones where curso_id = $1`, [ids.curso]);
  await sql(`delete from envios_informe_progreso where curso_id = $1`, [ids.curso]);
  await sql(`delete from informes_progreso where alumno_id = $1`, [ids.alumno]);
  await sql(`delete from alumnos where id = any($1::uuid[])`, [[ids.alumno, ids.ausente].filter(Boolean)]);
  await sql(`delete from salones where id = $1`, [ids.salon]);
});

test("programa una prueba de dos competencias, pone notas en borrador y publica los resultados", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio(`/notas?curso=${ids.curso}&periodo=${ids.periodo}`));
  await expect(page.getByRole("link", { name: "Registro auxiliar" })).toBeVisible();

  await page.getByRole("button", { name: "Nueva evaluación" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Título").fill("Prueba escrita 1");
  await dialogo.getByLabel("Instrumento").selectOption("prueba_escrita");
  await dialogo.getByLabel(/Descripción/).fill("Comprensión lectora y producción de textos.");
  await expect(dialogo.getByRole("checkbox", { name: /Avisar a las familias/ })).toBeChecked();
  await dialogo.getByRole("checkbox", { name: "Lee diversos tipos de textos" }).check();
  await dialogo.getByRole("checkbox", { name: "Escribe diversos tipos de textos" }).check();
  await expect(dialogo.getByText("2 columnas, una nota por competencia")).toBeVisible();
  await dialogo.getByRole("button", { name: "Crear evaluación" }).click();
  await expect(page.getByText(/^Evaluación creada: una columna por cada una de sus 2 competencias\..*1 alumno quedó con NSP por inasistencia\./)).toBeVisible();

  const tabla = page.getByRole("table");
  await expect(tabla.getByRole("columnheader", { name: "Lee diversos tipos de textos" })).toBeVisible();
  await expect(tabla.getByRole("columnheader", { name: "Escribe diversos tipos de textos" })).toBeVisible();
  await expect(tabla.getByText(/Prueba escrita ·/).first()).toBeVisible();
  await expect(tabla.getByText("Borrador").first()).toBeVisible();
  // Beto faltó: NSP en sus dos columnas, con la leyenda y el plazo para justificar.
  await expect(page.getByText("No se presentó (faltó; lo pone la asistencia)")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Nota de Beto en Prueba escrita 1" }).first()).toHaveValue("NSP");
  await expect(tabla.getByText(/Sin justificar · hasta/).first()).toBeVisible();
  // Sin sugerencia (por defecto) no hay columna de promedio.
  await expect(tabla.getByRole("columnheader", { name: /Promedio/ })).toHaveCount(0);

  await page.getByRole("combobox", { name: "Nota de Ana en Prueba escrita 1" }).first().selectOption("A");
  await expect(page.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Programada · borrador")).toBeVisible();
  await page.getByRole("button", { name: "Publicar resultados de Prueba escrita 1" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publicar resultados" }).click();
  await expect(page.getByText(/^Resultados publicados\./)).toBeVisible();
  await expect(page.getByText("Publicada", { exact: true })).toBeVisible();
  await page.getByText(/Historial de cambios \(3\)/).click();
  await expect(page.getByText(/sin nota → A/)).toBeVisible();
  await expect(page.getByText(/sin nota → NSP/).first()).toBeVisible();

  // Publicada: cambiar una nota pide el motivo.
  await page.getByRole("combobox", { name: "Nota de Ana en Prueba escrita 1" }).first().selectOption("B");
  const dialogoMotivo = page.getByRole("dialog", { name: "Motivo del cambio" });
  await expect(dialogoMotivo).toBeVisible();
  await dialogoMotivo.getByLabel("Motivo").fill("Error al digitar");
  await dialogoMotivo.getByRole("button", { name: "Guardar cambio" }).click();
  await expect(page.getByText("Cambio guardado con su motivo.")).toBeVisible();
});

test("la apoderada recibe la notificación en Khipu y llega a la actividad publicada (specs/38)", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com");
  // El worker corre en after() de la publicación: se espera a que aparezca.
  await expect(async () => {
    await page.goto(colegio("/notificaciones"));
    await expect(page.getByText(/Hay un resultado nuevo de Ana en Comunicación/).first()).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await page.getByText(/Hay un resultado nuevo de Ana en Comunicación/).first().click();
  await page.waitForURL(/\/notas\?alumno=/);
  await expect(page.getByRole("heading", { name: "Registro auxiliar publicado" }).first()).toBeVisible();
  await expect(page.getByText("Prueba escrita 1").first()).toBeVisible();
});

test("la profesora escribe y comparte el informe de progreso", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio(`/notas?curso=${ids.curso}&periodo=${ids.periodo}&seccion=informe`));
  await expect(page.getByText("Aún no compartido")).toBeVisible();
  await expect(page.getByText("Notas del periodo (1)").first()).toBeVisible(); // Ana (A) y Beto (NSP)
  await page.getByLabel(/Qué ha logrado/).first().fill("Identifica la idea principal del texto.");
  await page.getByLabel(/Qué recomendamos reforzar/).first().fill("Leer 15 minutos cada día.");
  await page.getByRole("button", { name: "Guardar informe" }).first().click();
  await expect(page.getByText("Informe guardado.")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Compartir con las familias" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Compartir" }).click();
  await expect(page.getByText("Compartido con las familias")).toBeVisible();
  const [envio] = await sql(`select 1 from envios_informe_progreso where curso_id = $1`, [ids.curso]);
  expect(envio).toBeTruthy();
});

test("la profesora registra una incidencia con retiro anticipado y las clases que se perdió (specs/37)", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio("/incidencias"));
  await expect(page.getByRole("heading", { name: "Incidencias" })).toBeVisible();
  await page.getByLabel("Alumno").selectOption({ label: `Prueba ${sufijo}, Ana · E2E Evaluación ${sufijo}` });
  await page.getByLabel("Hora", { exact: true }).fill("10:15");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Qué pasó").fill("Se golpeó la rodilla en el patio.");
  await page.getByLabel("Se retiró antes del colegio").check();
  await page.getByLabel("Hora del retiro").fill("10:30");
  await page.getByRole("checkbox", { name: /Comunicación/ }).check();
  await page.getByRole("button", { name: "Registrar incidencia" }).click();
  await expect(page.getByText(/Incidencia registrada\. Registramos la inasistencia en 1 clase/)).toBeVisible();
  await expect(page.getByText("Clases perdidas: Comunicación")).toBeVisible();
});

// Flujo de evaluación (specs/11 y 47): la profesora crea una calificación con observaciones en el registro, publica los
// resultados, la familia los ve y ella escribe y comparte el informe de progreso. Crea su propio salón, curso y alumno en Nuevo
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

test("crea una calificación con observación, publica los resultados y corrige una nota publicada", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio(`/notas/${ids.curso}?periodo=${ids.periodo}`));
  await expect(page.getByRole("heading", { name: /Comunicación/ })).toBeVisible();

  await page.getByRole("button", { name: "Nueva calificación" }).click();
  const hoja = page.getByRole("dialog", { name: "Nueva calificación" });
  await hoja.getByLabel("Nombre").fill("Prueba escrita 1");
  await hoja.getByRole("combobox", { name: "Nota de Ana" }).click();
  await page.getByRole("option", { name: "A", exact: true }).click();
  await hoja.getByLabel("Observación de Ana").fill("Identifica la idea principal del texto.");
  // Una observación sin nota se rechaza con un mensaje claro.
  await hoja.getByLabel("Observación de Beto").fill("Faltó material.");
  await hoja.getByRole("button", { name: "Continuar" }).click();
  await expect(hoja.getByText(/Pon una nota para guardar la observación/)).toBeVisible();
  await hoja.getByLabel("Observación de Beto").fill("");
  await hoja.getByRole("switch", { name: "Observaciones visibles para la familia" }).click();
  await hoja.getByRole("button", { name: "Continuar" }).click();
  await hoja.getByRole("button", { name: "Lee diversos tipos de textos" }).click();
  await hoja.getByRole("button", { name: "Guardar calificación" }).click();
  await expect(page.getByText("Calificación guardada.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Observación de Ana en Prueba escrita 1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ana, Prueba escrita 1: A" })).toBeVisible();

  // Borrador: la familia aún no lo ve. Se publica desde el detalle de la actividad.
  await page.getByRole("button", { name: /Prueba escrita 1/ }).first().click();
  const detalle = page.getByRole("dialog", { name: "Prueba escrita 1" });
  await expect(detalle.getByText("Borrador: la familia aún no los ve")).toBeVisible();
  await detalle.getByRole("button", { name: "Publicar resultados" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Publicar resultados" }).click();
  await expect(page.getByText(/^Resultados publicados\./)).toBeVisible();
  await expect(detalle.getByText("Publicados a las familias")).toBeVisible();
  await detalle.getByRole("button", { name: "Cerrar" }).click();

  // Publicada: cambiar una nota pide el motivo.
  await page.getByRole("button", { name: "Ana, Prueba escrita 1: A" }).click();
  await page.getByRole("combobox", { name: "Nota de Ana en Prueba escrita 1" }).click();
  await page.getByRole("option", { name: "B", exact: true }).click();
  const motivo = page.getByRole("dialog", { name: "Corregir nota" });
  await motivo.getByLabel("Motivo de la corrección").fill("Error al digitar");
  await motivo.getByRole("button", { name: "Guardar corrección" }).click();
  await expect(page.getByRole("button", { name: "Ana, Prueba escrita 1: B" })).toBeVisible();
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
  // La observación marcada como visible llega a la familia.
  await expect(page.getByText("Identifica la idea principal del texto.").first()).toBeVisible();
});

test("la profesora escribe y comparte el informe de progreso", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio(`/notas/${ids.curso}?periodo=${ids.periodo}`));
  await page.getByRole("button", { name: "Informe de progreso" }).click();
  const panel = page.getByRole("dialog", { name: "Informe de progreso" });
  await panel.getByLabel("Buscar alumno").fill("Ana");
  await expect(panel.getByText("Sin informe")).toBeVisible();
  await panel.getByRole("button", { name: new RegExp(`Prueba ${sufijo}, Ana`) }).click();
  await expect(panel.getByText("Notas del periodo en esta competencia")).toBeVisible();
  await expect(panel.getByText("Prueba escrita 1").first()).toBeVisible(); // evidencia: la nota de Ana
  await panel.getByLabel(/Qué logró/).fill("Identifica la idea principal del texto.");
  await panel.getByLabel(/Qué recomendamos reforzar/).fill("Leer 15 minutos cada día.");
  await panel.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Informe guardado.")).toBeVisible();
  await expect(panel.getByText("Borrador").first()).toBeVisible();

  await panel.getByRole("button", { name: "Compartir con la familia" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Compartir", exact: true }).click();
  await expect(panel.getByText("Compartido", { exact: true }).first()).toBeVisible();
  const [envio] = await sql(`select 1 from envios_informe_progreso where curso_id = $1`, [ids.curso]);
  expect(envio).toBeTruthy();
});

test("la profesora registra una incidencia con retiro anticipado y las clases que se perdió (specs/37)", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio("/incidencias"));
  await expect(page.getByRole("heading", { name: "Incidencias" })).toBeVisible();
  await page.getByRole("button", { name: "Registrar incidencia" }).click();
  await page.getByRole("dialog").getByRole("combobox", { name: "Alumno" }).click();
  await page.getByRole("option", { name: `Prueba ${sufijo}, Ana · E2E Evaluación ${sufijo}` }).click();
  await page.getByLabel("Hora", { exact: true }).fill("10:15");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Qué pasó").fill("Se golpeó la rodilla en el patio.");
  await page.getByLabel("Se retiró antes del colegio").check();
  await page.getByLabel("Hora del retiro").fill("10:30");
  await page.getByRole("checkbox", { name: /Comunicación/ }).check();
  await page.getByRole("dialog").getByRole("button", { name: "Registrar incidencia" }).click();
  await expect(page.getByText(/Incidencia registrada\. Registramos la inasistencia en 1 clase/)).toBeVisible();
  await page.getByRole("row").filter({ hasText: `Prueba ${sufijo}, Ana` }).first().getByRole("button", { name: /Ver incidencia/ }).click();
  await expect(page.getByRole("dialog").getByText("Comunicación")).toBeVisible();
});

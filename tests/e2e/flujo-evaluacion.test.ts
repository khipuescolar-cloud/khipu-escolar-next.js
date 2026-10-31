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
const ids = { tenant: "", salon: "", curso: "", alumno: "", periodo: "" };

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
  for (const [orden, nombre] of [[1, "Lee diversos tipos de textos"], [2, "Escribe diversos tipos de textos"]] as const) {
    await sql(`insert into competencias (id, tenant_id, curso_id, nombre, orden) values (gen_random_uuid(), $1, $2, $3, $4)`, [ids.tenant, ids.curso, nombre, orden]);
  }
});

test.afterAll(async () => {
  if (!ids.salon) return;
  await sql(`delete from avisos where plantilla = 'informe_progreso' and referencia_id = $1`, [ids.curso]);
  await sql(`delete from evaluaciones where curso_id = $1`, [ids.curso]);
  await sql(`delete from envios_informe_progreso where curso_id = $1`, [ids.curso]);
  await sql(`delete from informes_progreso where alumno_id = $1`, [ids.alumno]);
  await sql(`delete from alumnos where id = $1`, [ids.alumno]);
  await sql(`delete from salones where id = $1`, [ids.salon]);
});

test("una prueba de dos competencias da una nota por competencia y el promedio se ve al momento", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio(`/notas?curso=${ids.curso}&periodo=${ids.periodo}`));
  await expect(page.getByRole("link", { name: "Registro auxiliar" })).toBeVisible();

  await page.getByRole("button", { name: "Nueva evaluación" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Título").fill("Prueba escrita 1");
  await dialogo.getByLabel("Instrumento").selectOption("prueba_escrita");
  await dialogo.getByRole("checkbox", { name: "Lee diversos tipos de textos" }).check();
  await dialogo.getByRole("checkbox", { name: "Escribe diversos tipos de textos" }).check();
  await expect(dialogo.getByText("2 columnas, una nota por competencia")).toBeVisible();
  await dialogo.getByRole("button", { name: "Crear evaluación" }).click();
  await expect(page.getByText("Evaluación creada: una columna por cada una de sus 2 competencias.")).toBeVisible();

  const tabla = page.getByRole("table");
  await expect(tabla.getByRole("columnheader", { name: "Lee diversos tipos de textos" })).toBeVisible();
  await expect(tabla.getByRole("columnheader", { name: "Escribe diversos tipos de textos" })).toBeVisible();
  await expect(tabla.getByText(/Prueba escrita ·/).first()).toBeVisible();

  await page.getByRole("combobox", { name: "Nota de Ana en Prueba escrita 1" }).first().selectOption("A");
  await expect(page.getByLabel("Promedio de Ana en Lee diversos tipos de textos: A, Logro esperado")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();
});

test("la profesora escribe y comparte el informe de progreso", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio(`/notas?curso=${ids.curso}&periodo=${ids.periodo}&seccion=informe`));
  await expect(page.getByText("Aún no compartido")).toBeVisible();
  await expect(page.getByText(/Va en A según 1 nota/)).toBeVisible();
  await page.getByLabel(/Qué ha logrado/).fill("Identifica la idea principal del texto.");
  await page.getByLabel(/Qué recomendamos reforzar/).fill("Leer 15 minutos cada día.");
  await page.getByRole("button", { name: "Guardar informe" }).click();
  await expect(page.getByText("Informe guardado.")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Compartir con las familias" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Compartir" }).click();
  await expect(page.getByText("Compartido con las familias")).toBeVisible();
  const [envio] = await sql(`select 1 from envios_informe_progreso where curso_id = $1`, [ids.curso]);
  expect(envio).toBeTruthy();
});

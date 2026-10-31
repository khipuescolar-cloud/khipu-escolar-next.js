// Capacidades y desempeños del CNEB (specs/30). Crea su propio salón, curso y alumno en Nuevo Horizonte (nombres únicos)
// y los borra al terminar: no toca los datos del seed.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) => `http://nuevohorizonte.lvh.me:${PUERTO}${ruta}`;
const sufijo = randomUUID().slice(0, 6);
const SALON = `E2E CNEB ${sufijo}`;
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
  const [periodo] = await sql<{ id: string }>(`select id from periodos where tenant_id = $1 and cerrado = false order by anio desc, numero desc limit 1`, [ids.tenant]);
  ids.periodo = periodo.id;
  ids.salon = (await sql<{ id: string }>(`insert into salones (id, tenant_id, nombre, nivel, anio) values (gen_random_uuid(), $1, $2, 'primaria', 2026) returning id`, [ids.tenant, SALON]))[0].id;
  ids.curso = (await sql<{ id: string }>(`insert into cursos (id, tenant_id, salon_id, nombre, profesor_id) values (gen_random_uuid(), $1, $2, 'Matemática', $3) returning id`, [ids.tenant, ids.salon, lucia.id]))[0].id;
  ids.alumno = (await sql<{ id: string }>(`insert into alumnos (id, tenant_id, salon_id, nombres, apellidos) values (gen_random_uuid(), $1, $2, 'Ana', $3) returning id`, [ids.tenant, ids.salon, `Prueba ${sufijo}`]))[0].id;
});

test.afterAll(async () => {
  if (!ids.salon) return;
  await sql(`delete from evaluaciones where curso_id = $1`, [ids.curso]);
  await sql(`delete from alumnos where id = $1`, [ids.alumno]);
  await sql(`delete from salones where id = $1`, [ids.salon]);
});

test("dirección indica el grado e importa el CNEB en un curso", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(colegio(`/notas?curso=${ids.curso}&periodo=${ids.periodo}&seccion=cneb`));
  await expect(page.getByRole("heading", { name: "Capacidades y desempeños de Matemática" })).toBeVisible();
  await expect(page.getByText("Este salón no tiene grado.")).toBeVisible();

  await page.getByRole("button", { name: "Indicar grado" }).click();
  await page.getByRole("dialog").locator('select[name="grado"]').selectOption("3");
  await page.getByRole("button", { name: "Guardar grado" }).click();
  await expect(page.getByText("Grado guardado: 3.° de primaria.")).toBeVisible();

  await page.getByRole("button", { name: "Importar desde el CNEB" }).click();
  await expect(page.getByRole("dialog").locator('select[name="area"]')).toHaveValue("matematica");
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await expect(page.getByText(/^Importamos 4 competencias, 16 capacidades y \d+ desempeños del CNEB\.$/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resuelve problemas de cantidad" })).toBeVisible();
  await expect(page.getByText("Traduce cantidades a expresiones numéricas", { exact: true })).toBeVisible();
  await expect(page.getByText("MAT-C23-P3-01")).toBeVisible();

  // Importar otra vez no duplica.
  await page.getByRole("button", { name: "Importar desde el CNEB" }).click();
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await expect(page.getByText("Ya estaba todo importado. No se agregó nada.")).toBeVisible();
  const [{ n }] = await sql<{ n: string }>(`select count(*) n from competencias where curso_id = $1`, [ids.curso]);
  expect(Number(n)).toBe(4);
});

test("la profesora marca desempeños al crear una evaluación", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio(`/notas?curso=${ids.curso}&periodo=${ids.periodo}`));
  await page.getByRole("button", { name: "Nueva evaluación" }).click();
  await page.getByLabel("Título").fill(`Práctica CNEB ${sufijo}`);
  await page.getByRole("dialog").locator('select[name="competenciaId"]').selectOption({ label: "Resuelve problemas de cantidad" });
  await page.getByRole("checkbox", { name: /MAT-C23-P3-03/ }).check();
  await page.getByRole("checkbox", { name: /MAT-C23-P3-04/ }).check();
  await page.getByRole("button", { name: "Crear evaluación" }).click();
  await expect(page.getByText("Evaluación creada.")).toBeVisible();
  await expect(page.getByText(/peso 1 · 2 desempeños/)).toBeVisible();

  const vinculos = await sql<{ codigo: string }>(
    `select d.codigo from evaluacion_desempenos ed join desempenos d on d.id = ed.desempeno_id join evaluaciones e on e.id = ed.evaluacion_id where e.curso_id = $1 order by d.codigo`,
    [ids.curso],
  );
  expect(vinculos.map((v) => v.codigo)).toEqual(["MAT-C23-P3-03", "MAT-C23-P3-04"]);

  // Con una nota, la calificación del periodo muestra qué desempeños se evaluaron.
  await sql(
    `insert into notas (id, tenant_id, evaluacion_id, alumno_id, valor_literal, registrado_por, updated_at)
     select gen_random_uuid(), e.tenant_id, e.id, $2, 'A', c.profesor_id, now() from evaluaciones e join cursos c on c.id = e.curso_id where e.curso_id = $1`,
    [ids.curso, ids.alumno],
  );
  await page.goto(colegio(`/notas?curso=${ids.curso}&periodo=${ids.periodo}&seccion=periodo`));
  await page.getByText("Desempeños evaluados (2)").click();
  await expect(page.getByText("MAT-C23-P3-03")).toBeVisible();
});

test("la libreta muestra las capacidades y los desempeños evaluados", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(colegio(`/libreta?alumno=${ids.alumno}&periodo=${ids.periodo}`));
  await expect(page.getByRole("heading", { name: "Libreta" })).toBeVisible();
  await expect(page.getByText(/Capacidades:.*Traduce cantidades a expresiones numéricas/).first()).toBeVisible();
  await page.getByText("Desempeños evaluados (2)").click();
  await expect(page.getByText(/^Emplea estrategias y procedimientos como los siguientes: • Estrategias heurísticas/)).toBeVisible();
});

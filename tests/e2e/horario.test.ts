// Horario (specs/34): dirección asigna un bloque a 3.° B, Lucía lo ve en «Mi horario» y Rosa (madre de Mateo) en «Horario».
// Usa solo la estructura segura del seed (Nuevo Horizonte, 3.° B, Lucía, Rosa y Mateo). Elige una hora en que Lucía esté libre,
// y al terminar deja el casillero como estaba.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { Client } from "pg";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) => `http://nuevohorizonte.lvh.me:${PUERTO}${ruta}`;
const TITULO = `Taller e2e ${randomUUID().slice(0, 6)}`;
const NOMBRE_DIA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

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
  await page.waitForURL(/elegir-colegio|\/inicio/);
  if (page.url().includes("elegir-colegio")) await page.getByRole("link", { name: /Nuevo Horizonte/ }).click();
  await page.waitForURL(colegio("/inicio"));
}

const ids = { tenant: "", salon: "", lucia: "", mateo: "" };
const dia = (() => {
  const d = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" })).getDay();
  return d >= 1 && d <= 5 ? d : 1;
})();
let original: Record<string, unknown> | null = null;
let periodo: { id: string; nombre: string } | null = null;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const [t] = await sql<{ id: string }>(`select id from tenants where slug = 'nuevohorizonte'`);
  ids.tenant = t.id;
  const [s] = await sql<{ id: string }>(`select id from salones where tenant_id = $1 and nombre = '3.° B' and archivado_at is null`, [ids.tenant]);
  ids.salon = s.id;
  const [l] = await sql<{ id: string }>(
    `select m.id from memberships m join profiles p on p.id = m.user_id where m.tenant_id = $1 and m.rol = 'profesor' and p.email = 'lucia.garcia@nuevohorizonte.demo'`,
    [ids.tenant],
  );
  ids.lucia = l.id;
  const [m] = await sql<{ id: string }>(`select id from alumnos where salon_id = $1 and nombres like 'Mateo%' limit 1`, [ids.salon]);
  ids.mateo = m.id;
});

test.afterAll(async () => {
  // Deja el casillero como estaba (vacío o con su bloque original).
  if (!periodo) return;
  await sql(`delete from bloques_horario where salon_id = $1 and dia = $2 and periodo_id = $3`, [ids.salon, dia, periodo.id]);
  if (original) {
    await sql(
      `insert into bloques_horario (id, tenant_id, salon_id, dia, periodo_id, curso_id, titulo, profesor_id, aula, created_at, updated_at) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())`,
      [original.id, original.tenant_id, original.salon_id, original.dia, original.periodo_id, original.curso_id, original.titulo, original.profesor_id, original.aula],
    );
  }
});

/** Primera hora de clase de primaria en que Lucía no tiene nada (sin contar el propio casillero de 3.° B). */
async function horaLibreDeLucia() {
  const periodos = await sql<{ id: string; nombre: string; hora_inicio: string; hora_fin: string }>(
    `select id, nombre, hora_inicio, hora_fin from horario_periodos where tenant_id = $1 and nivel = 'primaria' and tipo = 'clase' order by hora_inicio`,
    [ids.tenant],
  );
  const ocupadas = await sql<{ hora_inicio: string; hora_fin: string; salon_id: string; periodo_id: string }>(
    `select hp.hora_inicio, hp.hora_fin, b.salon_id, b.periodo_id from bloques_horario b
       join horario_periodos hp on hp.id = b.periodo_id left join cursos c on c.id = b.curso_id
      where b.tenant_id = $1 and b.dia = $2 and (c.profesor_id = $3 or (b.curso_id is null and b.profesor_id = $3))`,
    [ids.tenant, dia, ids.lucia],
  );
  return periodos.find((p) => !ocupadas.some((o) => !(o.salon_id === ids.salon && o.periodo_id === p.id) && o.hora_inicio < p.hora_fin && p.hora_inicio < o.hora_fin)) ?? null;
}

test("dirección asigna un bloque en 3.° B; Lucía lo ve en «Mi horario» y Rosa en el horario de Mateo", async ({ page, context }) => {
  // 1. Dirección abre el horario de 3.° B (si primaria aún no tiene horas, usa las sugeridas).
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(colegio(`/horario?salon=${ids.salon}`));
  await expect(page.getByRole("heading", { name: "Horarios", level: 1 })).toBeVisible();
  const sugeridas = page.getByRole("button", { name: "Usar horas sugeridas" });
  if (await sugeridas.isVisible()) {
    await sugeridas.click();
    await expect(page.getByRole("table", { name: "Horario de 3.° B" })).toBeVisible();
  }
  periodo = await horaLibreDeLucia();
  expect(periodo, "Lucía no tiene ninguna hora libre ese día").not.toBeNull();
  [original] = await sql(`select * from bloques_horario where salon_id = $1 and dia = $2 and periodo_id = $3`, [ids.salon, dia, periodo!.id]);
  original ??= null;

  // 2. Toca el casillero y pone un bloque a cargo de Lucía.
  const nombreCasillero = new RegExp(`${NOMBRE_DIA[dia]}, ${periodo!.nombre.replace(/\./g, "\\.")}`);
  await page.getByRole("table", { name: "Horario de 3.° B" }).getByRole("button", { name: nombreCasillero }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Otro bloque (Tutoría, Formación…)").check();
  await dialogo.getByLabel("Título").fill(TITULO);
  await dialogo.getByLabel("A cargo de").selectOption(ids.lucia);
  await dialogo.getByLabel("Aula (opcional)").fill("Laboratorio");
  await dialogo.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardamos el horario.")).toBeVisible();
  await expect(page.getByRole("table", { name: "Horario de 3.° B" }).getByText(TITULO)).toBeVisible();

  // 3. Lucía lo ve en «Mi horario», en la columna de ese día, con el salón.
  await context.clearCookies();
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio("/horario"));
  await expect(page.getByRole("heading", { name: "Mi horario", level: 1 })).toBeVisible();
  const columna = page.getByRole("region", { name: new RegExp(`^${NOMBRE_DIA[dia]}`) });
  const bloque = columna.getByRole("listitem").filter({ hasText: TITULO });
  await expect(bloque).toBeVisible();
  await expect(bloque.getByText("3.° B")).toBeVisible();

  // 4. Rosa lo ve en el horario de Mateo.
  await context.clearCookies();
  await entrar(page, "rosa.quispe@gmail.com");
  await page.goto(colegio(`/horario?alumno=${ids.mateo}`));
  await expect(page.getByRole("heading", { name: "Horario", level: 1 })).toBeVisible();
  await expect(page.getByRole("table", { name: "Horario de 3.° B" }).getByText(TITULO)).toBeVisible();
  // La familia no edita: no hay casilleros con botón.
  await expect(page.getByRole("table", { name: "Horario de 3.° B" }).getByRole("button")).toHaveCount(0);
});

test("en el celular el horario se ve por días, con hoy elegido", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await entrar(page, "rosa.quispe@gmail.com");
  await page.goto(colegio(`/horario?alumno=${ids.mateo}`));
  await expect(page.getByRole("table")).toBeHidden();
  await expect(page.getByRole("tab", { name: new RegExp(NOMBRE_DIA[dia]) })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByText(TITULO)).toBeVisible();
});

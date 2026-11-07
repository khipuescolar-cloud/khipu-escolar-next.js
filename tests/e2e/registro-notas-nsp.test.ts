import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { crearColegioTemporal, sql, type ColegioTemporal } from "./ayudantes/colegio-temporal";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (slug: string, ruta: string) => `http://${slug}.lvh.me:${PUERTO}${ruta}`;
const carpeta = "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad";
const titulo = "Examen NSP e2e";
const dia = (n: number) => new Date(Date.now() - n * 86_400_000).toLocaleDateString("en-CA", { timeZone: "America/Lima" });

// Academia temporal (escala 0–20, IV Bimestre abierto del 12/10 al 18/12). Franco falta el día del examen.
let academia: ColegioTemporal;
let alumnoId = "";
let asistenciaId = "";
test.beforeAll(async () => {
  academia = await crearColegioTemporal({ plan: "pro", vigesimal: true, prefijo: "e2e-nsp" });
  [{ id: alumnoId }] = await sql<{ id: string }>(`select id from alumnos where tenant_id=$1 and nombres='Franco'`, [academia.tenantId]);
  [{ id: asistenciaId }] = await sql<{ id: string }>(
    `insert into asistencias (id, tenant_id, alumno_id, ambito, fecha, hora, estado, origen, updated_at) values (gen_random_uuid(), $1, $2, 'dia', $3, '08:00', 'falta', 'lista', now()) returning id`,
    [academia.tenantId, alumnoId, dia(5)],
  );
});
test.afterAll(async () => { await academia?.limpiar(); });

async function entrar(page: Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio(academia.slug, "/inicio"));
}

/** Captura a 1440×900 y a 390×844, y vuelve al tamaño de escritorio. */
async function capturar(page: Page, nombre: string) {
  for (const [ancho, alto] of [[1440, 900], [390, 844]] as const) {
    await page.setViewportSize({ width: ancho, height: alto });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${carpeta}/nsp-${nombre}-${ancho}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

test("NSP al crear la calificación, estado en la celda, decisión de recuperación y nota con su fecha", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await entrar(page, academia.correos.profesor);
  await page.goto(colegio(academia.slug, `/notas/${academia.cursoId}`));
  await page.getByRole("button", { name: "Nueva calificación" }).click();
  const hoja = page.getByRole("dialog", { name: "Nueva calificación" });
  await expect(hoja).toBeVisible();
  await hoja.getByLabel("Nombre").fill(titulo);
  await hoja.getByLabel("Fecha de la actividad").fill(dia(5));
  await hoja.getByRole("button", { name: "Continuar" }).click(); // todas las notas pendientes
  await hoja.getByRole("button", { name: /Resuelve problemas/ }).first().click();
  await hoja.getByRole("button", { name: "Guardar calificación" }).click();
  await expect(page.getByText("1 alumno quedó con NSP por inasistencia.")).toBeVisible();
  await page.reload();

  // Solo el ausente queda con NSP; los demás siguen pendientes (guion).
  const celda = page.getByRole("button", { name: `Franco, ${titulo}: NSP, Sin justificar` });
  await expect(celda).toBeVisible();
  await expect(page.getByRole("button", { name: `Andrea, ${titulo}: pendiente` })).toBeVisible();
  expect(await sql(`select 1 from notas n join evaluaciones e on e.id=n.evaluacion_id where e.titulo=$1 and n.marca='nsp'`, [titulo])).toHaveLength(1);
  await capturar(page, "celda");
  await celda.click();
  const dialogo = page.getByRole("dialog", { name: /NSP · No se presentó/ });
  await expect(dialogo.getByTestId("estado-nsp")).toContainText("Sin justificar");
  await expect(dialogo.getByRole("button", { name: "Autorizar recuperación" })).toHaveCount(0);
  await capturar(page, "sin-justificar");
  await dialogo.getByRole("button", { name: "Cerrar" }).click();

  // El tutor aprueba la justificación (fixture): la celda pasa a «Recup. pendiente».
  const [{ id: justificacionId }] = await sql<{ id: string }>(
    `insert into justificaciones (id, tenant_id, asistencia_id, apoderado_id, motivo, estado) select gen_random_uuid(), $1, $2, m.id, 'Fiebre', 'aceptada' from memberships m where m.tenant_id=$1 and m.rol='direccion' returning id`,
    [academia.tenantId, asistenciaId],
  );
  await sql(`update notas set justificacion_id=$1 where alumno_id=$2 and evaluacion_id in (select id from evaluaciones where titulo=$3)`, [justificacionId, alumnoId, titulo]);
  await page.reload();
  await page.getByRole("button", { name: `Franco, ${titulo}: NSP, Recup. pendiente` }).click();
  await expect(dialogo.getByTestId("estado-nsp")).toContainText("Falta justificada");
  await capturar(page, "decision");
  await dialogo.getByRole("button", { name: "Autorizar recuperación" }).click();
  await expect(dialogo.getByTestId("estado-nsp")).toContainText("Recuperación autorizada");
  await dialogo.getByRole("combobox", { name: "Nota de la recuperación" }).click();
  await page.getByRole("option", { name: "15", exact: true }).click();
  await expect(dialogo.getByLabel("Fecha en que la rindió")).toHaveValue(dia(0));
  await capturar(page, "recuperacion");
  await dialogo.getByRole("button", { name: "Registrar recuperación" }).click();
  await expect(dialogo).toBeHidden();

  // La nota queda en la actividad original, con su fecha de recuperación, y se ve el ícono de recuperación.
  await expect(page.getByRole("button", { name: `Franco, ${titulo}: 15` })).toBeVisible();
  await expect(page.getByRole("button", { name: `Recuperación de Franco en ${titulo}` })).toBeVisible();
  const filas = await sql<{ fecha: string; rec: string; fecha_recuperacion: string }>(
    `select to_char(e.fecha,'YYYY-MM-DD') fecha, n.recuperacion::text rec, to_char(n.fecha_recuperacion,'YYYY-MM-DD') fecha_recuperacion from notas n join evaluaciones e on e.id=n.evaluacion_id where e.titulo=$1 and n.alumno_id=$2`,
    [titulo, alumnoId],
  );
  expect(filas).toEqual([{ fecha: dia(5), rec: "autorizada", fecha_recuperacion: dia(0) }]);
  expect(await sql(`select 1 from evaluaciones where tenant_id=$1 and titulo=$2`, [academia.tenantId, titulo])).toHaveLength(1);
});

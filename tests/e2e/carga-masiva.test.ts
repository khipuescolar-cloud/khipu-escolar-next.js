import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { sql } from "./ayudantes/colegio-temporal";

// Carga masiva (specs/36) en el colegio demo: dirección carga un salón con cursos y una familia con dos hijos.
// Todo lo que crea lleva un sufijo propio y se borra al final (salón, cursos, alumnos, cuenta, avisos, auditoría y correos).

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const azar = Date.now().toString(36);
const SECCION = `Z${azar.slice(-4).toUpperCase()}`;
const ANIO = 2099; // año sin salones demo: el salón de la prueba no choca con nada
const FAMILIA = { email: `familia-${azar}@test-carga.demo`, dni: String(30000000 + (Date.now() % 9999999)).padStart(8, "0") };
const CODIGOS = [`E2E-${azar}-1`, `E2E-${azar}-2`];
const inicio = new Date();

async function entrar(page: Page, correo: string, clave: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill(clave);
  await page.getByRole("button", { name: "Entrar" }).click();
}

async function subir(page: Page, nombre: string, contenido: string) {
  await page.getByLabel("Archivo CSV o Excel (.xlsx)").setInputFiles({ name: nombre, mimeType: "text/csv", buffer: Buffer.from(contenido, "utf-8") });
  await expect(page.getByTestId("carga-vista")).toBeVisible({ timeout: 30_000 });
}

test.afterAll(async () => {
  const salones = await sql<{ id: string }>("select s.id from salones s join tenants t on t.id = s.tenant_id where t.slug = 'nuevohorizonte' and s.anio = $1 and s.seccion = $2", [ANIO, SECCION]);
  const salonIds = salones.map((s) => s.id);
  const perfiles = await sql<{ id: string }>("select id from profiles where email = $1", [FAMILIA.email]);
  const ids = perfiles.map((p) => p.id);
  const alumnos = await sql<{ id: string }>("select id from alumnos where codigo = any($1)", [CODIGOS]);
  const membresias = await sql<{ id: string }>("select id from memberships where user_id = any($1::uuid[])", [ids]);
  const vinculos = await sql<{ id: string }>("select id from apoderados_alumnos where alumno_id = any($1::uuid[])", [alumnos.map((a) => a.id)]);
  const cursos = await sql<{ id: string }>("select id from cursos where salon_id = any($1::uuid[])", [salonIds]);
  const entidades = [...salonIds, ...membresias, ...vinculos, ...cursos, ...alumnos].map((x) => (typeof x === "string" ? x : x.id));
  await sql("delete from auditoria where entidad_id = any($1)", [entidades]);
  await sql("delete from auditoria where entidad = 'carga_masiva' and created_at >= $1 and tenant_id = (select id from tenants where slug = 'nuevohorizonte')", [inicio]);
  await sql("delete from avisos where destinatario = $1", [FAMILIA.email]);
  await sql("delete from profiles where id = any($1::uuid[])", [ids]);
  await sql("delete from alumnos where codigo = any($1)", [CODIGOS]);
  await sql("delete from salones where id = any($1::uuid[])", [salonIds]);
  for (const id of ids) {
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${id}`, {
      method: "DELETE",
      headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
    });
  }
  const todos = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${FAMILIA.email}"`)}`)).json()) as { messages: { ID: string }[] };
  if (todos.messages.length) await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ IDs: todos.messages.map((m) => m.ID) }) });
});

test("dirección carga un salón con cursos y una familia con dos hijos, con vista previa y sin duplicar al repetir", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo", "demo123");
  await page.waitForURL(`${COLEGIO}/inicio`);
  await page.goto(`${COLEGIO}/gestion/carga-masiva?tipo=salones`);
  await expect(page.getByRole("heading", { name: "Carga masiva" })).toBeVisible();

  // Plantilla descargable.
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Plantilla Excel" }).click();
  expect((await descarga).suggestedFilename()).toBe("khipu-salones-y-cursos.xlsx");

  // 1. Salones y cursos: vista previa con un error por línea, confirmar y resultado.
  const salones = `nivel,grado,seccion,anio,curso,profesor\nprimaria,6,${SECCION},${ANIO},Matemática,x\nprimaria,6,${SECCION},${ANIO},Arte,\ncolegio,1,A,${ANIO},Arte,\n`;
  await subir(page, "salones.csv", salones);
  await expect(page.getByTestId("conteo-salonesNuevos")).toContainText("1");
  await expect(page.getByTestId("conteo-cursosNuevos")).toContainText("2");
  await expect(page.getByTestId("carga-errores")).toContainText("Línea 4: Nivel «colegio» no válido");
  await page.getByRole("button", { name: /Confirmar y cargar 1 fila/ }).click();
  await expect(page.getByTestId("carga-resultado")).toContainText("1 salón nuevo, 2 cursos nuevos");

  const [salon] = await sql<{ id: string; nombre: string }>("select s.id, s.nombre from salones s join tenants t on t.id = s.tenant_id where t.slug = 'nuevohorizonte' and s.anio = $1 and s.seccion = $2", [ANIO, SECCION]);
  expect(salon.nombre).toBe(`6.° ${SECCION}`);
  // Alumnos del salón nuevo (los alumnos se importan en su propia pantalla).
  for (const [i, codigo] of CODIGOS.entries()) {
    await sql("insert into alumnos (id, tenant_id, salon_id, nombres, apellidos, codigo) select gen_random_uuid(), tenant_id, id, $2, 'Carga E2E', $3 from salones where id = $1", [salon.id, `Hijo${i}`, codigo]);
  }

  // 2. Familias: un apoderado con dos hijos → una cuenta, dos vínculos, una bienvenida.
  await page.goto(`${COLEGIO}/gestion/carga-masiva?tipo=familias`);
  const familias = `alumno_codigo,apoderado_dni,nombres,apellidos,correo,parentesco\n${CODIGOS[0]},${FAMILIA.dni},Elsa,Carga E2E,${FAMILIA.email},madre\n${CODIGOS[1]},${FAMILIA.dni},Elsa,Carga E2E,${FAMILIA.email},madre\n`;
  await subir(page, "familias.csv", familias);
  await expect(page.getByTestId("conteo-familiasNuevas")).toContainText("1");
  await expect(page.getByTestId("conteo-hermanos")).toContainText("1");
  await expect(page.getByTestId("conteo-vinculosNuevos")).toContainText("2");
  await page.getByRole("button", { name: /Confirmar y cargar 2 filas/ }).click();
  await expect(page.getByTestId("carga-resultado")).toContainText("1 familia agregada");
  await expect(page.getByTestId("conteo-bienvenidas")).toContainText("1");

  // La bienvenida sale por la cola y no trae el DNI.
  let texto = "";
  for (let i = 0; i < 40 && !texto; i++) {
    const r = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${FAMILIA.email}"`)}`)).json()) as { messages: { ID: string }[] };
    if (r.messages.length) texto = ((await (await fetch(`${MAILPIT}/api/v1/message/${r.messages[0].ID}`)).json()) as { Text: string }).Text;
    else await new Promise((res) => setTimeout(res, 500));
  }
  expect(texto).toContain("Tu contraseña inicial es tu número de DNI");
  expect(texto).not.toContain(FAMILIA.dni);

  // Repetir el mismo archivo: nada nuevo que cargar.
  await page.reload();
  await subir(page, "familias.csv", familias);
  await expect(page.getByRole("button", { name: "No hay nada nuevo que cargar" })).toBeDisabled();

  // En Familias aparece con la invitación pendiente.
  await page.goto(`${COLEGIO}/gestion/apoderados?q=${encodeURIComponent(FAMILIA.email)}`);
  await expect(page.getByText(FAMILIA.email)).toBeVisible();
});

test("el administrativo solo ve la carga de familias", async ({ page }) => {
  await entrar(page, "secretaria@nuevohorizonte.demo", "demo123");
  await page.waitForURL(/\/(inicio|cambiar-password)/);
  await page.goto(`${COLEGIO}/gestion/carga-masiva?tipo=salones`);
  await expect(page.getByRole("heading", { name: "Carga masiva" })).toBeVisible();
  await expect(page.getByText("Antes, importa a los alumnos")).toBeVisible();
  await expect(page.getByRole("link", { name: "Salones y cursos" })).toHaveCount(0);
});

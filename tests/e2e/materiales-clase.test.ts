import { expect, test } from "@playwright/test";
import { sql } from "./ayudantes/colegio-temporal";
const puerto = process.env.E2E_PORT ?? "3000";
const base = `http://nuevohorizonte.lvh.me:${puerto}`;
let materialId: string, archivoId: string;
const titulo = `Material e2e ${Date.now()}`;
test.beforeAll(async () => {
  const [curso] = await sql<{ id: string; tenant_id: string; profesor_id: string }>("select c.id, c.tenant_id, c.profesor_id from cursos c join memberships m on m.id = c.profesor_id join profiles p on p.id = m.user_id where p.email = 'lucia.garcia@nuevohorizonte.demo' and c.nombre = 'Matemática' limit 1");
  if (!curso) throw new Error("Falta curso demo");
  [{ id: materialId }] = await sql<{ id: string }>("insert into materiales_clase (id, tenant_id, titulo, estado, creado_por, publicado_at) values (gen_random_uuid(), $1, $2, 'publicado', $3, now()) returning id", [curso.tenant_id, titulo, curso.profesor_id]);
  const [{ id: versionId }] = await sql<{ id: string }>("insert into material_versiones (id, tenant_id, material_id, numero, creada_por) values (gen_random_uuid(), $1, $2, 1, $3) returning id", [curso.tenant_id, materialId, curso.profesor_id]);
  [{ id: archivoId }] = await sql<{ id: string }>("insert into archivos (id, tenant_id, proveedor, public_id, mime_type, bytes, nombre) values (gen_random_uuid(), $1, 'local', $2, 'application/pdf', 10, $3) returning id", [curso.tenant_id, `test-${materialId}`, `${titulo}.pdf`]);
  await sql("insert into material_version_archivos (id, tenant_id, version_id, archivo_id, orden) values (gen_random_uuid(), $1, $2, $3, 0)", [curso.tenant_id, versionId, archivoId]);
  await sql("insert into material_secciones (id, tenant_id, material_id, curso_id) values (gen_random_uuid(), $1, $2, $3)", [curso.tenant_id, materialId, curso.id]);
});
test.afterAll(async () => {
  await sql("delete from tarea_materiales where material_id = $1", [materialId]);
  await sql("delete from materiales_clase where id = $1", [materialId]);
  await sql("delete from archivos where id = $1", [archivoId]);
});
test("docente encuentra material en Nueva tarea", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("lucia.garcia@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${base}/inicio`);
  await page.goto(`${base}/tareas`);
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("combobox", { name: /^Curso/ }).selectOption({ label: "Matemática · 3.° B" });
  await dialogo.getByText("Elegir de mis materiales").click();
  await expect(dialogo.getByRole("checkbox", { name: titulo })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad/w2-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad/w2-mobile.png" });
});

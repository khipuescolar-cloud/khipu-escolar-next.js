import { expect, test, type Page } from "@playwright/test";
import { sql } from "./ayudantes/colegio-temporal";
const puerto = process.env.E2E_PORT ?? "3000";
const base = `http://nuevohorizonte.lvh.me:${puerto}`;
const titulo = `Material W2 ${Date.now()}`;
const tarea = `Tarea W2 ${Date.now()}`;
let cursoGemelo: string;
let materialId: string;

async function entrar(page: Page, correo: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${base}/inicio`);
}

test.beforeAll(async () => {
  const [profesor] = await sql<{ tenant_id: string; profesor_id: string }>("select c.tenant_id, c.profesor_id from cursos c join memberships m on m.id=c.profesor_id join profiles p on p.id=m.user_id where p.email='lucia.garcia@nuevohorizonte.demo' and c.nombre='Matemática' limit 1");
  const [salon] = await sql<{ id: string }>("select id from salones where tenant_id=$1 and nombre='5.° A' limit 1", [profesor.tenant_id]);
  [{ id: cursoGemelo }] = await sql<{ id: string }>("insert into cursos (id, tenant_id, salon_id, nombre, profesor_id) values (gen_random_uuid(), $1, $2, 'Matemática', $3) returning id", [profesor.tenant_id, salon.id, profesor.profesor_id]);
});
test.afterAll(async () => {
  await sql("delete from tareas where titulo=$1", [tarea]);
  if (materialId) {
    const archivos = await sql<{ archivo_id: string }>("select mva.archivo_id from material_version_archivos mva join material_versiones mv on mv.id=mva.version_id where mv.material_id=$1", [materialId]);
    await sql("delete from materiales_clase where id=$1", [materialId]);
    for (const a of archivos) await sql("delete from archivos where id=$1", [a.archivo_id]);
  }
  await sql("delete from cursos where id=$1", [cursoGemelo]);
});

test("publica en dos secciones, consulta, descarga y reutiliza en tarea", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(`${base}/documentos?seccion=materiales`);
  await page.getByLabel("Título").fill(titulo);
  await page.getByLabel("Curso").selectOption({ label: "Matemática · 3.° B" });
  await page.getByRole("checkbox", { name: "5.° A" }).check();
  await page.getByLabel("Archivo PDF").setInputFiles({ name: `${titulo}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n") });
  await page.getByRole("button", { name: "Publicar material" }).click();
  await expect(page.getByRole("status")).toHaveText("Material publicado.");
  const [material] = await sql<{ id: string }>("select id from materiales_clase where titulo=$1", [titulo]);
  materialId = material.id;
  const [conteo] = await sql<{ secciones: string; archivos: string }>("select (select count(*) from material_secciones where material_id=$1)::text secciones, (select count(*) from material_version_archivos a join material_versiones v on v.id=a.version_id where v.material_id=$1)::text archivos", [materialId]);
  expect(conteo).toEqual({ secciones: "2", archivos: "1" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad/w2-r2-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad/w2-r2-mobile.png", fullPage: true });
  await entrar(page, "lucas.huaman@nuevohorizonte.demo");
  await page.goto(`${base}/documentos?seccion=materiales`);
  await expect(page.getByText(titulo).first()).toBeVisible();
  const descarga = page.getByRole("link", { name: new RegExp(titulo) }).first();
  expect((await page.request.get(new URL(await descarga.getAttribute("href") ?? "", base).toString())).status()).toBe(200);
  await entrar(page, "sofia.quispe@nuevohorizonte.demo");
  await page.goto(`${base}/documentos?seccion=materiales`);
  await expect(page.getByText(titulo)).toHaveCount(0);
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(`${base}/tareas`);
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("combobox", { name: /^Curso/ }).selectOption({ label: "Matemática · 3.° B" });
  await dialogo.getByText("Elegir de mis materiales").click();
  await dialogo.getByRole("checkbox", { name: titulo }).check();
  await dialogo.getByLabel("Título", { exact: true }).fill(tarea);
  await dialogo.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea creada.")).toBeVisible();
  const [referencia] = await sql<{ n: string }>("select count(*)::text n from tarea_materiales tm join tareas t on t.id=tm.tarea_id where t.titulo=$1 and tm.material_id=$2", [tarea, materialId]);
  expect(referencia.n).toBe("1");
  const [archivos] = await sql<{ n: string }>("select count(*)::text n from material_version_archivos a join material_versiones v on v.id=a.version_id where v.material_id=$1", [materialId]);
  expect(archivos.n).toBe("1");
});

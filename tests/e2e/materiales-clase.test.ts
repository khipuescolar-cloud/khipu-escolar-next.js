import { expect, test, type Page } from "@playwright/test";
import { sql } from "./ayudantes/colegio-temporal";

const puerto = process.env.E2E_PORT ?? "3000";
const base = `http://nuevohorizonte.lvh.me:${puerto}`;
const capturas = "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad";
const titulo = `Material carpetas ${Date.now()}`;
const tarea = `Tarea material ${Date.now()}`;
const carpetaNombre = `Unidad 1 ${Date.now()}`;
let cursoGemelo: string;
let materialId: string;
let carpetaId: string;

async function entrar(page: Page, correo: string) {
  await page.context().clearCookies();
  await page.goto(`${base}/login`);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(`${base}/inicio`);
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
  if (carpetaId) await sql("delete from carpetas_material where id=$1", [carpetaId]);
  if (cursoGemelo) await sql("delete from cursos where id=$1", [cursoGemelo]);
});

test("Lucía crea una subcarpeta y publica en un salón; alumno autorizado descarga y otro no ve", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(`${base}/documentos?seccion=materiales`);
  const enlaceSalon = page.getByRole("link", { name: "Matemática · 5.° A" }).last();
  await expect(enlaceSalon).toBeVisible();
  await expect(page.getByRole("link", { name: "Matemática · 3.° B" }).last()).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${capturas}/mat-profesora-carpetas-1440.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${capturas}/mat-profesora-carpetas-390.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await enlaceSalon.click();
  await page.getByRole("button", { name: "Nuevo", exact: true }).click();
  await page.screenshot({ path: `${capturas}/mat-nuevo-390.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await page.getByRole("menuitem", { name: "Nueva carpeta" }).click();
  await page.getByRole("dialog", { name: "Nueva carpeta" }).getByLabel("Nombre").fill(carpetaNombre);
  await page.getByRole("dialog", { name: "Nueva carpeta" }).getByRole("button", { name: "Crear", exact: true }).click();
  await expect(page.getByRole("link", { name: carpetaNombre })).toBeVisible();
  [{ id: carpetaId }] = await sql<{ id: string }>("select id from carpetas_material where nombre=$1", [carpetaNombre]);
  await page.getByRole("link", { name: carpetaNombre }).last().click();
  await expect(page.getByRole("navigation", { name: "Ruta de materiales" })).toContainText(carpetaNombre);
  await page.getByRole("button", { name: "Nuevo", exact: true }).click();
  await page.getByRole("menuitem", { name: "Subir material" }).click();
  const drawer = page.getByRole("dialog", { name: "Subir material" });
  await expect(drawer.getByLabel("Secciones")).toHaveCount(0);
  await expect(drawer.getByRole("checkbox", { name: "Publicar ahora" })).toBeChecked();
  await expect(drawer.getByLabel("Título")).toBeVisible();
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${capturas}/mat-drawer-390.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await drawer.getByLabel("Título").fill(titulo);
  await drawer.getByLabel("Archivos").setInputFiles({ name: `${titulo}.pdf`, mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n") });
  await drawer.getByRole("button", { name: "Subir material", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page.getByText("Material subido a Matemática · 5.° A.")).toBeVisible();
  [{ id: materialId }] = await sql<{ id: string }>("select id from materiales_clase where titulo=$1", [titulo]);
  const [dato] = await sql<{ carpeta_id: string; curso_id: string }>("select m.carpeta_id, s.curso_id from materiales_clase m join material_secciones s on s.material_id=m.id where m.id=$1", [materialId]);
  expect(dato).toEqual({ carpeta_id: carpetaId, curso_id: cursoGemelo });
  await expect(page.locator(`[data-material-id="${materialId}"]`)).toHaveClass(/bg-sec-suave/);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${capturas}/mat-subcarpeta-1440.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${capturas}/mat-subcarpeta-390.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });

  await entrar(page, "lucas.huaman@nuevohorizonte.demo");
  await page.goto(`${base}/documentos?seccion=materiales`);
  await page.getByRole("link", { name: "Matemática · 5.° A" }).last().click();
  await page.getByRole("link", { name: carpetaNombre }).last().click();
  await expect(page.getByText(titulo)).toBeVisible();
  await page.locator(`[data-material-id="${materialId}"]`).getByRole("button").first().click();
  const enlace = page.getByRole("link", { name: new RegExp(titulo) }).first();
  const descarga = await page.request.get(new URL((await enlace.getAttribute("href"))!, base).toString());
  expect(descarga.status()).toBe(200);
  await page.screenshot({ path: `${capturas}/mat-alumno-390.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await entrar(page, "sofia.quispe@nuevohorizonte.demo");
  await page.goto(`${base}/documentos?seccion=materiales`);
  await expect(page.getByText(titulo)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Matemática · 5.° A" })).toHaveCount(0);

  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(`${base}/tareas`);
  await page.getByRole("button", { name: "Nueva tarea" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("combobox", { name: /^Curso/ }).selectOption({ label: "Matemática · 3.° B" });
  await dialogo.getByText("Elegir de mis materiales").click();
  await dialogo.getByRole("checkbox", { name: new RegExp(titulo) }).check();
  await dialogo.getByLabel("Título", { exact: true }).fill(tarea);
  await dialogo.getByRole("button", { name: "Crear tarea" }).click();
  await expect(page.getByText("Tarea creada.")).toBeVisible();
  const [referencia] = await sql<{ n: string }>("select count(*)::text n from tarea_materiales tm join tareas t on t.id=tm.tarea_id where t.titulo=$1 and tm.material_id=$2", [tarea, materialId]);
  expect(referencia.n).toBe("1");
});

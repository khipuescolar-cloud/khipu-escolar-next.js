import "dotenv/config";
import { test, expect, type Browser } from "@playwright/test";
import { Client } from "pg";
import { unlink } from "node:fs/promises";
import path from "node:path";
const port = process.env.E2E_PORT ?? "3000";
const colegio = `http://nuevohorizonte.lvh.me:${port}`;
const titulo = `Programación W3 ${Date.now()}`;
async function entrar(browser: Browser, correo: string) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${colegio}/login`);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${colegio}/inicio`);
  await page.goto(`${colegio}/documentos?seccion=gestion`);
  return page;
}
test.afterAll(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
  try {
    await db.query("ALTER TABLE solicitud_eventos DISABLE TRIGGER USER");
    await db.query("ALTER TABLE solicitud_version_archivos DISABLE TRIGGER USER");
    await db.query("ALTER TABLE solicitud_versiones DISABLE TRIGGER USER");
    const s = await db.query<{ id: string }>("SELECT id FROM solicitudes_documentales WHERE titulo = $1", [titulo]);
    if (s.rows[0]) {
      const id = s.rows[0].id;
      const archivos = await db.query<{ id: string; public_id: string; proveedor: string }>("SELECT a.id, a.public_id, a.proveedor FROM archivos a JOIN solicitud_version_archivos va ON va.archivo_id=a.id JOIN solicitud_versiones v ON v.id=va.version_id JOIN solicitud_destinatarios d ON d.id=v.destinatario_id WHERE d.solicitud_id=$1", [id]);
      await db.query("DELETE FROM solicitud_eventos WHERE solicitud_id=$1", [id]);
      await db.query("DELETE FROM solicitud_version_archivos WHERE version_id IN (SELECT v.id FROM solicitud_versiones v JOIN solicitud_destinatarios d ON d.id=v.destinatario_id WHERE d.solicitud_id=$1)", [id]);
      await db.query("DELETE FROM solicitud_versiones WHERE destinatario_id IN (SELECT id FROM solicitud_destinatarios WHERE solicitud_id=$1)", [id]);
      await db.query("DELETE FROM solicitud_destinatarios WHERE solicitud_id=$1", [id]);
      await db.query("DELETE FROM solicitudes_documentales WHERE id=$1", [id]);
      for (const a of archivos.rows) { await db.query("DELETE FROM archivos WHERE id=$1", [a.id]); if (a.proveedor === "local") await unlink(path.resolve(process.cwd(), ".uploads", a.public_id)).catch(() => {}); }
    }
  } finally { await db.query("ALTER TABLE solicitud_versiones ENABLE TRIGGER USER"); await db.query("ALTER TABLE solicitud_version_archivos ENABLE TRIGGER USER"); await db.query("ALTER TABLE solicitud_eventos ENABLE TRIGGER USER"); await db.end(); }
});
test("11–16 dirección solicita, docente corrige y dirección aprueba", async ({ browser }) => {
  const dir = await entrar(browser, "direccion@nuevohorizonte.demo");
  await dir.getByRole("form", { name: "Nueva solicitud documental" }).getByLabel("Título").fill(titulo);
  await dir.getByRole("form", { name: "Nueva solicitud documental" }).getByRole("combobox", { name: "Profesor" }).click();
  await dir.getByRole("option", { name: /Lucía García/ }).click();
  await dir.getByRole("button", { name: "Crear y publicar" }).click();
  await expect(dir.getByText("Solicitud publicada.")).toBeVisible();
  await expect(dir.getByRole("heading", { name: titulo })).toBeVisible();
  const lucia = await entrar(browser, "lucia.garcia@nuevohorizonte.demo");
  const articulo = lucia.getByRole("article").filter({ has: lucia.getByRole("heading", { name: titulo }) });
  await articulo.getByLabel("Archivo").setInputFiles({ name: "programacion-v1.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%v1\n") });
  await articulo.getByRole("button", { name: "Presentar versión" }).click();
  await expect(lucia.getByText("Versión presentada.")).toBeVisible();
  await dir.reload();
  const ad = dir.getByRole("article").filter({ has: dir.getByRole("heading", { name: titulo }) });
  await ad.getByRole("button", { name: "Comenzar revisión" }).click();
  await expect(dir.getByText("Revisión iniciada.")).toBeVisible();
  await ad.getByLabel("Observaciones").fill("Corrige el cronograma");
  await ad.getByRole("button", { name: "Registrar observaciones" }).click();
  await expect(dir.getByText("Observaciones registradas.")).toBeVisible();
  await lucia.reload();
  await articulo.getByLabel("Archivo").setInputFiles({ name: "programacion-v2.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%v2\n") });
  await articulo.getByRole("button", { name: "Presentar versión" }).click();
  await expect(articulo.getByText("Versión 2 · presentada", { exact: false })).toBeVisible({ timeout: 15000 });
  await dir.reload();
  await ad.getByRole("button", { name: "Aprobar" }).click();
  await expect(dir.getByText("Versión aprobada.")).toBeVisible();
  await expect(ad.getByText("Versión 1 · observada")).toBeVisible();
  await expect(ad.getByText("Versión 2 · aprobada")).toBeVisible();
  const csv = await dir.request.get(`${colegio}/api/documentos/solicitudes/reporte?agrupar=docente`);
  expect(csv.status()).toBe(200); expect(await csv.text()).toContain("Lucía");
  await dir.screenshot({ path: "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad/w3-r2-desktop.png", fullPage: true });
  await dir.setViewportSize({ width: 390, height: 844 });
  await dir.screenshot({ path: "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad/w3-r2-mobile.png", fullPage: true });
});

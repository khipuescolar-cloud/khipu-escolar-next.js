import "dotenv/config";
import { createHmac, randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { sql } from "./ayudantes/colegio-temporal";
const puerto = process.env.E2E_PORT ?? "3061";
const colegio = `http://nuevohorizonte.lvh.me:${puerto}`;
const capturas = "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad";
test("PUT directo local informa progreso y respeta sesión", async ({ page }) => {
  const [actor] = await sql<{ tenant_id: string; id: string }>("select m.tenant_id, m.id from memberships m join profiles p on p.id=m.user_id where p.email='direccion@nuevohorizonte.demo' limit 1");
  expect(actor).toBeTruthy();
  const bytes = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
  const publicId = `${actor.tenant_id}/documento/${randomUUID()}.pdf`;
  const exp = Date.now() + 600_000;
  const payload = Buffer.from(JSON.stringify({ publicId, bytes: bytes.length, mimeType: "application/pdf", exp })).toString("base64url");
  const firma = createHmac("sha256", process.env.APP_SECRET ?? "").update(payload).digest("base64url");
  const [subida] = await sql<{ id: string }>("insert into subidas_archivo (id,tenant_id,membership_id,categoria,nombre,mime_declarado,bytes_declarados,proveedor,public_id,reserva_bytes,expira_at) values (gen_random_uuid(),$1,$2,'documento','e2e.pdf','application/pdf',$3,'local',$4,0,to_timestamp($5/1000.0)) returning id", [actor.tenant_id, actor.id, bytes.length, publicId, exp]);
  try {
    await page.goto("/login"); await page.getByLabel("Correo").fill("direccion@nuevohorizonte.demo"); await page.getByLabel("Contraseña").fill("demo123"); await page.getByRole("button", { name: "Entrar" }).click(); await page.waitForURL(`${colegio}/inicio`);
    const r = await page.evaluate(async ({ url, contenido }) => new Promise<{ estado: number; progreso: number }>((resolve) => { const xhr = new XMLHttpRequest(); let progreso = 0; xhr.open("PUT", url); xhr.setRequestHeader("Content-Type", "application/pdf"); xhr.upload.onprogress = e => { if (e.lengthComputable) progreso = Math.round(e.loaded * 100 / e.total); }; xhr.onload = () => resolve({ estado: xhr.status, progreso }); xhr.onerror = () => resolve({ estado: 0, progreso }); xhr.send(new Blob([new Uint8Array(contenido)], { type: "application/pdf" })); }), { url: `${colegio}/api/almacenamiento/local/${payload}.${firma}`, contenido: [...bytes] });
    expect(r.estado).toBe(204); expect(r.progreso).toBe(100);
    await page.goto(`${colegio}/configuracion/almacenamiento`);
    await expect(page.getByText("Uso del colegio")).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 }); await page.screenshot({ path: `${capturas}/w1-r2-desktop.png` });
    await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: `${capturas}/w1-r2-mobile.png` });
  } finally { await sql("delete from subidas_archivo where id=$1", [subida.id]); await rm(path.join(process.cwd(), ".uploads", publicId), { force: true }); }
});

import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";
import { sql } from "./ayudantes/colegio-temporal";

const puerto = process.env.E2E_PORT ?? "3000";
const colegio = (ruta: string) => `http://nuevohorizonte.lvh.me:${puerto}${ruta}`;
const carpeta = "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad";
let periodoId = "";
let salonId = "";
let cursoCiencia = "";
let cursoMatematica = "";

async function entrar(page: Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("/inicio"));
}

test.beforeAll(async () => {
  const [t] = await sql<{ id: string }>(`select id from tenants where slug='nuevohorizonte'`);
  // Periodo ya terminado (2025) para no alterar el periodo en curso de los demás e2e.
  const [p] = await sql<{ id: string }>(
    `insert into periodos (id, tenant_id, anio, tipo, numero, nombre, inicio, fin, cerrado, niveles) values (gen_random_uuid(), $1, 2025, 'bimestre', 1, 'E2E periodo terminado', '2025-03-03', '2025-05-02', false, '{primaria}') returning id`,
    [t.id],
  );
  periodoId = p.id;
  const [c] = await sql<{ id: string; salon_id: string }>(`select cu.id, cu.salon_id from cursos cu join salones s on s.id=cu.salon_id where cu.nombre='Ciencia y Tecnología' and s.nombre='3.° B' limit 1`);
  cursoCiencia = c.id;
  salonId = c.salon_id;
  const [m] = await sql<{ id: string }>(`select id from cursos where nombre='Matemática' and salon_id=$1`, [salonId]);
  cursoMatematica = m.id;
});
test.afterAll(async () => {
  if (!periodoId) return;
  await sql(`delete from cierres_curso where periodo_id=$1`, [periodoId]);
  await sql(`delete from calificaciones_periodo where periodo_id=$1`, [periodoId]);
  await sql(`delete from periodos where id=$1`, [periodoId]);
});

test("botón deshabilitado antes de que termine el periodo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  await page.goto(colegio(`/notas/${cursoCiencia}`));
  const boton = page.getByRole("button", { name: /Calificación del periodo · disponible desde el 18\/12/ });
  await expect(boton).toBeVisible();
  await expect(boton).toBeDisabled();
  await page.screenshot({ path: `${carpeta}/periodo-boton-deshabilitado-1440.png` });
});

test("el profesor califica y envía; el tutor lo ve en el reporte", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  await page.goto(colegio(`/notas/${cursoCiencia}?periodo=${periodoId}`));
  const enlace = page.getByRole("link", { name: /Calificación del periodo.*Pendiente/ });
  await expect(enlace).toBeVisible();
  await enlace.click();
  await expect(page.getByRole("heading", { name: /Calificación del periodo · Ciencia y Tecnología/ })).toBeVisible();
  const selectores = page.locator("[data-celda]");
  const filas = await page.locator('[data-celda][data-col="0"]').count();
  const columnas = await page.locator('[data-celda][data-row="0"]').count();
  expect(filas * columnas).toBeGreaterThan(0);

  // Con teclado: la primera celda en B abre la conclusión; el resto en A (A, flecha).
  await selectores.first().focus();
  await page.keyboard.press("b");
  const conclusion = page.getByRole("textbox", { name: /Conclusión descriptiva de/ });
  await expect(conclusion).toBeVisible();
  await conclusion.fill("Debe reforzar la indagación con experimentos sencillos.");
  await page.getByRole("button", { name: "Listo" }).click();

  // Intento de enviar con casi todo pendiente: lista qué falta.
  await page.getByRole("button", { name: "Enviar calificación del periodo" }).click();
  await expect(page.getByRole("heading", { name: /Falta completar antes de enviar/ })).toBeVisible();
  await page.screenshot({ path: `${carpeta}/periodo-faltantes-1440.png`, fullPage: true });

  for (let f = 0; f < filas; f++) {
    for (let c = 0; c < columnas; c++) {
      if (f === 0 && c === 0) continue;
      await page.locator(`[data-celda][data-row="${f}"][data-col="${c}"]`).focus();
      await page.keyboard.press("a");
    }
  }
  await page.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(page.getByText("Borrador guardado.")).toBeVisible();
  await page.screenshot({ path: `${carpeta}/periodo-tabla-1440.png`, fullPage: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: `${carpeta}/periodo-tabla-1024.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("region", { name: "Calificación del periodo por competencia" }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${carpeta}/periodo-tabla-390.png` });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByRole("button", { name: "Enviar calificación del periodo" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Enviar" }).click();
  await expect(page.getByText("Calificación enviada", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar calificación del periodo" })).toHaveCount(0);
  expect(await sql(`select 1 from cierres_curso where curso_id=$1 and periodo_id=$2`, [cursoCiencia, periodoId])).toHaveLength(1);
  await page.goto(colegio(`/notas/${cursoCiencia}?periodo=${periodoId}`));
  await expect(page.getByRole("link", { name: "Calificación enviada · ver" })).toBeVisible();

  // Tutora del salón (Lucía): ve Ciencia enviada y Matemática pendiente.
  await page.context().clearCookies();
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  await page.goto(colegio("/notas"));
  await page.getByRole("link", { name: /Reporte del periodo · 3\.° B/ }).click();
  await page.goto(colegio(`/notas/salon/${salonId}/periodo?periodo=${periodoId}`));
  await expect(page.getByRole("heading", { name: /Reporte del periodo · 3\.° B/ })).toBeVisible();
  await expect(page.getByText(/Enviado por Pedro/).first()).toBeVisible();
  await expect(page.getByText(/^Pendiente/).first()).toBeVisible();
  await page.screenshot({ path: `${carpeta}/periodo-reporte-tutor-1440.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("region", { name: /Calificaciones del periodo por curso/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${carpeta}/periodo-reporte-tutor-390.png` });
  expect(cursoMatematica).not.toBe("");

  // Pedro no es tutor: 403 en el reporte.
  await page.context().clearCookies();
  await entrar(page, "pedro.salas@nuevohorizonte.demo");
  const r = await page.goto(colegio(`/notas/salon/${salonId}/periodo?periodo=${periodoId}`));
  await esperarSinAcceso(page, r);
  await expect(page.getByText("Enviado por Pedro")).toHaveCount(0);
});

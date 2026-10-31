import "dotenv/config";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";
import { Client } from "pg";
import { crearColegioTemporal, type ColegioTemporal } from "./ayudantes/colegio-temporal";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (slug: string, ruta: string) => `http://${slug}.lvh.me:${PUERTO}${ruta}`;

// El seed solo trae Nuevo Horizonte (Pro, literal): la academia vigesimal (profesor «Jorge Ramos», «Simulacro 1») y el
// colegio Khipu Base se crean para este archivo y se borran al terminar.
let academia: ColegioTemporal;
let base: ColegioTemporal;
test.beforeAll(async () => {
  academia = await crearColegioTemporal({ plan: "pro", vigesimal: true, prefijo: "e2e-vigesimal" });
  base = await crearColegioTemporal({ plan: "base", prefijo: "e2e-base" });
});
test.afterAll(async () => {
  await academia?.limpiar();
  await base?.limpiar();
});

async function entrar(page: Page, correo: string, slug: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio(slug, "/inicio"));
}

test("profesor de la academia (vigesimal) registra una nota de 0 a 20", async ({ page }) => {
  await entrar(page, academia.correos.profesor, academia.slug);
  await page.goto(colegio(academia.slug, "/notas"));
  await expect(page.getByRole("heading", { name: "Notas" })).toBeVisible();
  const celda = page.getByLabel("Nota de Franco en Simulacro 1");
  await celda.fill("13");
  await celda.blur();
  await expect(page.getByText("Guardado").first()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nota de Franco en Simulacro 1")).toHaveValue("13");
  // Una nota fuera de rango se rechaza con un mensaje claro.
  await page.getByLabel("Nota de Franco en Simulacro 1").fill("25");
  await page.getByLabel("Nota de Franco en Simulacro 1").blur();
  await expect(page.getByText("Escribe una nota entre 0 y 20.")).toBeVisible();
  // Restaura el valor original (9).
  await page.getByLabel("Nota de Franco en Simulacro 1").fill("9");
  await page.getByLabel("Nota de Franco en Simulacro 1").blur();
  await expect(page.getByText("Guardado").first()).toBeVisible();
});

test("apoderada descarga la libreta en PDF de su hijo", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/libreta"));
  await expect(page.getByRole("heading", { name: "Libreta" })).toBeVisible();
  // Rosa tiene dos hijos: elige a Mateo.
  await page.getByRole("combobox", { name: "Alumno" }).selectOption({ label: "Quispe Huamán, Mateo · 3.° B" });
  await page.getByRole("button", { name: "Ver", exact: true }).click();
  await page.waitForURL(/\/libreta\?alumno=/);
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar PDF" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^libreta-quispe-huaman-mateo.*\.pdf$/);
  const ruta = await archivo.path();
  const { readFileSync } = await import("node:fs");
  expect(readFileSync(ruta).subarray(0, 5).toString()).toBe("%PDF-");
});

test("apoderada ve las notas de su hijo sin comparaciones", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/notas"));
  await expect(page.getByRole("heading", { name: "Matemática" })).toBeVisible();
  await expect(page.getByText(/promedio del salón|ranking|puesto/i)).toHaveCount(0);
});

test("dirección de Khipu Base recibe 403 en /notas", async ({ page }) => {
  await entrar(page, base.correos.direccion, base.slug);
  await esperarSinAcceso(page, await page.goto(colegio(base.slug, "/notas")));
});

async function sql<T = Record<string, unknown>>(consulta: string, params: unknown[] = []): Promise<T[]> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    return (await cliente.query(consulta, params)).rows as T[];
  } finally {
    await cliente.end();
  }
}

async function paginaNueva(browser: Browser, correo: string, slug: string) {
  const page = await browser.newPage({ baseURL: `http://lvh.me:${PUERTO}` });
  await entrar(page, correo, slug);
  return page;
}

test("profesor agrega una observación a una nota y la quita", async ({ page }) => {
  await entrar(page, academia.correos.profesor, academia.slug);
  await page.goto(colegio(academia.slug, "/notas"));
  await page.getByRole("button", { name: /Agregar observación de Franco Herrera Poma en Simulacro 1/ }).click();
  await page.getByRole("textbox", { name: "Observación" }).fill("Mejoró mucho en el procedimiento.");
  await page.getByRole("button", { name: "Guardar observación" }).click();
  await expect(page.getByText("Observación guardada.")).toBeVisible();
  await page.reload();
  const boton = page.getByRole("button", { name: /Editar observación de Franco Herrera Poma en Simulacro 1/ });
  await expect(boton).toBeVisible();
  await boton.click();
  await expect(page.getByRole("textbox", { name: "Observación" })).toHaveValue("Mejoró mucho en el procedimiento.");
  await page.getByRole("textbox", { name: "Observación" }).fill("");
  await page.getByRole("button", { name: "Guardar observación" }).click();
  await expect(page.getByText("Observación borrada.")).toBeVisible();
});

test("el profesor cierra las notas de su curso y dirección las reabre", async ({ page, browser }) => {
  const limpiar = () => sql(`delete from cierres_curso where tenant_id = $1`, [academia.tenantId]);
  await limpiar();
  try {
    await entrar(page, academia.correos.profesor, academia.slug);
    await page.goto(colegio(academia.slug, "/notas"));
    const main = page.getByRole("main");
    await expect(main.getByText("Abierto", { exact: true })).toBeVisible();
    await main.getByRole("button", { name: "Cerrar notas del curso" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cerrar notas del curso" }).click();
    await expect(main.getByText("Notas del curso cerradas.")).toBeVisible();
    await expect(main.getByText("Cerrado", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Nota de Franco en Simulacro 1")).toHaveCount(0);
    await expect(main.getByRole("button", { name: "Reabrir notas del curso" })).toHaveCount(0);

    const dir = await paginaNueva(browser, academia.correos.direccion, academia.slug);
    await dir.goto(colegio(academia.slug, "/notas"));
    await dir.getByRole("main").getByRole("button", { name: "Reabrir notas del curso" }).click();
    await dir.getByRole("alertdialog").getByRole("button", { name: "Reabrir notas del curso" }).click();
    await expect(dir.getByRole("main").getByText("Abierto", { exact: true })).toBeVisible();
    await dir.close();

    await page.reload();
    await expect(page.getByLabel("Nota de Franco en Simulacro 1")).toBeVisible();
  } finally {
    await limpiar();
  }
});

test("exporta la rejilla en CSV con BOM y separador «;»", async ({ page }) => {
  await entrar(page, academia.correos.profesor, academia.slug);
  await page.goto(colegio(academia.slug, "/notas?seccion=excel"));
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Descargar CSV" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^notas-algebra.*\.csv$/);
  const { readFileSync } = await import("node:fs");
  const texto = readFileSync((await archivo.path())!, "utf8");
  expect(texto.startsWith("\uFEFFCódigo;Alumno;Simulacro 1")).toBe(true);
  expect(texto).toContain("Herrera Poma, Franco");
});

test("dirección publica la libreta, avisa a las familias y puede reenviar el aviso", async ({ page }) => {
  const periodo = async () =>
    (await sql<{ id: string }>(`select p.id from periodos p join tenants t on t.id = p.tenant_id where t.slug = 'nuevohorizonte' and p.numero = 3`))[0].id;
  const limpiar = async () => {
    await sql(`delete from avisos where plantilla = 'libreta_publicada' and referencia_id = $1`, [await periodo()]);
    await sql(`update periodos set libreta_publicada_at = null where id = $1`, [await periodo()]);
  };
  await limpiar();
  try {
    await entrar(page, "direccion@nuevohorizonte.demo", "nuevohorizonte");
    await page.goto(colegio("nuevohorizonte", "/notas/periodos"));
    const main = page.getByRole("main");
    await expect(main.getByText("Para publicar la libreta, cierra el periodo o las notas de todos los cursos.")).toBeVisible(); // IV Bimestre abierto
    const fila = main.locator("li", { hasText: "III Bimestre" });
    await fila.getByRole("button", { name: "Publicar libreta y avisar a las familias" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Publicar y avisar" }).click();
    await expect(fila.getByText(/Libreta publicada el/)).toBeVisible();
    const avisos = await sql(`select 1 from avisos where plantilla = 'libreta_publicada' and referencia_id = $1`, [await periodo()]);
    expect(avisos.length).toBeGreaterThan(0);
    // Ya publicada: ahora solo se ofrece reenviar el aviso.
    await expect(fila.getByRole("button", { name: "Publicar libreta y avisar a las familias" })).toHaveCount(0);
    await fila.getByRole("button", { name: "Reenviar aviso" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Reenviar aviso" }).click();
    await expect.poll(async () => (await sql(`select 1 from avisos where plantilla = 'libreta_publicada' and referencia_id = $1`, [await periodo()])).length).toBe(avisos.length * 2);
  } finally {
    await limpiar();
  }
});

import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";
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

test("profesor de la academia (vigesimal) corrige una nota de 0 a 20 en el registro", async ({ page }) => {
  await entrar(page, academia.correos.profesor, academia.slug);
  await page.goto(colegio(academia.slug, `/notas/${academia.cursoId}`));
  await expect(page.getByRole("heading", { name: /Álgebra/ })).toBeVisible();
  // «Simulacro 1» ya está publicado: cada cambio pide el motivo (specs/37).
  const corregir = async (valor: string) => {
    await page.getByRole("button", { name: /^Franco, Simulacro 1: / }).click();
    await page.getByRole("combobox", { name: "Nota de Franco en Simulacro 1" }).click();
    await page.getByRole("option", { name: valor, exact: true }).click();
    const dialogo = page.getByRole("dialog", { name: "Corregir nota" });
    await dialogo.getByLabel("Motivo de la corrección").fill("Corrección de prueba");
    await dialogo.getByRole("button", { name: "Guardar corrección" }).click();
    await expect(dialogo).toBeHidden();
  };
  await corregir("13");
  await page.reload();
  await expect(page.getByRole("button", { name: "Franco, Simulacro 1: 13" })).toBeVisible();
  // La escala vigesimal solo ofrece de 0 a 20: no hay forma de elegir 25.
  await page.getByRole("button", { name: "Franco, Simulacro 1: 13" }).click();
  await page.getByRole("combobox", { name: "Nota de Franco en Simulacro 1" }).click();
  await expect(page.getByRole("option", { name: "25", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  // Restaura el valor original (9).
  await corregir("9");
  await page.reload();
  await expect(page.getByRole("button", { name: "Franco, Simulacro 1: 9" })).toBeVisible();
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


test("profesor agrega una observación a una nota y la quita", async ({ page }) => {
  await entrar(page, academia.correos.profesor, academia.slug);
  await page.goto(colegio(academia.slug, `/notas/${academia.cursoId}`));
  await page.getByRole("button", { name: /^Franco, Simulacro 1: / }).click();
  await page.getByRole("button", { name: /Agregar observación de Franco en Simulacro 1/ }).click();
  const dialogo = page.getByRole("dialog", { name: "Observación" });
  await dialogo.getByRole("textbox").fill("Mejoró mucho en el procedimiento.");
  await dialogo.getByRole("button", { name: "Guardar observación" }).click();
  await expect(page.getByText("Observación guardada.")).toBeVisible();
  await page.reload();
  const indicador = page.getByRole("button", { name: /Observación de Franco en Simulacro 1 \(privada\)/ });
  await expect(indicador).toBeVisible();
  await indicador.click();
  await expect(page.getByRole("dialog", { name: "Observación" }).getByRole("textbox")).toHaveValue("Mejoró mucho en el procedimiento.");
  await page.getByRole("dialog", { name: "Observación" }).getByRole("textbox").fill("");
  await page.getByRole("button", { name: "Guardar observación" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /Observación de Franco en Simulacro 1/ })).toHaveCount(0);
});

test("el estado del curso se muestra en solo lectura y el curso cerrado no se edita", async ({ page }) => {
  const limpiar = () => sql(`delete from cierres_curso where tenant_id = $1`, [academia.tenantId]);
  await limpiar();
  try {
    await entrar(page, academia.correos.profesor, academia.slug);
    await page.goto(colegio(academia.slug, `/notas/${academia.cursoId}`));
    const estado = page.getByTestId("estado-cierre");
    await expect(estado.getByText("Abierto", { exact: true })).toBeVisible();
    await expect(estado.getByRole("button")).toHaveCount(0);
    // El cierre lo produce el envío de la calificación del periodo (rama notas-periodo); aquí se simula en la BD.
    await sql(`insert into cierres_curso (id, tenant_id, periodo_id, curso_id, cerrado_por) select gen_random_uuid(), $1, p.id, $2, c.profesor_id from periodos p, cursos c where p.tenant_id = $1 and p.numero = 4 and c.id = $2`, [academia.tenantId, academia.cursoId]);
    await page.reload();
    await expect(estado.getByText("Enviado / Cerrado", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Franco, Simulacro 1: / })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Nueva calificación" })).toHaveCount(0);
  } finally {
    await limpiar();
  }
});

test("exporta el registro en CSV con BOM y separador «;»", async ({ page }) => {
  await entrar(page, academia.correos.profesor, academia.slug);
  await page.goto(colegio(academia.slug, `/notas/${academia.cursoId}`));
  await page.getByRole("button", { name: "Importar / Exportar" }).click();
  const descarga = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar registro (CSV)" }).click();
  const archivo = await descarga;
  expect(archivo.suggestedFilename()).toMatch(/^registro-algebra.*\.csv$/);
  const { readFileSync } = await import("node:fs");
  const texto = readFileSync((await archivo.path())!, "utf8");
  expect(texto.startsWith("\uFEFF;Resuelve problemas algebraicos;")).toBe(true);
  expect(texto).toContain("Alumno;Simulacro 1 (2026-10-19);Observación");
  expect(texto).toContain("Herrera Poma, Franco;9;");
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

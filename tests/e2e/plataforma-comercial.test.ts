import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { expect, test } from "@playwright/test";

// Responsables y suscripción (specs/20): desde la ficha de un colegio de prueba el super administrador agrega un
// responsable con acceso, lo marca como principal, crea la suscripción, registra y anula un pago; después ve el
// colegio en /suscripciones. Crea su propio colegio `test-com-*` y lo borra al terminar.

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `lvh.me:${PUERTO}`;
const sufijo = randomUUID().slice(0, 8);
const SLUG = `test-com-${sufijo}`;
const NOMBRE = `Colegio Comercial ${sufijo}`;
const EMAIL = `dir-${sufijo}@test-com.demo`;
const EMAIL2 = `resp-${sufijo}@test-com.demo`;
const dni = () => String(10_000_000 + Math.floor(Math.random() * 89_999_999));
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test.afterAll(async () => {
  try {
    execFileSync("pnpm", ["-s", "khipu:borrar-colegio", SLUG, "--confirmar", SLUG], { stdio: "ignore" });
  } catch {
    // Si falló antes de crearlo, no hay nada que borrar.
  }
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  for (const email of [EMAIL, EMAIL2]) {
    const { rows } = await cliente.query<{ id: string }>("select id::text from auth.users where email = $1", [email]);
    for (const { id } of rows) await supabase.auth.admin.deleteUser(id);
    await cliente.query("delete from profiles where email = $1", [email]);
  }
  await cliente.query("delete from auditoria_plataforma where tenant_id is null and detalle->>'slug' = $1", [SLUG]);
  await cliente.end();
});

test("responsables y suscripción desde la ficha, y resumen en /suscripciones", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("admin@khipuescolar.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`http://admin.${BASE}/`);

  // Colegio nuevo con un segundo responsable (facturación, sin acceso).
  await page.goto(`http://admin.${BASE}/colegios/nuevo`);
  await page.getByLabel("Insignia o escudo").setInputFiles({ name: "i.png", mimeType: "image/png", buffer: PNG });
  await page.getByLabel("Nombre del colegio").fill(NOMBRE);
  await page.getByLabel("Dirección (subdominio)").fill(SLUG);
  await page.locator('[name="admin_email"]').fill(EMAIL);
  await page.locator('[name="admin_cargo"]').fill("Directora");
  await page.locator('[name="admin_nombres"]').fill("Dora");
  await page.locator('[name="admin_apellidos"]').fill("Prueba");
  await page.locator('[name="admin_numeroDocumento"]').fill(dni());
  await page.locator('[name="resp2_nombres"]').fill("Fabiola");
  await page.locator('[name="resp2_apellidos"]').fill("Cuentas");
  await page.locator('[name="resp2_email"]').fill(`conta-${sufijo}@test-com.demo`);
  await page.getByRole("button", { name: "Crear colegio" }).click();
  await page.waitForURL(/\/colegios\/[0-9a-f-]{36}\?ok=/);

  const responsables = page.getByTestId("responsable");
  await expect(page.getByRole("heading", { name: "Responsables" })).toBeVisible();
  await expect(responsables).toHaveCount(2);
  await expect(responsables.first()).toContainText("Principal");
  await expect(responsables.first()).toContainText("Con acceso al sistema");
  await expect(responsables.nth(1)).toContainText("Facturación");
  await expect(responsables.nth(1)).toContainText("Sin acceso al sistema");

  // Agregar un responsable con acceso.
  await page.getByRole("button", { name: "Agregar responsable" }).click();
  const hoja = page.getByRole("dialog");
  await hoja.getByLabel("Nombres").fill("Raúl");
  await hoja.getByLabel("Apellidos").fill("Soporte");
  await hoja.locator('[name="email"]').fill(EMAIL2);
  await hoja.getByLabel("Cargo").fill("Coordinador");
  await hoja.getByLabel("Darle acceso al sistema como dirección").check();
  await hoja.locator('[name="numeroDocumento"]').fill(dni());
  await hoja.getByRole("button", { name: "Agregar responsable" }).click();
  await expect(responsables).toHaveCount(3);
  await expect(responsables.filter({ hasText: "Raúl Soporte" })).toContainText("Con acceso al sistema");

  // Marcar como principal a Raúl: la marca se mueve.
  await responsables.filter({ hasText: "Raúl Soporte" }).getByRole("button", { name: "Marcar como principal" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Marcar como principal" }).click();
  await expect(responsables.first()).toContainText("Raúl Soporte");
  await expect(page.getByText("Principal", { exact: true })).toHaveCount(1);

  // Quitar a la directora (ya no es principal): sin pedir reemplazo.
  await responsables.filter({ hasText: "Dora Prueba" }).getByRole("button", { name: "Quitar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Quitar responsable" }).click();
  await expect(responsables).toHaveCount(2);

  // Suscripción: crear, registrar un pago y anularlo.
  await page.getByRole("button", { name: "Crear suscripción" }).click();
  const hojaSus = page.getByRole("dialog");
  await hojaSus.getByLabel("Monto por ciclo (S/)").fill("250");
  await hojaSus.getByLabel("Estado").selectOption("activa");
  await hojaSus.getByLabel("Alumnos contratados").fill("1");
  await hojaSus.getByRole("button", { name: "Guardar suscripción" }).click();
  await expect(page.getByText("Plan Básico", { exact: true })).toBeVisible();
  await expect(page.getByText("S/ 250.00")).toBeVisible();

  await page.getByRole("button", { name: "Registrar pago" }).click();
  const dlgPago = page.getByRole("dialog");
  await dlgPago.getByLabel("N.º de comprobante").fill("B001-77");
  await dlgPago.getByRole("button", { name: "Registrar pago" }).click();
  const pagos = page.getByTestId("pago");
  await expect(pagos).toHaveCount(1);
  await expect(pagos.first()).toContainText("B001-77");

  await pagos.first().getByRole("button", { name: "Anular" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Anular pago" }).click();
  await expect(pagos).toHaveCount(0);

  // Módulo /suscripciones: el colegio aparece con su estado y renovación.
  await page.goto(`http://admin.${BASE}/suscripciones?estado=activa`);
  await expect(page.getByRole("heading", { name: "Suscripciones" })).toBeVisible();
  const fila = page.getByRole("row", { name: new RegExp(NOMBRE) });
  await expect(fila).toContainText("Activa");
  await expect(fila).toContainText(/Vence en \d+ días|Vence hoy|Vencida/);
  const csv = await page.request.get(`http://admin.${BASE}/suscripciones/reporte.csv?estado=activa`);
  expect(csv.ok()).toBe(true);
  expect(await csv.text()).toContain(SLUG);
});

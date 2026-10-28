import "dotenv/config";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import { expect, test } from "@playwright/test";

// Solicitudes de demo (specs/25): lista → detalle → cambiar estado → «Crear colegio con estos datos» prellenado →
// la solicitud queda convertida. Crea una solicitud y un colegio `test-sol-*` propios y los borra al terminar.

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `lvh.me:${PUERTO}`;
const sufijo = randomUUID().slice(0, 8);
const SLUG = `test-sol-${sufijo}`;
const NOMBRE = `Colegio Solicitud ${sufijo}`;
const EMAIL = `marta-${sufijo}@test-sol.demo`;
const dni = () => String(10_000_000 + Math.floor(Math.random() * 89_999_999));
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function conBd<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const cliente = new Client({ connectionString: process.env.DATABASE_URL });
  await cliente.connect();
  try {
    return await fn(cliente);
  } finally {
    await cliente.end();
  }
}

test.beforeAll(async () => {
  await conBd((c) =>
    c.query(
      `insert into solicitudes_demo (id, nombre, cargo, colegio, ciudad, correo, telefono, alumnos, plan_interes, ip_hash, updated_at)
       values (gen_random_uuid(), 'Marta Quispe', 'Directora', $1, 'Cusco', $2, '987654321', 250, 'fase2', 'e2e', now())`,
      [NOMBRE, EMAIL],
    ),
  );
});

test.afterAll(async () => {
  try {
    execFileSync("pnpm", ["-s", "khipu:borrar-colegio", SLUG, "--confirmar", SLUG], { stdio: "ignore" });
  } catch {
    // Si falló antes de crearlo, no hay nada que borrar.
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  await conBd(async (c) => {
    const { rows } = await c.query<{ id: string }>("select id::text from auth.users where email = $1", [EMAIL]);
    for (const { id } of rows) await supabase.auth.admin.deleteUser(id);
    await c.query("delete from profiles where email = $1", [EMAIL]);
    const { rows: sol } = await c.query<{ id: string }>("select id::text from solicitudes_demo where correo = $1", [EMAIL]);
    for (const { id } of sol) await c.query("delete from auditoria_plataforma where detalle->>'solicitudId' = $1", [id]);
    await c.query("delete from solicitudes_demo where correo = $1", [EMAIL]);
    await c.query("delete from auditoria_plataforma where tenant_id is null and detalle->>'slug' = $1", [SLUG]);
  });
});

test("solicitud de demo: lista, estado y crear colegio prellenado", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("admin@khipuescolar.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`http://admin.${BASE}/`);

  // Menú con el módulo y su contador.
  await expect(page.getByRole("link", { name: /Solicitudes de demo/ }).first()).toBeVisible();

  // Lista: buscar por colegio.
  await page.goto(`http://admin.${BASE}/solicitudes?q=${encodeURIComponent(NOMBRE)}`);
  await expect(page.getByRole("heading", { name: "Solicitudes de demo" })).toBeVisible();
  const fila = page.getByTestId("fila-solicitud").first();
  await expect(fila).toContainText(NOMBRE);
  await expect(fila).toContainText("Cusco");
  await expect(fila).toContainText("Nueva");
  await fila.getByRole("link", { name: NOMBRE }).click();
  await page.waitForURL(/\/solicitudes\/[0-9a-f-]{36}$/);

  // Cambiar estado.
  await page.getByLabel("Estado").selectOption("contactada");
  await page.getByRole("button", { name: "Guardar", exact: true }).first().click();
  await expect(page.getByTestId("estado-solicitud")).toContainText("Contactada");

  // Crear colegio con los datos prellenados.
  await page.getByRole("link", { name: "Crear colegio con estos datos" }).click();
  await page.waitForURL(/\/colegios\/nuevo\?/);
  await expect(page.getByLabel("Nombre del colegio")).toHaveValue(NOMBRE);
  await expect(page.locator('[name="ciudad"]')).toHaveValue("Cusco");
  await expect(page.locator('[name="plan"]')).toHaveValue("fase2");
  await expect(page.locator('[name="admin_email"]')).toHaveValue(EMAIL);
  await expect(page.locator('[name="admin_nombres"]')).toHaveValue("Marta Quispe");
  await expect(page.locator('[name="admin_cargo"]')).toHaveValue("Directora");
  await expect(page.locator('[name="admin_telefono"]')).toHaveValue("987654321");

  await page.getByLabel("Insignia o escudo").setInputFiles({ name: "i.png", mimeType: "image/png", buffer: PNG });
  await page.getByLabel("Dirección (subdominio)").fill(SLUG);
  await page.locator('[name="admin_apellidos"]').fill("Quispe");
  await page.locator('[name="admin_numeroDocumento"]').fill(dni());
  await page.getByRole("button", { name: "Crear colegio" }).click();
  await page.waitForURL(/\/colegios\/[0-9a-f-]{36}\?ok=/);

  // La solicitud quedó convertida y enlazada.
  await page.goto(`http://admin.${BASE}/solicitudes?q=${encodeURIComponent(NOMBRE)}&estado=convertida`);
  const convertida = page.getByTestId("fila-solicitud").first();
  await expect(convertida).toContainText("Convertida en colegio");
  await convertida.getByRole("link", { name: NOMBRE }).click();
  await expect(page.getByRole("link", { name: /Ver colegio/ })).toBeVisible();
});

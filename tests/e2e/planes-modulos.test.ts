import "dotenv/config";
import { Client } from "pg";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";

// Planes y módulos (specs/19): el super administrador quita Agenda del plan Familia (fase2) y la dirección de
// Academia Euler (plan Familia) ve el candado «Plan Pro Max» y /agenda sin acceso. Al final se restaura.

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `lvh.me:${PUERTO}`;
const colegio = (slug: string, ruta: string) => `http://${slug}.${BASE}${ruta}`;

async function sql(consulta: string) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query(consulta);
  } finally {
    await c.end();
  }
}

async function entrar(browser: Browser, correo: string, destino: string): Promise<Page> {
  const page = await browser.newPage({ baseURL: `http://${BASE}` });
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(destino);
  return page;
}

test.afterAll(async () => {
  // Respaldo por si la prueba falla a mitad: Agenda vuelve al plan Familia.
  await sql(`insert into plan_modulos (plan, modulo) values ('fase2', 'agenda') on conflict do nothing`);
});

// Cada paso del panel abre su propia sesión: otros e2e que cierran sesión del super administrador demo
// (signOut global de Supabase) invalidan las sesiones abiertas.
const panel = async (browser: Browser, ruta: string) => {
  const p = await entrar(browser, "admin@khipuescolar.demo", `http://admin.${BASE}/`);
  await p.goto(`http://admin.${BASE}${ruta}`);
  return p;
};

test("quitar Agenda del plan Familia pone el candado en un colegio de ese plan", async ({ browser }) => {
  const admin = await panel(browser, "/planes");
  await expect(admin.getByRole("heading", { name: "Planes y módulos" })).toBeVisible();
  await admin.getByRole("button", { name: "Quitar Agenda del plan Familia" }).click();
  await expect(admin.getByRole("alertdialog")).toContainText(/Afecta a \d+ colegios?/);
  await admin.getByRole("button", { name: "Quitar módulo" }).click();
  await expect(admin.getByText(/Módulo quitado del plan/)).toBeVisible();
  await expect(admin.getByRole("button", { name: "Incluir Agenda en el plan Familia" })).toBeVisible();
  await admin.close();

  try {
    const dir = await entrar(browser, "direccion@academiaeuler.demo", colegio("academiaeuler", "/inicio"));
    await expect(dir.getByRole("main").locator("li", { hasText: "Agenda" }).getByText("Plan Pro Max")).toBeVisible();
    await esperarSinAcceso(dir, await dir.goto(colegio("academiaeuler", "/agenda")));
    await dir.close();
  } finally {
    const restaurar = await panel(browser, "/planes");
    await restaurar.getByRole("button", { name: "Incluir Agenda en el plan Familia" }).click();
    await expect(restaurar.getByText(/Módulo incluido en el plan/)).toBeVisible();
    await restaurar.close();
  }

  // Roles y permisos: la matriz muestra las celdas que el código no soporta.
  const roles = await panel(browser, "/roles");
  await expect(roles.getByRole("heading", { name: "Roles y permisos" })).toBeVisible();
  await expect(roles.getByTestId("rol-modulo-mensajes").getByText("No disponible").first()).toBeVisible();
  await roles.close();
});

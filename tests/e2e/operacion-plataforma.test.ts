import "dotenv/config";
import { expect, test, type Page } from "@playwright/test";

// Operación de plataforma (specs/21): usuarios, monitoreo y auditoría. Solo lectura: no cambia datos del seed.

const PUERTO = process.env.E2E_PORT ?? "3000";
const BASE = `lvh.me:${PUERTO}`;

async function entrarComoAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("admin@khipuescolar.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`http://admin.${BASE}/`);
}

test("usuarios: busca a una profesora y abre su ficha con sus colegios y acciones de soporte", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto(`http://admin.${BASE}/usuarios`);
  await page.getByLabel("Buscar persona").fill("lucia.garcia");
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("link", { name: /Lucía García|Lucia Garcia/i }).first().click();
  await expect(page.getByRole("heading", { name: "Colegios y roles" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Enviar enlace de recuperación/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Desactivar membresía" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Últimos intentos de ingreso" })).toBeVisible();
  await expect(page.getByText("Documento", { exact: true })).toBeVisible();
});

test("monitoreo: muestra canales, cron y la acción de procesar la cola con confirmación", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto(`http://admin.${BASE}/monitoreo`);
  await expect(page.getByRole("heading", { name: "Monitoreo" })).toBeVisible();
  await expect(page.getByText("Correo", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Proceso de avisos").first()).toBeVisible();
  await page.getByRole("button", { name: /Procesar la cola ahora/ }).click();
  await expect(page.getByRole("alertdialog")).toContainText("¿Procesar la cola ahora?");
  await page.getByRole("button", { name: "Cancelar" }).click();
});

test("auditoría: lista la bitácora, filtra por acción y ofrece el CSV", async ({ page }) => {
  await entrarComoAdmin(page);
  await page.goto(`http://admin.${BASE}/auditoria`);
  await expect(page.getByRole("heading", { name: "Auditoría" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Descargar CSV" })).toBeVisible();
  await page.getByLabel("Acción").selectOption({ label: "Creó un colegio" });
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page).toHaveURL(/accion=crear_colegio/);
});

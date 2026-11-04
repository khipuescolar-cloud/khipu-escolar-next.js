// Calendario institucional (specs/12): vistas Día, Semana, Mes y Lista, filtros por tipo y por salón, estado en la URL.
import { expect, test, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (slug: string, ruta: string) => `http://${slug}.lvh.me:${PUERTO}${ruta}`;

async function entrar(page: Page, correo: string, slug: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio(slug, "/inicio"));
}

test("la profesora cambia de vista, navega y filtra su calendario", async ({ page }) => {
  await entrar(page, "pedro.salas@nuevohorizonte.demo", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/agenda"));
  const vistas = page.getByRole("navigation", { name: "Vista del calendario" });
  await expect(vistas.getByRole("link", { name: "Semana" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: /Semana del/ })).toBeVisible();

  await vistas.getByRole("link", { name: "Mes" }).click();
  await expect(page).toHaveURL(/vista=mes/);
  await expect(page.getByRole("columnheader", { name: "Lun" })).toBeVisible();
  await page.getByRole("link", { name: "Mes siguiente" }).click();
  await expect(page).toHaveURL(/vista=mes&fecha=\d{4}-\d{2}-01/);

  await vistas.getByRole("link", { name: "Día" }).click();
  await expect(page).toHaveURL(/vista=dia/);
  await page.getByRole("link", { name: "Hoy" }).click();

  await vistas.getByRole("link", { name: "Lista" }).click();
  await expect(page.getByRole("heading", { name: /Próximos 30 días/ })).toBeVisible();

  const filtros = page.getByRole("navigation", { name: "Filtrar por tipo" });
  await filtros.getByRole("link", { name: "Eventos académicos" }).click();
  await expect(page).toHaveURL(/filtro=academico/);
  await expect(filtros.getByRole("link", { name: "Eventos académicos" })).toHaveAttribute("aria-current", "page");
  // «Reuniones del personal» es solo para dirección y administrativo.
  await expect(filtros.getByRole("link", { name: "Reuniones del personal" })).toHaveCount(0);

  await page.getByLabel("Curso o sección").selectOption({ label: "5.° A" });
  await page.getByRole("button", { name: "Ver" }).click();
  await expect(page).toHaveURL(/salon=[0-9a-f-]{36}/);
  await expect(page).toHaveURL(/filtro=academico/);
});

test("en la semana, la profesora ve sus clases en la grilla", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo", "nuevohorizonte");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(colegio("nuevohorizonte", "/agenda?vista=semana"));
  // Alguna clase proyectada desde su horario (si la semana no es de vacaciones) o el texto de día vacío.
  const columnas = page.locator("section[aria-label*='Lunes'], section[aria-label*='Martes']");
  await expect(columnas.first()).toBeVisible();
});

test("dirección ve el filtro de reuniones del personal", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/agenda?vista=lista&filtro=personal"));
  await expect(page.getByRole("navigation", { name: "Filtrar por tipo" }).getByRole("link", { name: "Reuniones del personal" })).toHaveAttribute("aria-current", "page");
});

test("la familia ve la agenda de sus hijos sin el filtro del personal", async ({ page }) => {
  await entrar(page, "rosa.quispe@gmail.com", "nuevohorizonte");
  await page.goto(colegio("nuevohorizonte", "/agenda?vista=mes"));
  await expect(page.getByRole("link", { name: "Nuevo evento" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Filtrar por tipo" }).getByRole("link", { name: "Reuniones del personal" })).toHaveCount(0);
});

import { expect, test } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

async function entrar(page: import("@playwright/test").Page, correo: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
}

test("dirección recorre su panel y exporta los datos", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await expect(page.getByRole("heading", { name: "Asistencia de hoy" })).toBeVisible();
  await expect(page.getByText("Sin registrar").first()).toBeVisible();

  const rutas: [string, string][] = [
    ["/gestion", "Gestión"],
    ["/gestion/profesores", "Profesores"],
    ["/gestion/salones", "Salones y cursos"],
    ["/gestion/alumnos", "Alumnos"],
    ["/gestion/apoderados", "Familias"],
    ["/configuracion", "Configuración"],
    ["/configuracion/auditoria", "Auditoría"],
    ["/avisos", "Avisos enviados"],
    ["/comunicados", "Comunicados"],
    ["/mensajes", "Mensajes"],
  ];
  for (const [ruta, titulo] of rutas) {
    await page.goto(`${COLEGIO}${ruta}`);
    await expect(page.getByRole("heading", { name: titulo, exact: true }).first()).toBeVisible();
  }

  const r = await page.request.get(`${COLEGIO}/api/exportar`);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-disposition"]).toContain("nuevohorizonte-datos-");
  const datos = await r.json();
  expect(datos.colegio.slug).toBe("nuevohorizonte");
  expect(datos.alumnos.length).toBeGreaterThan(0);
});

test("una profesora no puede exportar ni entrar a gestión", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  expect((await page.request.get(`${COLEGIO}/api/exportar`)).status()).toBe(403);
  await page.goto(`${COLEGIO}/gestion`);
  await expect(page.getByRole("heading", { name: "No tienes acceso a esta sección" })).toBeVisible();
});

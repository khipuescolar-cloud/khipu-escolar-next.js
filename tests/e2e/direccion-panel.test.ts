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
    ["/gestion/personal", "Personal"],
    ["/gestion/salones", "Grados y salones"],
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

  // El enlace antiguo lleva a la exportación asíncrona.
  const antiguo = await page.request.get(`${COLEGIO}/api/exportar`, { maxRedirects: 0 });
  expect(antiguo.status()).toBe(307);
  await page.goto(`${COLEGIO}/configuracion/exportar`);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { name: "Exportar datos" })).toBeVisible();
  const preparar = main.getByRole("button", { name: "Preparar exportación" });
  if (await preparar.isEnabled()) {
    await preparar.click();
    await expect(main.getByText("Preparamos tu exportación")).toBeVisible();
  }
  await expect(main.getByRole("table").getByText(/En cola|Preparando|Lista|Con error|Vencida/).first()).toBeVisible();
});

test("una profesora no puede exportar ni entrar a gestión", async ({ page }) => {
  await entrar(page, "lucia.garcia@nuevohorizonte.demo");
  expect((await page.request.get(`${COLEGIO}/api/exportar`, { maxRedirects: 0 })).status()).toBe(403);
  expect((await page.request.get(`${COLEGIO}/api/exportar/00000000-0000-0000-0000-000000000000`)).status()).toBe(403);
  await page.goto(`${COLEGIO}/gestion`);
  await expect(page.getByRole("heading", { name: "No tienes acceso a esta sección" })).toBeVisible();
});

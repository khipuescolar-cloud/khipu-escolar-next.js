import { expect, test } from "@playwright/test";
import { crearColegioTemporal, type ColegioTemporal } from "./ayudantes/colegio-temporal";

// El seed solo trae Nuevo Horizonte (Pro): un segundo colegio Pro donde Rosa también es apoderada y un colegio Khipu Base
// se crean para este archivo y se borran al terminar.
let otroColegio: ColegioTemporal;
let base: ColegioTemporal;
test.beforeAll(async () => {
  otroColegio = await crearColegioTemporal({ plan: "pro", apoderadaExistente: "rosa.quispe@gmail.com", prefijo: "e2e-otro" });
  base = await crearColegioTemporal({ plan: "base", prefijo: "e2e-base" });
});
test.afterAll(async () => {
  await otroColegio?.limpiar();
  await base?.limpiar();
});

test("profesora entra por el dominio de su colegio y llega a su subdominio", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("lucia.garcia@nuevohorizonte.demo");
  await expect(page.getByText("I.E.P. Nuevo Horizonte")).toBeVisible();
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /Entrando a I.E.P. Nuevo Horizonte/ })).toBeVisible();
  await page.waitForURL(`http://nuevohorizonte.lvh.me:${process.env.E2E_PORT ?? "3000"}/inicio`);
  await expect(page.getByRole("heading", { name: "Hola, Lucía" })).toBeVisible();
  // El inicio es el tablero «lo que te toca hoy» (specs/18); pasar lista está en el menú.
  await expect(page.getByRole("main").getByRole("heading", { name: "Lo que te toca hoy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Pasar lista", exact: true })).toBeVisible();
});

test("apoderada con hijos en dos colegios elige a cuál entrar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("rosa.quispe@gmail.com");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/elegir-colegio");
  await expect(page.getByText(otroColegio.nombre)).toBeVisible();
  await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  await page.waitForURL(`http://nuevohorizonte.lvh.me:${process.env.E2E_PORT ?? "3000"}/inicio`);
  await expect(page.getByRole("main").getByRole("heading", { name: "Llegada de hoy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tareas", exact: true })).toBeVisible();
  // Nudito es el tutor de Khipu Pro (specs/44): la familia lo ve como «Nudito» (sin el antiguo «Nudito+» de pago).
  await expect(page.getByRole("main").getByRole("link", { name: /^Nudito\+/ })).toHaveCount(0);
});

test("Khipu Base muestra el candado «Plan Khipu Pro» en las funciones de Pro", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(base.correos.direccion);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`http://${base.slug}.lvh.me:${process.env.E2E_PORT ?? "3000"}/inicio`);
  // Candado en el menú: ícono visible y el plan en el nombre accesible del ítem (specs/18 · Navegación).
  await expect(page.getByRole("button", { name: /plan Khipu Pro/ }).first()).toBeVisible();
});

test("contraseña incorrecta muestra un error claro", async ({ page }) => {
  await page.goto("/login");
  // Correo único por corrida: el límite de intentos no bloquea ejecuciones repetidas.
  await page.getByLabel("Correo").fill(`no-existe-${Date.now()}@nuevohorizonte.demo`);
  await page.getByLabel("Contraseña").fill("incorrecta");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("El correo o la contraseña no coinciden.")).toBeVisible();
});

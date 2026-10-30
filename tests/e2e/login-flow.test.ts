import { expect, test } from "@playwright/test";

test("profesora entra por el dominio de su colegio y llega a su subdominio", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("lucia.garcia@nuevohorizonte.demo");
  await expect(page.getByText("I.E.P. Nuevo Horizonte")).toBeVisible();
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: /Entrando a I.E.P. Nuevo Horizonte/ })).toBeVisible();
  await page.waitForURL(`http://nuevohorizonte.lvh.me:${process.env.E2E_PORT ?? "3000"}/inicio`);
  await expect(page.getByRole("heading", { name: "Hola, Lucía" })).toBeVisible();
  await expect(page.getByRole("main").getByText("Pasar lista")).toBeVisible();
});

test("apoderada con hijos en dos colegios elige a cuál entrar", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("rosa.quispe@gmail.com");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/elegir-colegio");
  await expect(page.getByText("Academia Euler")).toBeVisible();
  await page.getByRole("link", { name: /I.E.P. Nuevo Horizonte/ }).click();
  await page.waitForURL(`http://nuevohorizonte.lvh.me:${process.env.E2E_PORT ?? "3000"}/inicio`);
  await expect(page.getByRole("main").getByText("Tareas", { exact: true })).toBeVisible();
  // El Nudito retirado no aparece; sí el acceso a Nudito+ de la familia (colegio Pro, specs/28).
  await expect(page.getByRole("main").getByText("Nudito", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: /^Nudito\+/ })).toBeVisible();
});

test("Khipu Base muestra el candado «Plan Khipu Pro» en las funciones de Pro", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("direccion@losolivos.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`http://losolivos.lvh.me:${process.env.E2E_PORT ?? "3000"}/inicio`);
  await expect(page.getByText("Plan Khipu Pro").first()).toBeVisible();
});

test("contraseña incorrecta muestra un error claro", async ({ page }) => {
  await page.goto("/login");
  // Correo único por corrida: el límite de intentos no bloquea ejecuciones repetidas.
  await page.getByLabel("Correo").fill(`no-existe-${Date.now()}@losolivos.demo`);
  await page.getByLabel("Contraseña").fill("incorrecta");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("El correo o la contraseña no coinciden.")).toBeVisible();
});

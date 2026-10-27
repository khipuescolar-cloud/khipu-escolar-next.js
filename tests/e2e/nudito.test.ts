import { expect, test, type Page } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";

async function entrarComoRosa(page: Page, colegio: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("rosa.quispe@gmail.com");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/elegir-colegio");
  await page.getByRole("link", { name: colegio }).click();
  await page.waitForURL(`http://*.lvh.me:${PUERTO}/inicio`);
}

test("apoderada pregunta por las tareas y Nudito responde con datos reales", async ({ page }) => {
  await entrarComoRosa(page, /I.E.P. Nuevo Horizonte/);
  await page.getByRole("button", { name: "Abrir Nudito, tu asistente" }).click();
  const panel = page.getByRole("dialog", { name: /Nudito/ });
  await expect(panel).toBeVisible();
  await expect(page.getByLabel("Escribe tu pregunta")).toBeFocused();

  // El widget recarga la última conversación (≤ 12 h): las respuestas pueden repetirse en el historial.
  await page.getByLabel("Escribe tu pregunta").fill("¿qué tareas tiene Mateo?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(panel.getByText("Soy un asistente con IA. Si no sé algo, te paso con una persona del colegio.").first()).toBeVisible();
  await expect(panel.getByText(/Fichas de fracciones/).last()).toBeVisible();

  await page.getByLabel("Escribe tu pregunta").fill("¿Mateo faltó ayer?");
  await page.getByRole("button", { name: "Enviar" }).click();
  await expect(panel.getByText("Para eso es mejor hablar con su tutora.").last()).toBeVisible();
  await expect(panel.getByRole("link", { name: "Hablar con la tutora" }).last()).toHaveAttribute("href", /\/mensajes\?alumno=/);

  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(page.getByRole("button", { name: "Abrir Nudito, tu asistente" })).toBeFocused();

  await page.goto(`http://nuevohorizonte.lvh.me:${PUERTO}/nudito`);
  await expect(page.getByRole("heading", { name: "Nudito", level: 1 })).toBeVisible();
  await expect(page.getByText(/Fichas de fracciones/).first()).toBeVisible();
});

test("el widget no aparece para profesores", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("lucia.garcia@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`http://nuevohorizonte.lvh.me:${PUERTO}/inicio`);
  await expect(page.getByRole("heading", { name: "Hola, Lucía" })).toBeVisible();
  await expect(page.getByTestId("nudito-widget")).toHaveCount(0);
});

test("el widget no aparece en un colegio Fase 2 (Academia Euler)", async ({ page }) => {
  await entrarComoRosa(page, /Academia Euler/);
  await expect(page.getByRole("heading", { name: /Hola, Rosa/ })).toBeVisible();
  await expect(page.getByTestId("nudito-widget")).toHaveCount(0);
});

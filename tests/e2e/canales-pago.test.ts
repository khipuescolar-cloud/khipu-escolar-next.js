import { expect, test } from "@playwright/test";

const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

test("dirección activa WhatsApp, lo ve en sus preferencias con el celular y lo apaga", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("direccion@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
  const main = page.getByRole("main");

  await page.goto(`${COLEGIO}/perfil`);
  await expect(main.getByLabel("Recibir avisos por WhatsApp")).toHaveCount(0); // apagado por defecto

  await page.goto(`${COLEGIO}/configuracion`);
  await expect(main.getByRole("heading", { name: "Canales de pago" })).toBeVisible();
  await expect(main.getByText(/costo por cada mensaje/)).toBeVisible();
  await expect(main.getByTestId("estado-whatsapp").getByText(/Configurado|Falta configurar en el servidor/)).toBeVisible();

  try {
    await main.getByLabel(/Avisos por WhatsApp/).check();
    await main.getByRole("button", { name: "Guardar canales" }).click();
    await expect(page.getByText("Canales de pago guardados.").first()).toBeVisible();

    await page.goto(`${COLEGIO}/perfil`);
    await expect(main.getByLabel("Recibir avisos por WhatsApp")).toBeVisible();
    await expect(main.getByLabel("Recibir avisos por mensaje de texto (SMS)")).toHaveCount(0);
    await main.getByLabel("Celular de Perú").fill("987 654 321");
    await main.getByRole("button", { name: "Guardar celular" }).click();
    await expect(page.getByText("Celular guardado.").first()).toBeVisible();
    await expect(main.getByText(/\+51 \*\*\* \*\*\* 321/)).toBeVisible();

    await main.getByLabel("Celular de Perú").fill("123");
    await main.getByRole("button", { name: "Guardar celular" }).click();
    await expect(page.getByText(/celular de Perú de 9 dígitos/).first()).toBeVisible();
  } finally {
    await page.goto(`${COLEGIO}/configuracion`);
    await main.getByLabel(/Avisos por WhatsApp/).uncheck();
    await main.getByRole("button", { name: "Guardar canales" }).click();
    await expect(page.getByText("Canales de pago guardados.").first()).toBeVisible();
    await page.goto(`${COLEGIO}/perfil`);
    await main.getByLabel("Celular de Perú").fill("");
    await main.getByRole("button", { name: "Guardar celular" }).click();
    await expect(page.getByText("Celular quitado.").first()).toBeVisible();
  }
});

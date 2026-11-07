import { expect, test, type Page } from "@playwright/test";

const puerto = process.env.E2E_PORT ?? "3000";
const colegio = `http://nuevohorizonte.lvh.me:${puerto}`;
const carpetaCapturas = "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad";

async function entrar(page: Page, correo: string) {
  await page.goto(`${colegio}/login`);
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/inicio/, { timeout: 30_000 });
}

test("las URL antiguas redirigen y el menú muestra solo las secciones vigentes", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  for (const enlace of ["?seccion=biblioteca", "?seccion=compartido", "?vista=biblioteca", "?vista=compartido"]) {
    await page.goto(`${colegio}/documentos${enlace}`);
    await expect(page).toHaveURL(`${colegio}/documentos?seccion=materiales`);
  }
  const nav = page.getByRole("navigation", { name: "Secciones de documentos" });
  await expect(nav.getByRole("link")).toHaveCount(6);
  await expect(nav.getByRole("link", { name: "Materiales de clase" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Biblioteca del colegio")).toHaveCount(0);
  await expect(page.getByText("Compartido conmigo")).toHaveCount(0);
  await page.goto(`${colegio}/documentos`);
  await expect(nav.getByRole("link", { name: "Materiales de clase" })).toHaveAttribute("aria-current", "page");
  await page.goto(`${colegio}/documentos?seccion=gestion`);
  await expect(page.getByRole("link", { name: "Descargar reporte CSV" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${carpetaCapturas}/mat-gestion-1440.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${carpetaCapturas}/mat-gestion-390.png`, fullPage: true, style: "nextjs-portal { display: none !important; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("profesor, familia y alumno ven solo las secciones de su rol", async ({ browser }) => {
  const perfiles = [
    { correo: "lucia.garcia@nuevohorizonte.demo", total: 6, secciones: ["materiales", "gestion", "borradores", "recientes", "destacados", "papelera"] },
    { correo: "rosa.quispe@gmail.com", total: 3, secciones: ["materiales", "recientes", "destacados"] },
    { correo: "lucas.huaman@nuevohorizonte.demo", total: 3, secciones: ["materiales", "recientes", "destacados"] },
  ];
  for (const perfil of perfiles) {
    const page = await browser.newPage();
    await entrar(page, perfil.correo);
    const nav = page.getByRole("navigation", { name: "Secciones de documentos" });
    for (const seccion of perfil.secciones) {
      await page.goto(`${colegio}/documentos?seccion=${seccion}`);
      await expect(nav.getByRole("link")).toHaveCount(perfil.total);
      await expect(nav.locator('[aria-current="page"]')).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.close();
  }
});

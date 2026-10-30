import { expect, test, type Page } from "@playwright/test";

// Asistencia al colegio vs. por curso (specs/04 y 27): dirección no pasa lista, ve el reporte general,
// abre una lista para corregir y activa la asistencia por curso por nivel. Deja la configuración demo como estaba.
const PUERTO = process.env.E2E_PORT ?? "3000";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

async function entrar(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);
}

test("dirección no pasa lista: ve el reporte general del colegio y abre una lista para corregir", async ({ page }) => {
  await entrar(page, "direccion@nuevohorizonte.demo");
  await expect(page.getByRole("main").getByText("Reportes de asistencia").first()).toBeVisible();
  await expect(page.getByRole("main").getByText("Pasar lista", { exact: true })).toHaveCount(0);

  // /asistencia la lleva a los reportes.
  await page.goto(`${COLEGIO}/asistencia`);
  await expect(page).toHaveURL(/\/asistencia\/reportes/);
  await expect(page.getByRole("heading", { name: "Asistencia al colegio", exact: true })).toBeVisible();
  const delDia = page.getByTestId("asistencia-del-dia");
  for (const cifra of ["Asistieron", "Faltaron", "Sin registro"]) await expect(delDia.getByText(cifra, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asistencia al colegio en el rango" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Asistencia por curso" })).toBeVisible();

  // Un día pasado hábil (lunes 2 de marzo de 2026) y su lista del día en modo «corregir».
  await page.goto(`${COLEGIO}/asistencia/reportes?dia=2026-03-02`);
  await expect(page.getByText(/lunes,? 2 de marzo/i).first()).toBeVisible();
  await page.getByRole("link", { name: "Corregir la asistencia del día de 3.° B" }).click();
  await expect(page).toHaveURL(/ambito=dia&fecha=2026-03-02/);
  await expect(page.getByRole("heading", { name: "Corregir · Asistencia del día · 3.° B" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar a todos «Llegó»" })).toHaveCount(0);
  await expect(page.getByText("Corrección de un día pasado: no se envían avisos.").filter({ visible: true }).first()).toBeVisible();
  // Sin cambios no guarda nada.
  await page.getByRole("button", { name: "Guardar corrección" }).first().click();
  await expect(page.getByText("No hay cambios para guardar.")).toBeVisible();
  await page.getByRole("link", { name: "Volver a los reportes" }).click();
  await expect(page).toHaveURL(/\/asistencia\/reportes/);
});

test("dirección activa y desactiva la asistencia por curso por nivel y la profesora lo nota", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await entrar(page, "direccion@nuevohorizonte.demo");
  await page.goto(`${COLEGIO}/configuracion`);
  await expect(page.getByRole("heading", { name: "Asistencia por curso" })).toBeVisible();
  const primaria = page.getByRole("checkbox", { name: /Primaria/ });
  await expect(primaria).toBeChecked();
  const lucia = await browser.newContext({ locale: "es-PE" });
  const profe = await lucia.newPage();
  try {
    await primaria.uncheck();
    await page.getByRole("button", { name: "Guardar asistencia por curso" }).click();
    await expect(page.getByText("Asistencia por curso guardada.")).toBeVisible();
    await expect(page.getByRole("checkbox", { name: /Primaria/ })).not.toBeChecked();

    // La profesora de 3.° B (primaria) ya no ve la lista de Matemática; sí la del día.
    await entrar(profe, "lucia.garcia@nuevohorizonte.demo");
    await profe.goto(`${COLEGIO}/asistencia`);
    await expect(profe.getByRole("link", { name: "Asistencia del día · 3.° B" })).toBeVisible();
    await expect(profe.getByRole("link", { name: "Matemática · 3.° B" })).toHaveCount(0);
  } finally {
    await page.goto(`${COLEGIO}/configuracion`);
    await page.getByRole("checkbox", { name: /Primaria/ }).check();
    await page.getByRole("button", { name: "Guardar asistencia por curso" }).click();
    await expect(page.getByText("Asistencia por curso guardada.")).toBeVisible();
  }
  await profe.goto(`${COLEGIO}/asistencia`);
  await expect(profe.getByRole("link", { name: "Matemática · 3.° B" })).toBeVisible();
  await profe.getByRole("link", { name: "Matemática · 3.° B" }).click();
  await expect(profe.getByText(/Ingresó \d|Sin ingreso al colegio/).first()).toBeVisible();
  // En un curso, «Llegó» no se avisa; Mateo falta a la clase.
  const mateo = profe.getByRole("group", { name: "Asistencia de Mateo" });
  await mateo.getByRole("button", { name: "Llegó", exact: true }).click();
  await expect(profe.getByText(/En las listas de curso no se avisa la llegada/).first()).toBeVisible();
  await mateo.getByRole("button", { name: "No llegó" }).click();
  await profe.getByRole("button", { name: "Guardar y avisar a los padres" }).first().click();
  await expect(profe.getByText(/Lista guardada\. Se avisó a \d+ familias?\./)).toBeVisible();
  await lucia.close();

  // Dirección ve la falta a clase en «Asistencia por curso» y entra al detalle del curso, con «Corregir».
  await page.goto(`${COLEGIO}/asistencia/reportes`);
  const seccionCursos = page.getByRole("region", { name: "Asistencia por curso" });
  await expect(seccionCursos.getByRole("columnheader", { name: "Ingresó pero faltó" })).toBeVisible();
  await seccionCursos.getByRole("link", { name: "Matemática" }).first().click();
  await expect(page).toHaveURL(/curso=/);
  await expect(page.getByRole("heading", { name: "Matemática · 3.° B" })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Corregir Matemática del / }).first()).toBeVisible();
});

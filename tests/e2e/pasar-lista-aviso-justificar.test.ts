import { expect, test } from "@playwright/test";

// Flujo completo del plan Básico (specs/04, 06 y 07):
// Lucía pasa lista en 3.° B → la familia recibe el correo en Mailpit → el enlace «Justificar falta» funciona una sola vez.
const PUERTO = process.env.E2E_PORT ?? "3000";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";
const COLEGIO = `http://nuevohorizonte.lvh.me:${PUERTO}`;

type Mensaje = { ID: string; Subject: string; Created: string; From: { Name: string } };

async function esperarCorreo(para: string, asunto: string, desde: Date): Promise<Mensaje> {
  const fin = Date.now() + 45_000;
  while (Date.now() < fin) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${para}"`)}&limit=20`);
    const { messages } = (await res.json()) as { messages: Mensaje[] };
    const m = messages.find((x) => x.Subject === asunto && new Date(x.Created) >= desde);
    if (m) return m;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No llegó el correo «${asunto}» a ${para}`);
}

test("Lucía pasa lista, la familia recibe el aviso de falta y lo justifica con el enlace", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("Correo").fill("lucia.garcia@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${COLEGIO}/inicio`);

  await page.goto(`${COLEGIO}/asistencia`);
  await page.getByRole("link", { name: "Asistencia del día · 3.° B" }).click();
  await expect(page.getByRole("heading", { name: "Asistencia del día · 3.° B" })).toBeVisible();

  // 1) Todos llegaron (deja a Mateo en «Llegó» aunque una corrida anterior lo dejara en «Falta»).
  await page.getByRole("button", { name: "Marcar a todos «Llegó»" }).click();
  await page.getByRole("button", { name: "Guardar y avisar a los padres" }).click();
  await expect(page.getByText("Lista guardada.")).toBeVisible();

  // 2) Mateo no vino.
  const desde = new Date(Date.now() - 2000);
  const mateo = page.getByRole("group", { name: "Asistencia de Mateo" });
  await mateo.getByRole("button", { name: "Falta" }).click();
  await expect(mateo.getByRole("button", { name: "Falta" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTitle("Vista previa del correo para la familia de Mateo")).toBeVisible();
  await expect(page.getByText("Asunto: Mateo no llegó hoy")).toBeVisible();
  await page.getByRole("button", { name: "Guardar y avisar a los padres" }).click();
  await expect(page.getByText("Se avisó a 1 familia.")).toBeVisible();

  // 3) El correo llega a Mailpit firmado por el colegio, con el botón «Justificar falta».
  const correo = await esperarCorreo("rosa.quispe@gmail.com", "Mateo no llegó hoy", desde);
  expect(correo.From.Name).toBe("I.E.P. Nuevo Horizonte");
  const cuerpo = (await (await fetch(`${MAILPIT}/api/v1/message/${correo.ID}`)).json()) as { Text: string };
  expect(cuerpo.Text).toContain("Mateo no llegó hoy a la 1.ª hora. Si ya lo sabías, puedes justificar la falta.");
  const enlace = cuerpo.Text.match(/Justificar falta: (\S+)/)?.[1];
  expect(enlace).toMatch(/\/justificar\/[A-Za-z0-9_-]{43}$/);

  // 4) La familia abre el enlace sin sesión y justifica.
  const familia = await browser.newContext({ locale: "es-PE" });
  const pagina = await familia.newPage();
  await pagina.goto(enlace!);
  await expect(pagina.getByRole("heading", { name: "Justificar la falta de Mateo" })).toBeVisible();
  await expect(pagina.getByText("I.E.P. Nuevo Horizonte")).toBeVisible();
  await pagina.getByLabel("Motivo de la falta").fill("Tuvo fiebre y lo llevamos al médico.");
  await pagina.getByRole("button", { name: "Enviar justificación" }).click();
  await expect(pagina.getByText("Justificación enviada")).toBeVisible();

  // 5) El enlace es de un solo uso.
  await pagina.reload();
  await expect(pagina.getByText("Este enlace ya se usó o no es válido. Escríbele a la tutora desde Khipu.")).toBeVisible();
  await familia.close();
});

import "dotenv/config";
import pg from "pg";
import { expect, test, type Page } from "@playwright/test";
import { esperarSinAcceso } from "./sin-acceso";
import { crearColegioTemporal, type ColegioTemporal } from "./ayudantes/colegio-temporal";

const PUERTO = process.env.E2E_PORT ?? "3000";
const colegio = (slug: string, ruta: string) => `http://${slug}.lvh.me:${PUERTO}${ruta}`;
const bd = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

async function entrarProfesora(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("lucia.garcia@nuevohorizonte.demo");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("nuevohorizonte", "/inicio"));
}

async function entrarRosa(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Correo").fill("rosa.quispe@gmail.com");
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(colegio("nuevohorizonte", "/inicio"));
}

test.afterAll(async () => {
  await bd.end();
});

test("Lucía confirma una reunión sobre su clase después de ver la advertencia", async ({ page }) => {
  const titulo = `Choque e2e ${Date.now()}`;
  const inicio = new Date();
  const clase = await bd.query<{ dia: number; hora_inicio: string }>(`
    select b.dia, p.hora_inicio from bloques_horario b
    join horario_periodos p on p.id = b.periodo_id
    left join cursos c on c.id = b.curso_id
    join memberships m on m.id = coalesce(c.profesor_id, b.profesor_id)
    join profiles u on u.id = m.user_id
    where u.email = $1 and b.dia between 1 and 5
    order by b.dia, p.hora_inicio limit 1
  `, ["lucia.garcia@nuevohorizonte.demo"]);
  expect(clase.rows).toHaveLength(1);
  const hoy = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" })}T12:00:00Z`);
  let fecha = "";
  for (let dias = 7; dias <= 20; dias++) {
    const d = new Date(hoy.getTime() + dias * 86_400_000);
    if (d.getUTCDay() === clase.rows[0].dia) { fecha = d.toISOString().slice(0, 10); break; }
  }
  expect(fecha).not.toBe("");
  const capturas = "/tmp/claude-1000/-home-carlos-calderon-Escritorio-StartUp/4708dc9f-ca0e-4c47-a074-186c44f0e3b5/scratchpad";
  try {
    await entrarProfesora(page);
    await page.goto(colegio("nuevohorizonte", "/reuniones/nueva"));
    await page.getByLabel("Tipo de reunión").selectOption("tutoria");
    await page.getByLabel("Familias").selectOption("salon");
    await page.getByRole("combobox", { name: /^Salón/ }).selectOption({ label: "3.° B" });
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByLabel("Fecha", { exact: true }).fill(fecha);
    await page.getByLabel("Hora de inicio").fill(clase.rows[0].hora_inicio);
    const seguir = page.getByRole("button", { name: /Usar .* y seguir/ });
    await expect(seguir).toBeEnabled();
    await expect(page.getByText(/Choca con: Tú/).first()).toBeVisible();
    await seguir.click();
    await expect(page.getByRole("alertdialog").getByText("Ese horario está ocupado")).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Elegir otro horario" }).click();
    await expect(page.getByText("Paso 2 de 3")).toBeVisible();
    await seguir.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(400); // termina la animación del modal antes de la captura
    await page.screenshot({ path: `${capturas}/choque-modal-1440.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${capturas}/choque-modal-390.png` });
    await page.getByRole("alertdialog").getByRole("button", { name: "Sí, estoy seguro" }).click();
    await expect(page.getByText("Paso 3 de 3")).toBeVisible();
    await expect(page.getByText("Programada sobre un horario ocupado")).toBeVisible();
    await expect(page.getByLabel(/Programar igual fuera de la jornada/)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `${capturas}/choque-detalles-390.png` });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: `${capturas}/choque-detalles-1440.png` });
    await page.getByRole("button", { name: "Volver" }).click();
    await page.getByLabel("Hora de inicio").fill("11:38");
    await page.getByLabel("Hora de inicio").fill(clase.rows[0].hora_inicio);
    await page.getByRole("button", { name: /Usar .* y seguir/ }).click();
    await expect(page.getByRole("alertdialog", { name: "Ese horario está ocupado" })).toBeVisible();
    await page.getByRole("alertdialog").getByRole("button", { name: "Sí, estoy seguro" }).click();
    await page.getByLabel("Título", { exact: true }).fill(titulo);
    await page.getByLabel("Lugar", { exact: true }).fill("Aula 3.° B");
    await page.getByRole("button", { name: "Confirmar reunión" }).click();
    await page.waitForURL(/\/reuniones\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
  } finally {
    await bd.query("delete from avisos where plantilla like 'reunion%' and created_at >= $1", [inicio]);
    await bd.query("delete from notificaciones where tipo = 'reunion' and created_at >= $1", [inicio]);
    await bd.query("delete from reuniones where titulo = $1", [titulo]);
  }
});

test("Lucía convoca a 3.° B, Rosa confirma, Lucía ve la confirmación y publica el acta, Rosa la lee", async ({ page, context }) => {
  const titulo = `Reunión e2e ${Date.now()}`;
  const inicio = new Date();
  // Próximo día hábil (lunes a viernes): el asistente propone horarios en días de clase.
  const manana = (() => {
    for (let dias = 1; dias <= 4; dias++) {
      const fecha = new Date(Date.now() + dias * 86_400_000);
      const diaSemana = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "America/Lima" }).format(fecha);
      if (diaSemana !== "Sat" && diaSemana !== "Sun") return fecha.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    }
    throw new Error("sin día hábil");
  })();

  try {
    // 1. Lucía convoca a 3.° B con el asistente (specs/40): tutoría, 18:00 (fuera de la jornada, lo confirma).
    await entrarProfesora(page);
    await page.goto(colegio("nuevohorizonte", "/reuniones/nueva"));
    await page.getByLabel("Tipo de reunión").selectOption("tutoria");
    await page.getByLabel("Familias").selectOption("salon");
    await page.getByRole("combobox", { name: /^Salón/ }).selectOption({ label: "3.° B" });
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByLabel("Fecha", { exact: true }).fill(manana);
    await page.getByLabel("Hora de inicio").fill("18:00");
    await page.getByRole("button", { name: /Usar .*18:00–18:30 y seguir/ }).click();
    const advertencia = page.getByRole("alertdialog", { name: "Ese horario está ocupado" });
    if (await advertencia.isVisible()) await advertencia.getByRole("button", { name: "Sí, estoy seguro" }).click();
    await page.getByLabel("Título", { exact: true }).fill(titulo);
    await page.getByLabel("Lugar", { exact: true }).fill("Aula 3.° B");
    const fueraDeHorario = page.getByLabel(/Programar igual fuera de la jornada/);
    if (await fueraDeHorario.isVisible()) await fueraDeHorario.check();
    await page.getByRole("button", { name: "Confirmar reunión" }).click();
    await page.waitForURL(/\/reuniones\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: titulo })).toBeVisible();

    // 2. Rosa confirma.
    await context.clearCookies();
    await entrarRosa(page);
    await page.goto(colegio("nuevohorizonte", "/reuniones"));
    const tarjeta = page.locator("li", { hasText: titulo });
    await expect(tarjeta.getByText("Sin respuesta").first()).toBeVisible();
    await tarjeta.getByLabel("Nota (opcional)").fill("Ahí estaré.");
    await tarjeta.getByRole("button", { name: "Aceptar", exact: true }).click();
    await expect(page.getByText("Listo, confirmamos que asistirás.")).toBeVisible();

    // 3. Lucía ve la confirmación.
    await context.clearCookies();
    await entrarProfesora(page);
    await page.goto(colegio("nuevohorizonte", "/reuniones"));
    await page.getByRole("link", { name: titulo }).click();
    await expect(page.getByRole("heading", { name: "Confirmaciones" })).toBeVisible();
    const asistiran = page.locator("section[aria-labelledby=confirmaciones] > div > div", { hasText: "Aceptaron" }).first();
    await expect(asistiran.getByText("Rosa Quispe Mamani")).toBeVisible();
    await expect(asistiran.getByText("«Ahí estaré.»")).toBeVisible();

    // 4. La reunión «ocurre» (se adelanta el inicio en la BD) y Lucía marca asistencia y publica el acta.
    await bd.query("update reuniones set inicio = now() - interval '2 hours' where titulo = $1", [titulo]);
    await page.reload();
    await page.getByRole("button", { name: "Marcar asistencia" }).click();
    await page.getByRole("button", { name: "Guardar asistencia" }).click();
    await expect(page.getByText("Asistencia guardada.")).toBeVisible();
    await page.getByRole("button", { name: "Escribir acta" }).click();
    await page.getByLabel("Acta", { exact: true }).fill("Se acordó revisar las tareas cada viernes. Próxima reunión en noviembre.");
    await page.getByLabel(/Publicar a las familias/).check();
    await page.getByRole("button", { name: "Guardar acta" }).click();
    await expect(page.getByText(/Acta publicada/)).toBeVisible();

    // 5. Rosa lee el acta.
    await context.clearCookies();
    await entrarRosa(page);
    await page.goto(colegio("nuevohorizonte", "/reuniones"));
    await page.getByRole("link", { name: titulo }).first().click();
    await expect(page.getByRole("heading", { name: "Acta" })).toBeVisible();
    await expect(page.getByText("Se acordó revisar las tareas cada viernes.")).toBeVisible();
  } finally {
    await bd.query("delete from avisos where plantilla like 'reunion%' and created_at >= $1", [inicio]);
    await bd.query("delete from notificaciones where tipo = 'reunion' and created_at >= $1", [inicio]);
    await bd.query("delete from reuniones where titulo = $1", [titulo]);
  }
});

test("el colegio con plan Base no tiene reuniones (403)", async ({ page }) => {
  const base: ColegioTemporal = await crearColegioTemporal({ plan: "base", prefijo: "e2e-base" });
  try {
    await page.goto("/login");
    await page.getByLabel("Correo").fill(base.correos.direccion);
    await page.getByLabel("Contraseña").fill("demo123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.waitForURL(colegio(base.slug, "/inicio"));
    const res = await page.goto(colegio(base.slug, "/reuniones"));
    await esperarSinAcceso(page, res);
  } finally {
    await base.limpiar();
  }
});

const P = "/home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-escolar";
const { chromium } = require(P + "/node_modules/@playwright/test");
const C = "http://nuevohorizonte.lvh.me:3000";
const ARGS = { args: ["--host-resolver-rules=MAP *.lvh.me 127.0.0.1"] };
async function entrar(b, correo, vp, extra = {}) {
  const ctx = await b.newContext({ viewport: vp, ...extra });
  const page = await ctx.newPage();
  await page.goto(C + "/login");
  await page.getByLabel("Correo").fill(correo);
  await page.getByLabel("Contraseña").fill("demo123");
  await page.getByRole("button", { name: /Ingresar|Entrar|Iniciar/ }).first().click();
  await page.waitForURL(u => !u.pathname.includes("login"), { timeout: 60000 });
  return { ctx, page };
}
module.exports = { chromium, entrar, C, ARGS };

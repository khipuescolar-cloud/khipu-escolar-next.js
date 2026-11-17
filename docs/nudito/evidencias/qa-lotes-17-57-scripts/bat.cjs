const fs = require("fs");
const { chromium, ARGS } = require("./lib.cjs");
const P = "/home/carlos-calderon/Escritorio/StartUp/Asistente Virtual Academico (AVA)/khipu-wt/qa-preview/src/app/refuerzo-preview-temporal/datos.json";
const datos = JSON.parse(fs.readFileSync(P, "utf8"));
const idx = +process.argv[2]; const ficha = datos[idx]; const clave = ficha.clave; const cl = ficha.clase;
const URL_ = "http://lvh.me:3070/refuerzo-preview-temporal";
const VP = { esc: { width: 1280, height: 800 }, mov: { width: 390, height: 844 } };
const norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();
const SPY = `(()=>{window.__spoken=[];const ss=window.speechSynthesis;if(!ss)return;ss.speak=u=>{const e=document.querySelector("p.text-cuerpo-sm");window.__spoken.push({t:u.text,m:e?e.textContent:""});setTimeout(()=>{try{u.onend&&u.onend({})}catch(e){}},40);};})()`;
const R = { clave, nombre: ficha.nombre, momentos: cl.momentos.length + 1 };
async function abrir(b, vp, extra = {}) {
  const ctx = await b.newContext({ viewport: vp, ...extra });
  const page = await ctx.newPage(); page.setDefaultTimeout(20000);
  await page.addInitScript(SPY);
  const log = { consola: [], http: [], fallos: [], img200: {} };
  page.on("console", m => { if (m.type() === "error") log.consola.push(m.text().slice(0, 200)); });
  page.on("pageerror", e => log.consola.push("PAGEERROR " + e.message.slice(0, 200)));
  page.on("response", r => { const s = r.status(); if (s >= 400) log.http.push(s + " " + r.url().slice(0, 140)); if (/\.(svg|webp)|_next\/image/.test(r.url())) log.img200[r.url().slice(0, 140)] = s; });
  page.on("requestfailed", r => log.fallos.push(r.url().slice(0, 140) + " " + (r.failure() || {}).errorText));
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.locator("select#tema-preview").selectOption(String(idx));
  await page.waitForTimeout(700);
  return { ctx, page, log };
}
const etiq = p => p.locator("p.text-cuerpo-sm").first().innerText().catch(() => "?");
async function momento(page, i) {
  const o = { i, etiq: await etiq(page) };
  o.titulo = await page.locator("article h3").first().innerText().catch(() => null);
  o.texto = await page.locator("article").first().innerText().catch(() => "");
  o.imgs = await page.locator("article img, figure img").evaluateAll(es => es.map(e => ({ cur: e.currentSrc, ok: e.complete && e.naturalWidth > 0, nw: e.naturalWidth, w: Math.round(e.getBoundingClientRect().width) })));
  o.ovf = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - innerWidth, body: document.body.scrollWidth - innerWidth }));
  return o;
}
async function recorrer(page, vpn) {
  const out = []; let i = 0;
  while (true) {
    await page.waitForTimeout(450);
    // espera a que la imagen termine de cargar (lazy)
    await page.waitForFunction(() => [...document.querySelectorAll("article img, figure img")].every(e => e.complete), null, { timeout: 8000 }).catch(() => {});
    const m = await momento(page, i); out.push(m);
    if (!m.imgs.length && i === 0) await page.screenshot({ path: `shots/${clave}-${vpn}-m1.png`, fullPage: true });
    if (m.imgs.length && !R["shot" + vpn]) { R["shot" + vpn] = true; await page.screenshot({ path: `shots/${clave}-${vpn}-img.png`, fullPage: true }); }
    const sig = page.getByRole("button", { name: /^Siguiente/ });
    if (!(await sig.count())) break; await sig.click(); i++;
  }
  return out;
}
(async () => {
  const b = await chromium.launch(ARGS);
  // A) escritorio: recorrido + comprobación + retroceso
  { const { ctx, page, log } = await abrir(b, VP.esc); R.esc = { log };
    R.esc.mom = await recorrer(page, "esc");
    const fs_ = page.locator("fieldset");
    R.compr = { pregunta: await fs_.locator("legend, p").first().innerText().catch(() => null), opciones: await fs_.locator("button[aria-pressed]").allInnerTexts(), intentos: [] };
    await page.screenshot({ path: `shots/${clave}-esc-compr.png`, fullPage: true });
    const ops = cl.comprobacion.opciones; const bien = ops.findIndex(o => o.id === cl.comprobacion.respuesta);
    const orden = [...ops.keys()].filter(k => k !== bien); orden.push(bien);
    const hab0 = await page.getByRole("button", { name: /A practicar/ }).isEnabled().catch(() => null);
    R.compr.practicarAntes = hab0;
    for (const k of orden) {
      await fs_.locator("button[aria-pressed]").nth(k).click();
      for (let w = 0; w < 20; w++) { await page.waitForTimeout(300); const t = await fs_.locator("p[role=status]").innerText().catch(() => ""); if (t && !/Comprobando/.test(t)) break; }
      const fb = await fs_.locator("p[role=status]").innerText().catch(() => "(sin)");
      R.compr.intentos.push({ k, esBien: k === bien, fb: fb.slice(0, 200), practicarHab: await page.getByRole("button", { name: /A practicar/ }).isEnabled().catch(() => null) });
    }
    await page.screenshot({ path: `shots/${clave}-esc-compr-fb.png`, fullPage: true });
    await page.getByRole("button", { name: /^Anterior/ }).click(); await page.waitForTimeout(500);
    const teo = await etiq(page);
    await page.getByRole("button", { name: /^Siguiente/ }).click(); await page.waitForTimeout(600);
    R.retomar = { teoria: teo, fieldset: await fs_.count(), fb: (await fs_.locator("p[role=status]").innerText().catch(() => "(sin)")).slice(0, 80), pressed: await fs_.locator("button[aria-pressed=true]").count(), practicarHab: await page.getByRole("button", { name: /A practicar/ }).isEnabled().catch(() => null) };
    for (let k = 0; k < 3; k++) await page.getByRole("button", { name: /^Anterior/ }).click();
    const bt = async () => (await page.getByRole("button", { name: /Iniciar clase|Pausar|Reanudar/ }).first().innerText());
    const e0 = await etiq(page);
    await page.getByRole("button", { name: /Iniciar clase/ }).click(); await page.waitForTimeout(120); const s1 = await bt();
    await page.getByRole("button", { name: /Pausar/ }).click(); const s2 = await bt();
    await page.getByRole("button", { name: /Reanudar/ }).click(); const s3 = await bt();
    R.controles = { antes: e0, trasIniciar: s1, trasPausar: s2, trasReanudar: s3 };
    await ctx.close(); }
  // B) móvil 390x844
  { const { ctx, page, log } = await abrir(b, VP.mov); R.mov = { log };
    R.mov.mom = await recorrer(page, "mov");
    const fs_ = page.locator("fieldset"); await page.screenshot({ path: `shots/${clave}-mov-compr.png`, fullPage: true });
    R.mov.opcionesVisibles = await fs_.locator("button[aria-pressed]").count();
    await ctx.close(); }
  // C) pase de audio completo (escritorio)
  { const { ctx, page } = await abrir(b, VP.esc);
    await page.getByRole("button", { name: /Iniciar clase/ }).click();
    const n = R.momentos; let prev = ""; let est = 0;
    for (let t = 0; t < 120; t++) { await page.waitForTimeout(500); const e = await etiq(page); if (e === prev) est++; else { est = 0; prev = e; } if (/momento (\d+) de \1/.test(e) && est > 6) break; }
    R.hablado = await page.evaluate(() => window.__spoken); R.posFinal = prev; await ctx.close(); }
  // D) movimiento reducido (móvil): el texto debe verse completo al reproducir
  { const { ctx, page } = await abrir(b, VP.mov, { reducedMotion: "reduce" }); R.rm = { inf: [], parcial: [] };
    await page.getByRole("button", { name: /Iniciar clase/ }).click();
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(700);
      R.rm.inf.push(...await page.evaluate(() => document.getAnimations().filter(a => { const t = a.effect && a.effect.getComputedTiming && a.effect.getComputedTiming(); return t && t.iterations === Infinity; }).map(a => a.animationName || a.constructor.name)));
      const m = cl.momentos[Math.min(i, cl.momentos.length - 1)];
      const vis = norm(await page.locator("article").first().innerText());
      R.rm.parcial.push({ i, completo: vis.includes(norm(m.narracion)), esperadas: norm(m.narracion).split(" ").length });
      const sig = page.getByRole("button", { name: /^Siguiente/ }); if (await sig.count()) await sig.click();
    }
    await ctx.close(); }
  fs.writeFileSync(`res/${idx}.json`, JSON.stringify(R, null, 1));
  await b.close();
})().catch(e => { console.error("ERR", idx, e.message.slice(0, 400)); fs.writeFileSync(`res/${idx}.json`, JSON.stringify({ ...R, error: e.message.slice(0, 400) }, null, 1)); process.exit(1); });

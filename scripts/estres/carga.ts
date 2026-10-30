// Prueba de carga HTTP contra la app en modo producción (pnpm build && pnpm start --port 3100).
// Uso: pnpm exec tsx --conditions=react-server scripts/estres/carga.ts <escenario> [--etiqueta antes|despues]
//   a  pico de la mañana: 40 profesores entran (login real), abren su lista y la guardan (server action)
//   c  200 apoderados a la vez abren /inicio y /asistencia (3 rondas)
//   d  dirección: reporte del colegio (2 meses), tablero, consolidado del salón más grande (página, Excel, PDF)
//   e  portería: 300 lecturas de carnet QR (server action) a ritmo constante
//   reset-hoy  borra la asistencia y los avisos de HOY del colegio sintético (para repetir escenarios)
// Las server actions se llaman igual que el navegador: POST con la cabecera `Next-Action` (id leído del build).
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { tokenDerivado } from "../../src/lib/server/tokens";
import { URL_COLEGIO, URL_RAIZ, crearPrisma, enParalelo, resumir, type Medicion } from "./comun";

const SALIDA = path.join(import.meta.dirname, ".salida");
const datos = JSON.parse(readFileSync(path.join(SALIDA, "datos.json"), "utf8")) as {
  tenantId: string; slug: string; password: string; direccion: string; porteria: string;
  profesores: { email: string; lista: { salonId: string; ambito: string } }[];
  apoderados: string[]; carnets: { carnetId: string; alumnoId: string }[];
  salonMayor: { id: string; nombre: string; alumnos: number }; periodos: { id: string; nombre: string }[];
  alumnosPorSalon: Record<string, string[]>; desdeHistorial: string; hastaHistorial: string;
};
const etiqueta = (() => {
  const i = process.argv.indexOf("--etiqueta");
  return i >= 0 ? process.argv[i + 1] : "sin-etiqueta";
})();

// ───────────── ids de server actions (del build de producción) ─────────────
function idAccion(nombre: string, archivo: string): string {
  const manifiesto = JSON.parse(readFileSync(path.resolve(".next/server/server-reference-manifest.json"), "utf8")) as {
    node: Record<string, { exportedName?: string; filename?: string }>;
  };
  const id = Object.entries(manifiesto.node).find(([, v]) => v.exportedName === nombre && v.filename?.includes(archivo))?.[0];
  if (!id) throw new Error(`No encontré la server action ${nombre} en el build (¿corriste pnpm build?).`);
  return id;
}

// ───────────── Sesión: tarro de cookies por usuario ─────────────
class Sesion {
  cookies = new Map<string, string>();
  constructor(readonly email: string) {}
  cabecera() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  guardar(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [par, ...atributos] = c.split(";");
      const i = par.indexOf("=");
      const nombre = par.slice(0, i).trim();
      const valor = par.slice(i + 1).trim();
      const borra = valor === "" || atributos.some((a) => /max-age=0/i.test(a.trim()));
      if (borra) this.cookies.delete(nombre);
      else this.cookies.set(nombre, valor);
    }
  }
  async pedir(url: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    if (this.cookies.size) headers.set("cookie", this.cabecera());
    const res = await fetch(url, { ...init, headers, redirect: "manual" });
    this.guardar(res);
    return res;
  }
}

/** Login real: la server action `loginAction` de /login con el FormData que arma React (prefijo «_1_»). */
async function login(email: string, password: string): Promise<Sesion> {
  const s = new Sesion(email);
  const form = new FormData();
  // Como el cliente de React: primero las entradas del FormData referenciado y al final la raíz «0».
  form.set("_1_email", email);
  form.set("_1_password", password);
  form.set("0", JSON.stringify([{}, "$K1"]));
  const res = await s.pedir(`${URL_RAIZ}/login`, {
    method: "POST",
    headers: { "Next-Action": ACCION_LOGIN(), Origin: URL_RAIZ, Accept: "text/x-component" },
    body: form,
  });
  await res.arrayBuffer();
  if (![...s.cookies.keys()].some((k) => k.includes("auth-token"))) throw new Error(`Login falló para ${email} (HTTP ${res.status})`);
  return s;
}
const ACCION_LOGIN = () => (cacheIds.login ??= idAccion("loginAction", "login/actions.ts"));
const cacheIds: Record<string, string> = {};

async function accion(s: Sesion, pagina: string, id: string, args: unknown[]) {
  const res = await s.pedir(`${URL_COLEGIO}${pagina}`, {
    method: "POST",
    headers: { "Next-Action": id, Origin: URL_COLEGIO, Accept: "text/x-component", "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(args),
  });
  const cuerpo = await res.text();
  if (res.status !== 200) throw new Error(`Acción HTTP ${res.status}: ${cuerpo.slice(0, 200)}`);
  return cuerpo;
}

async function pagina(s: Sesion, ruta: string, esperado = 200) {
  const res = await s.pedir(`${URL_COLEGIO}${ruta}`);
  const cuerpo = await res.arrayBuffer();
  // Un error al renderizar en streaming llega con HTTP 200: se detecta por el «digest» del error en el HTML.
  if (res.status === 200 && (res.headers.get("content-type") ?? "").includes("text/html") && /digest\\?":\\?"\d+/.test(Buffer.from(cuerpo).toString("utf8"))) {
    throw new Error(`GET ${ruta} → error de render (HTTP 200 con digest)`);
  }
  if (res.status !== esperado) throw new Error(`GET ${ruta} → HTTP ${res.status}${res.headers.get("location") ? ` → ${res.headers.get("location")}` : ""}`);
  return cuerpo.byteLength;
}

/** Mide una tanda de tareas concurrentes: latencia por tarea, errores y throughput. */
async function medir<T>(nombre: string, items: T[], concurrencia: number, tarea: (x: T, i: number) => Promise<unknown>): Promise<Medicion> {
  const lat: number[] = [];
  let errores = 0;
  const muestras: string[] = [];
  const t0 = performance.now();
  await enParalelo(items, concurrencia, async (x, i) => {
    const t = performance.now();
    try {
      await tarea(x, i);
      lat.push(performance.now() - t);
    } catch (e) {
      errores++;
      if (muestras.length < 3) muestras.push(e instanceof Error ? e.message : String(e));
    }
  });
  const m = resumir(nombre, lat, errores, (performance.now() - t0) / 1000);
  registrar(m);
  if (muestras.length) console.log(`    errores de muestra: ${muestras.join(" | ")}`);
  return m;
}

function registrar(m: Medicion & Record<string, unknown>) {
  console.log(
    `  ${m.nombre.padEnd(48)} n=${String(m.n).padStart(4)} err=${m.errores} p50=${m.p50}ms p95=${m.p95}ms p99=${m.p99}ms max=${m.max}ms ${m.rps} req/s (${m.segundos}s)`,
  );
  appendFileSync(path.join(SALIDA, "resultados.jsonl"), JSON.stringify({ etiqueta, fecha: new Date().toISOString(), ...m }) + "\n");
}

async function stats(): Promise<{ recibidos: number; primero: number | null; ultimo: number | null }> {
  try {
    return await (await fetch("http://127.0.0.1:2526/stats")).json();
  } catch {
    return { recibidos: -1, primero: null, ultimo: null };
  }
}

/** Espera a que la cola del colegio quede vacía (la vacían los after() del servidor) y mide cuánto tardó. */
async function esperarCola(nombre: string, desde: number, maxSegundos = 900) {
  const prisma = crearPrisma();
  try {
    const hoy = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
    const filtro = { tenantId: datos.tenantId, createdAt: { gte: new Date(`${hoy}T00:00:00-05:00`) } };
    const total = await prisma.aviso.count({ where: filtro });
    let pendientes = total;
    let ultimoLog = 0;
    // Se corta si la cola deja de avanzar 60 s (avisos atascados hasta el próximo cron) o al llegar a maxSegundos.
    let ultimoCambio = Date.now();
    let atascada = false;
    while (pendientes > 0 && (Date.now() - desde) / 1000 < maxSegundos) {
      await new Promise((r) => setTimeout(r, 1000));
      const antes = pendientes;
      pendientes = await prisma.aviso.count({ where: { ...filtro, estado: { in: ["pendiente", "enviando"] } } });
      if (pendientes !== antes) ultimoCambio = Date.now();
      else if (Date.now() - ultimoCambio > 60_000) {
        atascada = true;
        break;
      }
      if (Date.now() - ultimoLog > 15_000) {
        ultimoLog = Date.now();
        console.log(`    cola: ${pendientes}/${total} pendientes a los ${((Date.now() - desde) / 1000).toFixed(0)} s`);
      }
    }
    const porEstado = await prisma.aviso.groupBy({ by: ["estado"], where: filtro, _count: { _all: true } });
    const s = await stats();
    const segundos = ((atascada ? ultimoCambio : Date.now()) - desde) / 1000;
    const enviados = porEstado.find((p) => p.estado === "enviado")?._count._all ?? 0;
    console.log(`  ${nombre}: ${total} avisos encolados; ${pendientes} pendientes al final${atascada ? " (COLA ATASCADA: nadie la procesa)" : ""}; ${segundos.toFixed(1)} s; ${(enviados / segundos).toFixed(1)} correos/s; SMTP recibió ${s.recibidos}`);
    console.log(`    por estado: ${porEstado.map((p) => `${p.estado}=${p._count._all}`).join(", ")}`);
    appendFileSync(path.join(SALIDA, "resultados.jsonl"), JSON.stringify({ etiqueta, nombre, total, pendientes, atascada, segundos, enviados, smtp: s.recibidos, porEstado }) + "\n");
  } finally {
    await prisma.$disconnect();
  }
}

// ───────────── Escenarios ─────────────

function registrosDeLista(salonId: string) {
  return datos.alumnosPorSalon[salonId].map((alumnoId, i) => ({ alumnoId, estado: i % 20 === 7 ? "falta" : i % 20 === 13 ? "tarde" : "llego" }));
}

async function escenarioA() {
  console.log("Escenario A: 40 profesores pasan lista a la vez (login real + página de la lista + server action)");
  await fetch("http://127.0.0.1:2526/reset").catch(() => {});
  const sesiones: Sesion[] = [];
  await medir("A1 login profesor (server action)", datos.profesores, 40, async (p, i) => {
    sesiones[i] = await login(p.email, datos.password);
  });
  await medir("A2 GET /asistencia?salon&ambito (lista)", datos.profesores, 40, (p, i) =>
    pagina(sesiones[i], `/asistencia?salon=${p.lista.salonId}&ambito=${p.lista.ambito}`),
  );
  const id = idAccion("guardarListaAction", "asistencia/actions.ts");
  const desde = Date.now();
  await medir("A3 guardarListaAction (lista completa)", datos.profesores, 40, async (p, i) => {
    const r = await accion(sesiones[i], "/asistencia", id, [datos.slug, { salonId: p.lista.salonId, ambito: p.lista.ambito, registros: registrosDeLista(p.lista.salonId) }]);
    if (!r.includes('"ok":true')) throw new Error(`guardarLista no ok: ${r.slice(0, 200)}`);
  });
  await esperarCola("B0 cola vaciada por los after() del servidor", desde);
}

async function escenarioC() {
  console.log("Escenario C: 200 apoderados abren /inicio y /asistencia a la vez");
  const sesiones: Sesion[] = [];
  await medir("C1 login apoderado (server action)", datos.apoderados, 20, async (email, i) => {
    sesiones[i] = await login(email, datos.password);
  });
  for (let ronda = 1; ronda <= 3; ronda++) {
    await medir(`C2 GET /inicio (200 a la vez, ronda ${ronda})`, sesiones, 200, (s) => pagina(s, "/inicio"));
    await medir(`C3 GET /asistencia (200 a la vez, ronda ${ronda})`, sesiones, 200, (s) => pagina(s, "/asistencia"));
  }
  await medir("C4 /inicio y /asistencia, 600 req con 50 VU", Array.from({ length: 600 }, (_, i) => i), 50, (i) =>
    pagina(sesiones[i % sesiones.length], i % 2 ? "/asistencia" : "/inicio"),
  );
}

async function escenarioD() {
  console.log("Escenario D: dirección (reportes, tablero, consolidado)");
  const s = await login(datos.direccion, datos.password);
  const rango = `desde=${datos.desdeHistorial}&hasta=${datos.hastaHistorial}`;
  const periodo = datos.periodos[3].id; // IV bimestre: notas sin cerrar (calcula sugeridas)
  const periodoIII = datos.periodos[2].id; // III bimestre: calificaciones oficiales
  const salon = datos.salonMayor.id;
  const pasos: [string, string][] = [
    ["D1 reporte colegio 2 meses (página)", `/asistencia/reportes?${rango}`],
    ["D2 reporte colegio 2 meses (Excel)", `/api/reportes-asistencia/excel?${rango}`],
    ["D3 reporte colegio 2 meses (PDF)", `/api/reportes-asistencia/pdf?${rango}`],
    ["D4 reporte salón mayor 2 meses (página)", `/asistencia/reportes?salon=${salon}&${rango}`],
    ["D5 tablero (página)", "/tablero"],
    ["D6 consolidado salón mayor IV (página)", `/tablero/consolidado?salon=${salon}&periodo=${periodo}`],
    ["D7 consolidado salón mayor IV (Excel)", `/api/tablero/consolidado/excel?salon=${salon}&periodo=${periodo}`],
    ["D8 consolidado salón mayor IV (PDF)", `/api/tablero/consolidado/pdf?salon=${salon}&periodo=${periodo}`],
    ["D9 consolidado salón mayor III (PDF)", `/api/tablero/consolidado/pdf?salon=${salon}&periodo=${periodoIII}`],
    ["D10 inicio dirección", "/inicio"],
    ["D11 pasar lista (resumen del día)", "/asistencia"],
  ];
  await pagina(s, "/inicio"); // calentamiento
  for (const [nombre, ruta] of pasos) await medir(nombre, Array.from({ length: 5 }, (_, i) => i), 1, () => pagina(s, ruta));
  // Varias personas de dirección/administración a la vez sobre lo más pesado.
  await medir("D12 reporte colegio (página), 5 a la vez x2", Array.from({ length: 10 }, (_, i) => i), 5, () => pagina(s, `/asistencia/reportes?${rango}`));
  await medir("D13 tablero, 5 a la vez x2", Array.from({ length: 10 }, (_, i) => i), 5, () => pagina(s, "/tablero"));
}

async function escenarioE() {
  const total = 300;
  const segundos = Number(process.env.ESTRES_E_SEGUNDOS ?? 120);
  console.log(`Escenario E: portería, ${total} lecturas QR en ${segundos} s (${(total / segundos).toFixed(1)}/s; el pedido es 300 en 10 min = 0,5/s)`);
  await fetch("http://127.0.0.1:2526/reset").catch(() => {});
  const s = await login(datos.porteria, datos.password);
  await pagina(s, "/porteria");
  const id = idAccion("registrarPorQrAction", "porteria/actions.ts");
  const carnets = datos.carnets.slice(0, total);
  const lat: number[] = [];
  let errores = 0;
  const intervalo = (segundos * 1000) / total;
  const t0 = performance.now();
  const desde = Date.now();
  await Promise.all(
    carnets.map(async (c, i) => {
      await new Promise((r) => setTimeout(r, i * intervalo));
      const t = performance.now();
      try {
        const r = await accion(s, "/porteria", id, [datos.slug, `${URL_RAIZ}/q/${tokenDerivado("carnet", c.carnetId)}`]);
        if (!r.includes('"ok":true')) throw new Error(r.slice(0, 200));
        lat.push(performance.now() - t);
      } catch (e) {
        if (errores++ < 3) console.log(`    error: ${e instanceof Error ? e.message : e}`);
      }
    }),
  );
  registrar(resumir(`E1 registrarPorQrAction (${(total / segundos).toFixed(1)}/s)`, lat, errores, (performance.now() - t0) / 1000));
  await esperarCola("E2 cola de avisos de portería", desde, 600);
}

async function resetHoy() {
  const prisma = crearPrisma();
  try {
    const hoy = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
    const desde = new Date(`${hoy}T00:00:00-05:00`);
    const avisos = await prisma.aviso.deleteMany({ where: { tenantId: datos.tenantId, createdAt: { gte: desde } } });
    const asis = await prisma.asistencia.deleteMany({ where: { tenantId: datos.tenantId, fecha: new Date(`${hoy}T00:00:00Z`) } });
    console.log(`reset-hoy: ${asis.count} asistencias y ${avisos.count} avisos de hoy borrados (colegio sintético).`);
  } finally {
    await prisma.$disconnect();
  }
}

const escenarios: Record<string, () => Promise<void>> = { a: escenarioA, c: escenarioC, d: escenarioD, e: escenarioE, "reset-hoy": resetHoy };
const nombre = process.argv[2];
if (!escenarios[nombre]) {
  console.error(`Escenario desconocido. Usa: ${Object.keys(escenarios).join(", ")}`);
  process.exit(1);
}
escenarios[nombre]().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

// Mide la capa de negocio SIN HTTP (src/lib/server con un TenantContext real del colegio sintético).
// Uso: pnpm exec tsx --require ./scripts/estres/sin-server-only.cjs scripts/estres/directo.ts <lista|cola> [--etiqueta antes|despues]
//   lista  40 profesores llaman guardarLista() a la vez (escritura del pico de la mañana, sin after()).
//   cola   procesa los avisos que dejó «lista»: (1) canal falso sin pausa = costo de BD + plantilla;
//          (2) SMTP nulo sin pausa; (3) ritmo de SES (14/s) 30 s; (4) tope diario. Requiere smtp-nulo en 2525.
import "dotenv/config"; // antes de src/lib/server/db, que lee DATABASE_URL al importarse
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { guardarLista } from "../../src/lib/server/asistencia";
import { db } from "../../src/lib/server/db";
import { EmailChannel, cerrarTransporteCorreo } from "../../src/lib/server/notificaciones/email";
import { procesarCola } from "../../src/lib/server/notificaciones/cola";
import type { NotificationChannel } from "../../src/lib/server/notificaciones/tipos";
import { resolverContextoColegio } from "../../src/lib/server/tenant";
import { exigirLocal, resumir } from "./comun";

exigirLocal();
const SALIDA = path.join(import.meta.dirname, ".salida");
const datos = JSON.parse(readFileSync(path.join(SALIDA, "datos.json"), "utf8")) as {
  tenantId: string; slug: string; profesores: { email: string; lista: { salonId: string; ambito: string } }[]; alumnosPorSalon: Record<string, string[]>;
};
const etiqueta = (() => {
  const i = process.argv.indexOf("--etiqueta");
  return i >= 0 ? process.argv[i + 1] : "sin-etiqueta";
})();
const anotar = (o: object) => appendFileSync(path.join(SALIDA, "resultados.jsonl"), JSON.stringify({ etiqueta, fecha: new Date().toISOString(), ...o }) + "\n");

async function lista() {
  const ctxs = await Promise.all(
    datos.profesores.map(async (p) => {
      const user = await db.profile.findUniqueOrThrow({ where: { email: p.email } });
      return resolverContextoColegio(user, datos.slug);
    }),
  );
  const lat: number[] = [];
  const t0 = performance.now();
  const r = await Promise.all(
    datos.profesores.map(async (p, i) => {
      const t = performance.now();
      const res = await guardarLista(ctxs[i], {
        salonId: p.lista.salonId, ambito: p.lista.ambito,
        registros: datos.alumnosPorSalon[p.lista.salonId].map((alumnoId, k) => ({ alumnoId, estado: k % 20 === 7 ? "falta" : k % 20 === 13 ? "tarde" : "llego" })),
      });
      lat.push(performance.now() - t);
      return res;
    }),
  );
  const m = resumir("A4 guardarLista() directo, 40 a la vez", lat, 0, (performance.now() - t0) / 1000);
  console.log(m, { registros: r.reduce((s, x) => s + x.guardados, 0), familiasAvisadas: r.reduce((s, x) => s + x.familiasAvisadas, 0) });
  anotar(m);
}

async function cola() {
  const tenantId = datos.tenantId;
  const pendientes = () => db.aviso.count({ where: { tenantId, estado: "pendiente" } });
  const total = await pendientes();
  console.log(`Pendientes: ${total}`);
  if (total < 400) throw new Error("Corre antes `directo.ts lista` (después de `carga.ts reset-hoy`).");
  const correr = async (nombre: string, n: number, opciones: Parameters<typeof procesarCola>[0]) => {
    const t0 = performance.now();
    const r = await procesarCola({ tenantId, maxAvisos: n, presupuestoMs: opciones?.presupuestoMs ?? 600_000, ...opciones });
    const s = (performance.now() - t0) / 1000;
    const salida = { nombre, ...r, segundos: Math.round(s * 10) / 10, porSegundo: Math.round((r.enviados / s) * 10) / 10 };
    console.log(salida);
    anotar(salida);
  };
  const enviados: string[] = [];
  const falso: NotificationChannel = { canal: "correo", enviar: async ({ avisoId }) => (enviados.push(avisoId), {}) };
  const sinLimite = { limiteDiario: 1_000_000, porSegundo: 1_000_000 };
  const nada = async () => {};
  // Solo una parte de la cola en cada variante, para que alcance para todas.
  await correr("B1 procesarCola canal falso (BD + plantilla), 400 avisos", 400, { canales: { correo: falso }, limites: sinLimite, esperar: nada, presupuestoMs: 1 });
  // Con SMTP_POOL=true se mide el transporte con pool (conexiones reutilizadas) contra el SMTP nulo.
  await correr("B2 procesarCola SMTP nulo sin pausa, 400 avisos", 400, { canales: { correo: new EmailChannel() }, limites: sinLimite, esperar: nada, presupuestoMs: 1 });
  await correr("B3 procesarCola ritmo SES 14/s, 420 avisos", 420, { canales: { correo: new EmailChannel() }, limites: { limiteDiario: 1_000_000, porSegundo: 14 }, presupuestoMs: 1 });
  const enviados24h = await db.aviso.count({ where: { canal: "correo", enviadoAt: { gte: new Date(Date.now() - 86_400_000) } } });
  await correr(`B4 tope diario (quedan 25 de cupo; ventana 24 h con ${enviados24h} enviados)`, 100, {
    canales: { correo: falso }, limites: { limiteDiario: enviados24h + 25, porSegundo: 1_000_000 }, esperar: nada, presupuestoMs: 1,
  });
  console.log(`Pendientes al final: ${await pendientes()}`);
}

const tareas: Record<string, () => Promise<void>> = { lista, cola };
const tarea = tareas[process.argv[2]];
if (!tarea) {
  console.error("Uso: directo.ts <lista|cola>");
  process.exit(1);
}
tarea()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    cerrarTransporteCorreo(); // pool SMTP (SMTP_POOL=true): sin cerrar, el proceso no termina
    await db.$disconnect();
  });

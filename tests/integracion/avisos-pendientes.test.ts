// Reserva atómica de la cola, avisos al profesor, tareas a familias y alerta de rebote a dirección (specs/06, 08, 12).
// Crea su propio colegio (test-avisos2-<azar>) y lo borra al terminar.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { abrirConversacion, enviarMensaje } from "@/lib/server/mensajes";
import { ENVIANDO_MAX_MINUTOS, procesarCola } from "@/lib/server/notificaciones/cola";
import { cerrarTransporteCorreo } from "@/lib/server/notificaciones/email";
import { encolarAviso } from "@/lib/server/notificaciones/encolar";
import { procesarEventoSes } from "@/lib/server/notificaciones/ses";
import type { EnvioAviso, NotificationChannel } from "@/lib/server/notificaciones/tipos";
import { crearTarea } from "@/lib/server/tareas";
import { fechaLima, sumarDias } from "@/lib/fechas";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

const RAPIDO = { limiteDiario: 1_000_000, porSegundo: 1000 };
const sinEspera = async () => {};

/** Canal falso que registra lo enviado (con una pausa para que dos workers se crucen). */
function canalFalso(canal: "correo" | "push", enviados: EnvioAviso[]): NotificationChannel {
  return {
    canal,
    enviar: async (e) => {
      await new Promise((r) => setTimeout(r, 5));
      enviados.push(e);
      return { providerMessageId: `falso-${e.avisoId}` };
    },
  };
}

describe("avisos pendientes del MVP", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba({ plan: "pro", prefijo: "test-avisos2" });
  });
  afterAll(async () => {
    cerrarTransporteCorreo(); // el transporte es de módulo (pool con SES/Gmail): no dejar conexiones abiertas
    await c?.limpiar();
  });

  async function encolarComunicados(n: number) {
    for (let i = 0; i < n; i++) {
      await encolarAviso(c.db, {
        tenantId: c.tenant.id, tipo: "comunicado", canal: "correo", destinatario: `familia-${i}@test-avisos2.local`,
        plantilla: "comunicado", payload: { colegio: c.tenant.nombre, titulo: `Comunicado ${i}`, url: "http://c" },
      });
    }
  }

  it("dos workers en paralelo nunca envían la misma fila", async () => {
    await encolarComunicados(12);
    const enviados: EnvioAviso[] = [];
    const opciones = { tenantId: c.tenant.id, limites: RAPIDO, esperar: sinEspera, canales: { correo: canalFalso("correo", enviados) } };
    const [a, b] = await Promise.all([procesarCola(opciones), procesarCola(opciones)]);

    expect(a.enviados + b.enviados).toBe(12);
    expect(enviados).toHaveLength(12);
    expect(new Set(enviados.map((e) => e.avisoId)).size).toBe(12);
    expect(await c.db.aviso.count({ where: { estado: "enviado" } })).toBe(12);
    await c.db.aviso.deleteMany({});
  });

  it("devuelve a pendiente las filas atascadas en «enviando» y las envía; sin reintentos, error", async () => {
    const hace = new Date(Date.now() - (ENVIANDO_MAX_MINUTOS + 5) * 60_000);
    const base = {
      tenantId: c.tenant.id, tipo: "comunicado" as const, canal: "correo" as const, plantilla: "comunicado", asunto: "x",
      payload: { colegio: c.tenant.nombre, titulo: "Atascado", url: "http://c" }, estado: "enviando" as const, programadoPara: hace,
    };
    const atascado = await c.db.aviso.create({ data: { ...base, destinatario: "a@test-avisos2.local", intentos: 0 } });
    const agotado = await c.db.aviso.create({ data: { ...base, destinatario: "b@test-avisos2.local", intentos: 3 } });
    const reciente = await c.db.aviso.create({ data: { ...base, destinatario: "c@test-avisos2.local", programadoPara: new Date() } });

    const enviados: EnvioAviso[] = [];
    const opciones = { tenantId: c.tenant.id, limites: RAPIDO, esperar: sinEspera, canales: { correo: canalFalso("correo", enviados) } };
    const r = await procesarCola(opciones);
    expect(r.recuperados).toBe(2);
    expect(await c.db.aviso.findUniqueOrThrow({ where: { id: agotado.id } })).toMatchObject({ estado: "error", intentos: 4 });
    // Otro worker del colegio la está enviando ahora mismo: no se toca y este worker le deja el resto (uno por colegio).
    expect(await c.db.aviso.findUniqueOrThrow({ where: { id: reciente.id } })).toMatchObject({ estado: "enviando", intentos: 0 });
    expect(enviados).toEqual([]);
    expect(await c.db.aviso.findUniqueOrThrow({ where: { id: atascado.id } })).toMatchObject({ estado: "pendiente", intentos: 1 });
    // Cuando ese worker termina, el siguiente llamado envía la recuperada.
    await c.db.aviso.update({ where: { id: reciente.id }, data: { estado: "enviado", enviadoAt: new Date() } });
    await procesarCola(opciones);
    expect(enviados.map((e) => e.avisoId)).toEqual([atascado.id]);
    expect(await c.db.aviso.findUniqueOrThrow({ where: { id: atascado.id } })).toMatchObject({ estado: "enviado", intentos: 2 });
    await c.db.aviso.deleteMany({});
  });

  it("avisa al profesor cuando la familia escribe (bandeja + push, sin correo; máx. 1 cada 15 min) y la familia sigue con su límite", async () => {
    const endpoint = `https://push.test-avisos2.local/${c.tenant.id}`;
    await db.pushSuscripcion.create({ data: { userId: c.miembros.tutora.user.id, endpoint, p256dh: "p".repeat(20), auth: "a".repeat(10) } });
    const madre = c.ctxDe("madre");
    const convId = await abrirConversacion(madre, { alumnoId: c.alumnos.mateo.id, contraparteId: c.miembros.tutora.membership.id });

    await enviarMensaje(madre, { conversacionId: convId, cuerpo: "Hola, Mateo llegará tarde." });
    await enviarMensaje(madre, { conversacionId: convId, cuerpo: "Gracias." });
    const alProfesor = await c.db.aviso.findMany({ where: { plantilla: "mensaje_nuevo", apoderadoId: null }, orderBy: { canal: "asc" } });
    expect(alProfesor.map((a) => [a.canal, a.destinatario])).toEqual([["push", endpoint]]);
    expect(alProfesor.every((a) => a.tipo === "mensaje" && a.referenciaId === convId && a.notificacionId)).toBe(true);
    expect(alProfesor[0].payload).toMatchObject({ remitente: "Rosa Prueba", alumno: "Mateo Quispe" });
    expect(await c.db.notificacion.count({ where: { membershipId: c.miembros.tutora.membership.id, tipo: "mensaje" } })).toBe(1);

    await enviarMensaje(c.ctxDe("tutora"), { conversacionId: convId, cuerpo: "Gracias por avisar." });
    await enviarMensaje(c.ctxDe("tutora"), { conversacionId: convId, cuerpo: "Lo esperamos." });
    // La madre no tiene dispositivos: la notificación queda en su bandeja (una sola) y no hay correo.
    expect(await c.db.aviso.count({ where: { plantilla: "mensaje_nuevo", apoderadoId: c.miembros.madre.membership.id } })).toBe(0);
    const aFamilia = await c.db.notificacion.findMany({ where: { membershipId: c.miembros.madre.membership.id, tipo: "mensaje" } });
    expect(aFamilia).toHaveLength(1);
    expect(aFamilia[0]).toMatchObject({ url: `/mensajes/${convId}`, alumnoId: c.alumnos.mateo.id, cuerpo: "Lucia Prueba te escribió sobre Mateo Quispe." });

    // El push al profesor abre la notificación de su bandeja.
    const enviados: EnvioAviso[] = [];
    await procesarCola({ tenantId: c.tenant.id, limites: RAPIDO, esperar: sinEspera, canales: { correo: canalFalso("correo", enviados), push: canalFalso("push", enviados) } });
    expect(enviados).toHaveLength(1);
    expect(enviados[0].mensaje.push.url).toMatch(/\/notificaciones\/[0-9a-f-]+\/abrir$/);
    await db.pushSuscripcion.deleteMany({ where: { endpoint } });
    await c.db.aviso.deleteMany({});
  });

  it("avisa de una tarea nueva solo si el profesor lo pide: bandeja por familia, push con consentimiento, sin correo, una vez", async () => {
    const fecha = sumarDias(fechaLima(new Date()), 3);
    const tutora = c.ctxDe("tutora");
    expect(await crearTarea(tutora, { cursoId: c.cursoTutora.id, titulo: "Sin aviso", fechaEntrega: fecha })).toMatchObject({ ok: true });
    expect(await c.db.aviso.count()).toBe(0);
    expect(await c.db.notificacion.count({ where: { tipo: "tarea" } })).toBe(0);

    const endpoint = `https://push.test-avisos2.local/madre-${c.tenant.id}`;
    await db.pushSuscripcion.create({ data: { userId: c.miembros.madre.user.id, endpoint, p256dh: "p".repeat(20), auth: "a".repeat(10) } });
    expect(await crearTarea(tutora, { cursoId: c.cursoTutora.id, titulo: "Fichas de fracciones", fechaEntrega: fecha, avisarFamilias: true })).toMatchObject({ ok: true });
    const tarea = await c.db.tarea.findFirstOrThrow({ where: { titulo: "Fichas de fracciones" } });
    const avisos = await c.db.aviso.findMany({ where: { plantilla: "tarea_nueva" } });
    // Solo push y solo a la madre de Mateo: el padre de Valentina revocó su consentimiento (lo ve en su bandeja).
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ tipo: "tarea", canal: "push", destinatario: endpoint, apoderadoId: c.miembros.madre.membership.id, referenciaId: tarea.id });
    expect(avisos[0].payload).toMatchObject({ alumno: "Mateo", curso: "Matemática", titulo: "Fichas de fracciones", fechaEntrega: fecha });
    expect(avisos[0].asunto).toBe("Nueva tarea de Matemática");
    const notifs = await c.db.notificacion.findMany({ where: { tipo: "tarea", clave: `tarea:${tarea.id}` } });
    expect(new Set(notifs.map((n) => n.membershipId))).toEqual(new Set([c.miembros.madre.membership.id, c.miembros.padreSinConsentimiento.membership.id]));
    await db.pushSuscripcion.deleteMany({ where: { endpoint } });
    await c.db.aviso.deleteMany({});
  });

  it("un rebote permanente avisa a dirección una sola vez por día y por apoderado", async () => {
    const madreId = c.miembros.madre.membership.id;
    const crearEnviado = (i: number) =>
      c.db.aviso.create({
        data: {
          tenantId: c.tenant.id, tipo: "comunicado", canal: "correo", destinatario: c.miembros.madre.user.email, plantilla: "comunicado",
          asunto: "x", estado: "enviado", apoderadoId: madreId, providerMessageId: `rebote-${c.tenant.id}-${i}`,
        },
      });
    const [uno, dos] = await Promise.all([crearEnviado(1), crearEnviado(2)]);

    expect(await procesarEventoSes({ eventType: "Bounce", bounce: { bounceType: "Permanent" }, mail: { messageId: uno.providerMessageId! } })).toBe("rebotado");
    expect(await procesarEventoSes({ eventType: "Complaint", mail: { messageId: dos.providerMessageId! } })).toBe("queja");

    const alertas = await c.db.aviso.findMany({ where: { plantilla: "alerta_rebote" } });
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatchObject({
      tipo: "alerta_direccion", canal: "correo", destinatario: c.miembros.direccion.user.email, referenciaId: madreId, apoderadoId: null,
    });
    expect(alertas[0].payload).toMatchObject({ apoderado: "Rosa Prueba", alumnos: ["Mateo"] });
    expect(alertas[0].asunto).toBe("Correo desactivado: Rosa Prueba");
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardarLista } from "@/lib/server/asistencia";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { encolarAviso } from "@/lib/server/notificaciones/encolar";
import { procesarEventoSes } from "@/lib/server/notificaciones/ses";
import type { NotificationChannel } from "@/lib/server/notificaciones/tipos";
import { crearColegioPrueba, correosPara, cuerpoCorreo, type ColegioPrueba } from "./ayudantes/colegio-prueba";

const RAPIDO = { limiteDiario: 1_000_000, porSegundo: 100 };

describe("cola de avisos → Mailpit", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba();
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  it("envía el aviso de falta firmado por el colegio, con el enlace para justificar", async () => {
    await guardarLista(c.ctxDe("tutora"), {
      salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "falta" }],
    });
    const resumen = await procesarCola({ tenantId: c.tenant.id, limites: RAPIDO });
    expect(resumen.enviados).toBe(1);

    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_falta" } });
    expect(aviso.estado).toBe("enviado");
    expect(aviso.providerMessageId).toBeTruthy();
    expect(aviso.enviadoAt).toBeInstanceOf(Date);

    const [correo] = await correosPara(c.miembros.madre.user.email);
    expect(correo).toBeDefined();
    expect(correo.From).toEqual({ Name: c.tenant.nombre, Address: process.env.EMAIL_FROM_ADDRESS });
    expect(correo.Subject).toBe("Mateo no llegó hoy");
    const cuerpo = await cuerpoCorreo(correo.ID);
    expect(cuerpo.Text).toContain("Mateo no llegó hoy a la 1.ª hora. Si ya lo sabías, puedes justificar la falta.");
    expect(cuerpo.Text).toMatch(/Justificar falta: http:\/\/[^\s]+\/justificar\/[A-Za-z0-9_-]{43}/);
    expect(cuerpo.HTML).toContain("Justificar falta</a>");
  });

  it("no pasa el tope diario: sin cupo, el aviso queda pendiente", async () => {
    await encolarAviso(c.db, {
      tenantId: c.tenant.id, tipo: "comunicado", canal: "correo", destinatario: c.miembros.madre.user.email,
      plantilla: "comunicado", payload: { colegio: c.tenant.nombre, titulo: "Prueba de tope", url: "http://x" },
      apoderadoId: c.miembros.madre.membership.id,
    });
    const r = await procesarCola({ tenantId: c.tenant.id, limites: { limiteDiario: 0, porSegundo: 100 } });
    expect(r).toMatchObject({ enviados: 0, diferidos: 1 });
    expect((await c.db.aviso.findFirstOrThrow({ where: { plantilla: "comunicado" } })).estado).toBe("pendiente");
  });

  it("reintenta con espera creciente y marca error tras 3 reintentos", async () => {
    const fallido: NotificationChannel = { canal: "correo", enviar: async () => Promise.reject(new Error("SMTP caído")) };
    const id = (await c.db.aviso.findFirstOrThrow({ where: { plantilla: "comunicado" } })).id;
    let ahora = new Date();
    for (let i = 1; i <= 4; i++) {
      await procesarCola({ tenantId: c.tenant.id, limites: RAPIDO, canales: { correo: fallido }, ahora });
      const aviso = await c.db.aviso.findUniqueOrThrow({ where: { id } });
      expect(aviso.intentos).toBe(i);
      expect(aviso.estado).toBe(i < 4 ? "pendiente" : "error");
      ahora = new Date(aviso.programadoPara.getTime() + 1000);
    }
  });

  it("una plantilla desconocida queda en error sin reintentos", async () => {
    const aviso = await c.db.aviso.create({
      data: { tenantId: c.tenant.id, tipo: "comunicado", canal: "correo", destinatario: "x@test-basico.local", plantilla: "no_existe", asunto: "x" },
    });
    await procesarCola({ tenantId: c.tenant.id, limites: RAPIDO });
    expect(await c.db.aviso.findUniqueOrThrow({ where: { id: aviso.id } })).toMatchObject({ estado: "error", intentos: 1 });
  });

  it("los eventos de SES actualizan el estado y un rebote permanente desactiva los avisos", async () => {
    const aviso = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "asistencia_falta" } });
    const mail = { messageId: "ses-123", commonHeaders: { messageId: aviso.providerMessageId! } };
    expect(await procesarEventoSes({ eventType: "Delivery", mail })).toBe("entregado");
    expect(await procesarEventoSes({ eventType: "Open", mail })).toBe("abierto");
    expect(await procesarEventoSes({ eventType: "Delivery", mail })).toBe("abierto"); // no retrocede
    const actualizado = await c.db.aviso.findUniqueOrThrow({ where: { id: aviso.id } });
    expect(actualizado.abiertoAt).toBeInstanceOf(Date);

    expect(await procesarEventoSes({ eventType: "Bounce", bounce: { bounceType: "Permanent" }, mail: { headers: [{ name: "X-Khipu-Aviso", value: aviso.id }] } })).toBe("rebotado");
    const vinculo = await c.db.apoderadoAlumno.findFirstOrThrow({ where: { apoderadoId: c.miembros.madre.membership.id } });
    expect(vinculo.recibeAvisos).toBe(false);
  });
});

describe("resumen de llegadas (solo excepciones)", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba({ modoAvisos: "solo_excepciones" });
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  it("agrupa las llegadas en un correo por familia desde la hora de envío, una sola vez al día", async () => {
    // Fechas fijas: 20/10/2026 a las 07:50 de Lima (12:50 UTC).
    const llegada = new Date("2026-10-20T12:50:00Z");
    await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }] }, llegada);
    expect(await c.db.aviso.count()).toBe(0);

    const antes = await procesarCola({ tenantId: c.tenant.id, limites: RAPIDO, ahora: new Date("2026-10-20T13:30:00Z") }); // 08:30
    expect(antes.resumenes).toBe(0);
    const despues = await procesarCola({ tenantId: c.tenant.id, limites: RAPIDO, ahora: new Date("2026-10-20T14:05:00Z") }); // 09:05
    expect(despues.resumenes).toBe(1);
    const resumen = await c.db.aviso.findFirstOrThrow({ where: { plantilla: "resumen_llegadas" } });
    expect(resumen.payload).toMatchObject({ fecha: "2026-10-20", llegadas: [{ alumno: "Mateo", hora: "07:50" }] });
    const otraVez = await procesarCola({ tenantId: c.tenant.id, limites: RAPIDO, ahora: new Date("2026-10-20T20:00:00Z") });
    expect(otraVez.resumenes).toBe(0);
  });
});

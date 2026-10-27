import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fechaDb, momentoEnZona } from "@/lib/fechas";
import { guardarLista } from "@/lib/server/asistencia";
import { actualizarConfiguracion } from "@/lib/server/configuracion";
import { generarCarnetsSalon, registrarLlegadaPorQr, urlDeCarnet } from "@/lib/server/porteria";
import { resumenAvisosHoy } from "@/lib/server/resumen-direccion";
import { crearColegioPrueba, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("día a día: plazo de justificación, registros sin conexión y avisos de hoy", () => {
  let c: ColegioPrueba;
  beforeAll(async () => {
    c = await crearColegioPrueba();
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  const falta = (alumnoId: string, extra: object = {}) => ({ salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId, estado: "falta" as const }], ...extra });

  it("el enlace de justificar vence a las 48 h por defecto", async () => {
    const antes = Date.now();
    await guardarLista(c.ctxDe("tutora"), falta(c.alumnos.mateo.id));
    const token = await c.db.justificacionToken.findFirstOrThrow();
    const horas = (token.expiraAt.getTime() - antes) / 3_600_000;
    expect(horas).toBeGreaterThan(47.9);
    expect(horas).toBeLessThan(48.1);
  });

  it("el plazo lo configura dirección (24 a 168 h) y el enlace nuevo lo respeta", async () => {
    await expect(actualizarConfiguracion(c.ctxDe("direccion"), { ...datosConfig(c), plazoJustificacionHoras: 12 })).rejects.toThrow(/24 a 168/);
    await actualizarConfiguracion(c.ctxDe("direccion"), { ...datosConfig(c), plazoJustificacionHoras: 72 });
    const tenant = await c.db.tenant.findUniqueOrThrow({ where: { id: c.tenant.id } });
    expect(tenant.plazoJustificacionHoras).toBe(72);

    const ctx = { ...c.ctxDe("tutora"), tenant };
    const antes = Date.now();
    await guardarLista(ctx, falta(c.alumnos.mateo.id, { ambito: c.cursoTutora.id }));
    const tokens = await c.db.justificacionToken.findMany({ orderBy: { expiraAt: "desc" } });
    expect((tokens[0].expiraAt.getTime() - antes) / 3_600_000).toBeGreaterThan(71.9);
  });

  it("una lista guardada sin conexión usa la hora real del registro y es idempotente", async () => {
    const hace2h = new Date(Date.now() - 2 * 3_600_000);
    const entrada = {
      salonId: c.salon.id, ambito: c.cursoTutora.id,
      registros: [{ alumnoId: c.alumnos.valentina.id, estado: "tarde" as const }],
      registradoAt: hace2h.toISOString(),
    };
    const local = momentoEnZona(hace2h, c.tenant.zonaHoraria);
    const r1 = await guardarLista(c.ctxDe("tutora"), entrada);
    expect(r1).toMatchObject({ cambios: 1, omitidos: 0 });
    const fila = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.valentina.id, ambito: c.cursoTutora.id } });
    expect(fila.hora).toBe(local.hora);
    expect(fila.fecha).toEqual(fechaDb(local.isoFecha));

    const r2 = await guardarLista(c.ctxDe("tutora"), entrada);
    // Reenviar lo mismo no cambia nada ni avisa otra vez (el servidor ya tiene un cambio posterior a esa hora).
    expect(r2).toMatchObject({ cambios: 0, familiasAvisadas: 0 });
    expect(await c.db.asistencia.count({ where: { alumnoId: c.alumnos.valentina.id, ambito: c.cursoTutora.id } })).toBe(1);
  });

  it("un registro más reciente en el servidor no se pisa con una lista vieja enviada sin conexión", async () => {
    const hace1h = new Date(Date.now() - 3_600_000).toISOString();
    const base = { salonId: c.salon.id, ambito: "dia" };
    // Valentina quedó «llegó» en el servidor ahora mismo; la lista offline (de hace 1 h) decía «falta».
    await guardarLista(c.ctxDe("tutora"), { ...base, registros: [{ alumnoId: c.alumnos.valentina.id, estado: "llego" }] });
    const r = await guardarLista(c.ctxDe("tutora"), { ...base, registros: [{ alumnoId: c.alumnos.valentina.id, estado: "falta" }], registradoAt: hace1h });
    expect(r).toMatchObject({ cambios: 0, omitidos: 1 });
    const fila = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.valentina.id, ambito: "dia" } });
    expect(fila.estado).toBe("llego");
  });

  it("una hora del dispositivo futura o muy vieja se ignora", async () => {
    const lejos = new Date(Date.now() + 3 * 3_600_000).toISOString();
    const base = { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "problema" as const }] };
    await guardarLista(c.ctxDe("tutora"), { ...base, registradoAt: lejos });
    const fila = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.mateo.id, ambito: "dia" } });
    expect(fila.fecha).toEqual(fechaDb(momentoEnZona(new Date(), c.tenant.zonaHoraria).isoFecha));
  });

  it("portería: el escaneo guardado sin conexión se registra con su hora real y no duplica", async () => {
    await generarCarnetsSalon(c.ctxDe("direccion"), c.salon.id);
    const carnet = await c.db.carnetQr.findFirstOrThrow({ where: { alumnoId: c.alumnos.valentina.id, activo: true } });
    const qr = urlDeCarnet(carnet.id);
    const ahora = new Date("2026-10-21T13:30:00Z"); // 08:30 en Lima: por reloj del servidor sería tarde
    const leidoAt = "2026-10-21T12:50:00.000Z"; // 07:50 en Lima
    const r = await registrarLlegadaPorQr(c.ctxDe("porteria"), qr, ahora, leidoAt);
    expect(r).toMatchObject({ ok: true, tipo: "registrado", estado: "llego", hora: "07:50" });
    const otra = await registrarLlegadaPorQr(c.ctxDe("porteria"), qr, new Date("2026-10-21T13:40:00Z"), leidoAt);
    expect(otra).toMatchObject({ ok: true, tipo: "ya-registrado" });
  });

  it("resumen de avisos de hoy: enviados, abiertos y con error", async () => {
    const base = { tenantId: c.tenant.id, tipo: "asistencia" as const, canal: "correo" as const, destinatario: "x@test-basico.local", asunto: "Prueba", plantilla: "asistencia_llego" };
    await c.db.aviso.createMany({
      data: [
        { ...base, estado: "enviado", enviadoAt: new Date() },
        { ...base, estado: "abierto", enviadoAt: new Date(), abiertoAt: new Date() },
        { ...base, estado: "error", error: "SMTP" },
      ],
    });
    const r = await resumenAvisosHoy(c.ctxDe("direccion"));
    expect(r.abiertos).toBeGreaterThanOrEqual(1);
    expect(r.conError).toBeGreaterThanOrEqual(1);
    expect(r.enviados).toBeGreaterThanOrEqual(2);
  });
});

function datosConfig(c: ColegioPrueba) {
  return {
    horaEnvioAvisos: c.tenant.horaEnvioAvisos, horaLimiteTardanza: c.tenant.horaLimiteTardanza,
    modoAvisos: c.tenant.modoAvisos as "todos", escalaCalificacion: c.tenant.escalaCalificacion as "literal", emailDomains: "",
  };
}

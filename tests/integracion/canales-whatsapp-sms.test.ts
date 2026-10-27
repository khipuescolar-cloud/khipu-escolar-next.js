import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/server/db";
import { actualizarCanalesPago, guardarTelefonoPerfil, obtenerOpcionesCanalesPago } from "@/lib/server/notificaciones/canales-pago";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { encolarAvisoFamilia } from "@/lib/server/notificaciones/avisos-familia";
import { encolarAvisosAsistencia } from "@/lib/server/notificaciones/encolar";
import { guardarPreferencias } from "@/lib/server/notificaciones/preferencias";
import { SmsChannel } from "@/lib/server/notificaciones/sms";
import { aplicarEstadosWhatsapp, extraerEstadosWhatsapp } from "@/lib/server/notificaciones/whatsapp-webhook";
import { WhatsAppChannel } from "@/lib/server/notificaciones/whatsapp";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

const RAPIDO = { limiteDiario: 1_000_000, porSegundo: 100 };
const ENTORNO_WA = { WHATSAPP_TOKEN: "t", WHATSAPP_PHONE_NUMBER_ID: "99" };
const ENTORNO_SMS = { SMS_PROVEEDOR: "twilio", TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "x", TWILIO_FROM: "+15005550006" };
const CLAVES = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "SMS_PROVEEDOR", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"];
const ok = (cuerpo: unknown) => Promise.resolve(new Response(JSON.stringify(cuerpo), { status: 200 }));

function conCredenciales(activas: boolean) {
  for (const k of CLAVES) delete process.env[k];
  if (activas) Object.assign(process.env, ENTORNO_WA, ENTORNO_SMS);
}

describe("WhatsApp y SMS: encolado y worker", () => {
  let c: ColegioPrueba;
  const sufijo = randomUUID().slice(0, 6);
  const tenantDe = () => ({ id: c.tenant.id, nombre: c.tenant.nombre });
  let dia = 0;
  /** Asistencia real (el aviso la referencia) de un día distinto cada vez. */
  const asistencia = async (estado: "tarde" | "problema") =>
    c.db.asistencia.create({
      data: {
        tenantId: c.tenant.id, alumnoId: c.alumnos.mateo.id, ambito: "dia", fecha: new Date(Date.UTC(2026, 0, 1 + dia++)), hora: "08:20",
        estado, registradoPorId: c.miembros.tutora.membership.id,
      },
    });
  const falta = async () => {
    const a = await asistencia("tarde");
    return encolarAvisosAsistencia(c.db, { tenant: tenantDe(), asistencia: { id: a.id, alumnoId: a.alumnoId, fecha: a.fecha, estado: "tarde", hora: "08:20", nota: null }, alumnoNombre: "Mateo", momento: "a la 1.ª hora" });
  };
  const filas = (canal: "whatsapp" | "sms") => c.db.aviso.findMany({ where: { canal } });
  const limpiarAvisos = () => c.db.aviso.deleteMany({});

  beforeAll(async () => {
    c = await crearColegioPrueba({ prefijo: `test-pago-${sufijo}` });
  });
  afterEach(async () => {
    await limpiarAvisos();
    conCredenciales(false);
    await db.tenant.update({ where: { id: c.tenant.id }, data: { whatsappActivo: false, smsActivo: false } });
    await db.preferenciaAviso.deleteMany({ where: { tenantId: c.tenant.id } });
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  async function preparar({ whatsappActivo, smsActivo, whatsapp, sms, telefono, credenciales = true }: { whatsappActivo: boolean; smsActivo: boolean; whatsapp: boolean; sms: boolean; telefono: string | null; credenciales?: boolean }) {
    await db.tenant.update({ where: { id: c.tenant.id }, data: { whatsappActivo, smsActivo } });
    c.tenant.whatsappActivo = whatsappActivo;
    c.tenant.smsActivo = smsActivo;
    await db.profile.update({ where: { id: c.miembros.madre.user.id }, data: { telefono } });
    await guardarPreferencias(c.ctxDe("madre"), { correo: true, push: true, whatsapp, sms });
    conCredenciales(credenciales);
  }

  it("por defecto (colegio apagado) no encola WhatsApp ni SMS aunque la familia los pida", async () => {
    await preparar({ whatsappActivo: false, smsActivo: false, whatsapp: true, sms: true, telefono: "987 654 321" });
    expect(await falta()).toBe(1);
    expect(await filas("whatsapp")).toHaveLength(0);
    expect(await filas("sms")).toHaveLength(0);
    expect(await c.db.aviso.count({ where: { canal: "correo" } })).toBe(1);
  });

  it("colegio activo + preferencia + celular válido: encola una fila por canal con el teléfono E.164", async () => {
    await preparar({ whatsappActivo: true, smsActivo: true, whatsapp: true, sms: true, telefono: "987 654 321" });
    await falta();
    const [wa] = await filas("whatsapp");
    const [sms] = await filas("sms");
    expect(wa).toMatchObject({ destinatario: "+51987654321", plantilla: "asistencia_tarde", estado: "pendiente", apoderadoId: c.miembros.madre.membership.id });
    expect(sms).toMatchObject({ destinatario: "+51987654321", plantilla: "asistencia_tarde" });
  });

  it("no encola si la familia no lo eligió, si no hay celular válido o si la plantilla no existe en ese canal", async () => {
    await preparar({ whatsappActivo: true, smsActivo: true, whatsapp: false, sms: false, telefono: "987654321" });
    await falta();
    expect(await filas("whatsapp")).toHaveLength(0);

    await preparar({ whatsappActivo: true, smsActivo: true, whatsapp: true, sms: true, telefono: "12345" });
    await falta();
    expect(await filas("whatsapp")).toHaveLength(0);
    expect(await filas("sms")).toHaveLength(0);

    await preparar({ whatsappActivo: true, smsActivo: false, whatsapp: true, sms: true, telefono: "987654321" });
    await falta();
    expect(await filas("whatsapp")).toHaveLength(1);
    expect(await filas("sms")).toHaveLength(0); // el colegio no activó SMS
    await limpiarAvisos();
    const problema = await asistencia("problema");
    await encolarAvisosAsistencia(c.db, {
      tenant: tenantDe(),
      asistencia: { id: problema.id, alumnoId: problema.alumnoId, fecha: problema.fecha, estado: "problema", hora: "08:20", nota: null },
      alumnoNombre: "Mateo", momento: "a la 1.ª hora",
    });
    expect(await filas("whatsapp")).toHaveLength(0); // asistencia_problema no tiene plantilla de WhatsApp
  });

  it("sin credenciales en el servidor no se encola (se registra en el log)", async () => {
    const aviso = vi.spyOn(console, "warn").mockImplementation(() => {});
    await preparar({ whatsappActivo: true, smsActivo: true, whatsapp: true, sms: true, telefono: "987654321", credenciales: false });
    await falta();
    expect(await filas("whatsapp")).toHaveLength(0);
    expect(await filas("sms")).toHaveLength(0);
    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });

  it("comunicado por WhatsApp (flujo de avisos-familia) y solo WhatsApp sin correo ni push", async () => {
    await preparar({ whatsappActivo: true, smsActivo: false, whatsapp: true, sms: false, telefono: "987654321" });
    await guardarPreferencias(c.ctxDe("madre"), { correo: false, push: false, whatsapp: true });
    const encolado = await encolarAvisoFamilia(c.ctxDe("madre"), {
      plantilla: "comunicado", apoderadoId: c.miembros.madre.membership.id, referenciaId: randomUUID(),
      payload: { colegio: c.tenant.nombre, titulo: "Paseo", url: "http://x" },
    });
    expect(encolado).toBe(true);
    expect(await c.db.aviso.count({ where: { canal: "correo" } })).toBe(0);
    expect((await filas("whatsapp"))[0]).toMatchObject({ plantilla: "comunicado", destinatario: "+51987654321" });
  });

  it("el worker envía con proveedor simulado, guarda el id del mensaje y luego el webhook lo marca entregado y leído", async () => {
    await preparar({ whatsappActivo: true, smsActivo: true, whatsapp: true, sms: true, telefono: "987654321" });
    await falta();
    const peticion = vi.fn(() => ok({ messages: [{ id: `wamid.${sufijo}` }], sid: `SM${sufijo}` }));
    const r = await procesarCola({
      tenantId: c.tenant.id, limites: RAPIDO,
      canales: {
        whatsapp: new WhatsAppChannel(ENTORNO_WA, peticion as unknown as typeof fetch),
        sms: new SmsChannel(ENTORNO_SMS, peticion as unknown as typeof fetch),
        correo: { canal: "correo", enviar: async () => ({}) },
        push: { canal: "push", enviar: async () => ({}) },
      },
    });
    expect(r.enviados).toBe(3);
    const [wa] = await filas("whatsapp");
    expect(wa).toMatchObject({ estado: "enviado", providerMessageId: `wamid.${sufijo}` });
    expect((await filas("sms"))[0]).toMatchObject({ estado: "enviado", providerMessageId: `SM${sufijo}` });
    const llamadaWa = (peticion.mock.calls as unknown as [string, RequestInit][]).find(([u]) => u.includes("graph.facebook.com"))!;
    expect(JSON.parse(llamadaWa[1].body as string).template.components[0].parameters[0].text).toBe("Mateo");

    const estados = (status: string, extra = {}) => extraerEstadosWhatsapp({ entry: [{ changes: [{ value: { statuses: [{ id: `wamid.${sufijo}`, status, timestamp: "1790000000", ...extra }] } }] }] });
    expect(await aplicarEstadosWhatsapp(estados("delivered"))).toBe(1);
    expect((await filas("whatsapp"))[0].estado).toBe("entregado");
    expect(await aplicarEstadosWhatsapp(estados("read"))).toBe(1);
    const leido = (await filas("whatsapp"))[0];
    expect(leido.estado).toBe("abierto");
    expect(leido.abiertoAt).toBeInstanceOf(Date);
    // Un «entregado» tardío no hace retroceder el estado.
    expect(await aplicarEstadosWhatsapp(estados("delivered"))).toBe(0);
    expect((await filas("whatsapp"))[0].estado).toBe("abierto");
    // Un fallo tardío tras «leído» tampoco lo cambia.
    expect(await aplicarEstadosWhatsapp(estados("failed", { errors: [{ code: 131026, title: "No entregable" }] }))).toBe(0);
    expect((await filas("whatsapp"))[0].estado).toBe("abierto");
  });

  it("webhook: un fallo marca el aviso con error", async () => {
    await preparar({ whatsappActivo: true, smsActivo: false, whatsapp: true, sms: false, telefono: "987654321" });
    await falta();
    await c.db.aviso.updateMany({ where: { canal: "whatsapp" }, data: { estado: "enviado", providerMessageId: `wamid.f${sufijo}` } });
    await aplicarEstadosWhatsapp(extraerEstadosWhatsapp({ entry: [{ changes: [{ value: { statuses: [{ id: `wamid.f${sufijo}`, status: "failed", errors: [{ code: 131026, title: "No entregable" }] }] } }] }] }));
    expect((await filas("whatsapp"))[0]).toMatchObject({ estado: "error", error: "WhatsApp: No entregable (código 131026)" });
  });

  it("el worker sin credenciales deja la fila en omitido con motivo claro y no la reintenta", async () => {
    await preparar({ whatsappActivo: true, smsActivo: false, whatsapp: true, sms: false, telefono: "987654321" });
    await falta();
    conCredenciales(false); // las credenciales desaparecen después de encolar
    const r = await procesarCola({ tenantId: c.tenant.id, limites: RAPIDO, canales: { whatsapp: new WhatsAppChannel({}, vi.fn() as unknown as typeof fetch), correo: { canal: "correo", enviar: async () => ({}) }, push: { canal: "push", enviar: async () => ({}) } } });
    expect(r.omitidos).toBe(1);
    const [wa] = await filas("whatsapp");
    expect(wa.estado).toBe("omitido");
    expect(wa.error).toContain("sin credenciales");
    expect(wa.intentos).toBe(1);
  });

  it("respeta el tope diario propio del canal: lo que excede queda pendiente", async () => {
    await preparar({ whatsappActivo: true, smsActivo: true, whatsapp: true, sms: true, telefono: "987654321" });
    await falta();
    await falta();
    const peticion = vi.fn(() => ok({ messages: [{ id: `w${randomUUID()}` }], sid: `S${randomUUID()}` }));
    const canales = {
      whatsapp: new WhatsAppChannel(ENTORNO_WA, peticion as unknown as typeof fetch),
      sms: new SmsChannel(ENTORNO_SMS, peticion as unknown as typeof fetch),
      correo: { canal: "correo" as const, enviar: async () => ({}) },
      push: { canal: "push" as const, enviar: async () => ({}) },
    };
    const r = await procesarCola({ tenantId: c.tenant.id, limites: RAPIDO, limitesPago: { whatsapp: 1, sms: 0 }, canales });
    // 2 correos + 1 WhatsApp enviados; 1 WhatsApp y 2 SMS diferidos.
    expect(r).toMatchObject({ enviados: 3, diferidos: 3 });
    expect(await c.db.aviso.count({ where: { canal: "whatsapp", estado: "pendiente" } })).toBe(1);
    expect(await c.db.aviso.count({ where: { canal: "sms", estado: "pendiente" } })).toBe(2);
  });

  it("configuración: solo dirección activa los canales; preferencias y celular del perfil", async () => {
    await esperarProhibido(actualizarCanalesPago(c.ctxDe("madre"), { whatsappActivo: true, smsActivo: false }));
    await actualizarCanalesPago(c.ctxDe("direccion"), { whatsappActivo: true, smsActivo: false });
    expect(await db.tenant.findUniqueOrThrow({ where: { id: c.tenant.id } })).toMatchObject({ whatsappActivo: true, smsActivo: false });

    await db.profile.update({ where: { id: c.miembros.madre.user.id }, data: { telefono: null } });
    expect((await obtenerOpcionesCanalesPago(c.ctxDe("madre"))).telefono).toBeNull();
    expect(await guardarTelefonoPerfil(c.ctxDe("madre"), "987 654 321")).toBe("+51987654321");
    expect(await obtenerOpcionesCanalesPago(c.ctxDe("madre"))).toMatchObject({ whatsappActivo: true, smsActivo: false, telefono: "+51987654321", whatsapp: false });
    await expect(guardarTelefonoPerfil(c.ctxDe("madre"), "123")).rejects.toThrow(/celular de Perú/);
    expect(await guardarTelefonoPerfil(c.ctxDe("madre"), "  ")).toBeNull();

    // Sin enviar whatsapp/sms se conserva lo guardado.
    await guardarPreferencias(c.ctxDe("madre"), { correo: true, push: true, whatsapp: true });
    await guardarPreferencias(c.ctxDe("madre"), { correo: false, push: true });
    expect(await obtenerOpcionesCanalesPago(c.ctxDe("madre"))).toMatchObject({ whatsapp: true });
  });
});


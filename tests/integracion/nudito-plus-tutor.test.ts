// Nudito+ · tutor (specs/29). Requiere la BD local. Crea sus propios colegios `test-nudito-*` y los borra al terminar.
import { randomUUID } from "node:crypto";
import { asignarTareasSinDestinos } from "../../prisma/seed-tareas-destinos";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Membership, Profile } from "@/generated/prisma/client";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import { db, dbTenant } from "@/lib/server/db";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { aJson, exportarColegio, tablasExportadas } from "@/lib/server/exportar";
import { evaluarAccesoNuditoPlus, requireNuditoPlus } from "@/lib/server/nudito-plus/acceso";
import { datosDelAlumno } from "@/lib/server/nudito-plus/contexto";
import { conversar, listarConversacionesNudito, MENSAJE_MUY_RAPIDO, MENSAJE_PROVEEDOR_CAIDO, mensajesDeConversacion } from "@/lib/server/nudito-plus/conversar";
import { consentimientoActual, sitiosPermitidos } from "@/lib/server/nudito-plus/licencias";
import type { ProveedorIA } from "@/lib/server/nudito-plus/proveedor";
import { generarResumenAlumno } from "@/lib/server/nudito-plus/resumenes";
import { dominioPermitido } from "@/lib/server/nudito-plus/seguridad";
import { MENSAJE_TOPE, mesLima } from "@/lib/server/nudito-plus/uso";
import type { TenantContext } from "@/lib/server/tenant";
import { fechaLima, sumarDias } from "@/lib/fechas";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

// Nudito+ está apagado en el producto (NUDITO_PLUS_DISPONIBLE = false): solo en tests se fuerza para seguir validando su lógica.
vi.stubEnv("KHIPU_TEST_NUDITO_PLUS", "1");
afterAll(() => vi.unstubAllEnvs());

let c: ColegioPrueba;
let base: ColegioPrueba;
let cuentaThiago: { user: Profile; membership: Membership };
const sufijo = randomUUID().slice(0, 8);
const dominioPrueba = `test-${sufijo}.edu.pe`;
const ADMIN = "00000000-0000-0000-0000-000000000000";

function ctxAlumno(): TenantContext {
  return { tenant: c.tenant, user: cuentaThiago.user, membership: cuentaThiago.membership, rol: "alumno", roles: ["alumno"], db: dbTenant(c.tenant.id), ...accesoModulosDeCodigo("pro") };
}

async function darLicencia(alumnoId: string, conConsentimiento = true) {
  const hoy = fechaLima(new Date());
  await db.licenciaNudito.create({ data: { tenantId: c.tenant.id, alumnoId, origen: "prueba", desde: new Date(`${sumarDias(hoy, -1)}T00:00:00Z`), hasta: new Date(`${sumarDias(hoy, 29)}T00:00:00Z`), registradaPorId: ADMIN } });
  if (conConsentimiento) await db.consentimientoIa.create({ data: { tenantId: c.tenant.id, apoderadoId: c.miembros.madre.membership.id, alumnoId, versionTexto: (await consentimientoActual()).version } });
}

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito" });
  base = await crearColegioPrueba({ plan: "base", prefijo: "test-nudito-base" });
  await db.sitioPermitido.create({ data: { dominio: dominioPrueba, nombre: "Sitio de prueba", creadoPorId: ADMIN } });
  // Thiago (5.° A) tiene cuenta propia; Rosa (madre) es apoderada de Mateo (3.° B, sin cuenta) y también de Thiago.
  const id = randomUUID();
  const user = await db.profile.create({ data: { id, email: `thiago-${sufijo}@test-nudito.local`, nombres: "Thiago", apellidos: "Paredes" } });
  const membership = await db.membership.create({ data: { tenantId: c.tenant.id, userId: id, rol: "alumno" } });
  await db.alumno.update({ where: { id: c.alumnos.thiago.id }, data: { cuentaId: membership.id } });
  await db.apoderadoAlumno.create({ data: { tenantId: c.tenant.id, apoderadoId: c.miembros.madre.membership.id, alumnoId: c.alumnos.thiago.id } });
  cuentaThiago = { user, membership };
  const manana = new Date(Date.now() + 2 * 86_400_000);
  await db.tarea.createMany({
    data: [
      { tenantId: c.tenant.id, cursoId: c.cursoAjeno.id, titulo: "TAREA_DE_THIAGO", fechaEntrega: manana, creadoPorId: c.miembros.otroProfesor.membership.id },
      { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, titulo: "TAREA_DE_OTRO_SALON", fechaEntrega: manana, creadoPorId: c.miembros.tutora.membership.id },
    ],
  });
  // Secciones «Todos» y asignaciones como en la migración (specs/39).
  await asignarTareasSinDestinos(db, c.tenant.id);
});

afterAll(async () => {
  await db.sitioPermitido.deleteMany({ where: { dominio: dominioPrueba } });
  await c.limpiar();
  await base.limpiar();
  await db.profile.deleteMany({ where: { id: cuentaThiago.user.id } });
  await db.$disconnect();
});

describe("acceso", () => {
  it("alumno sin licencia → 403 (y motivo «licencia» para la página amable); sin consentimiento → «consentimiento»", async () => {
    await esperarProhibido(requireNuditoPlus(ctxAlumno(), c.alumnos.thiago.id));
    expect(await evaluarAccesoNuditoPlus(ctxAlumno(), c.alumnos.thiago.id)).toMatchObject({ ok: false, motivo: "licencia" });
    await darLicencia(c.alumnos.thiago.id, false);
    expect(await evaluarAccesoNuditoPlus(ctxAlumno(), c.alumnos.thiago.id)).toMatchObject({ ok: false, motivo: "consentimiento" });
    await db.consentimientoIa.create({ data: { tenantId: c.tenant.id, apoderadoId: c.miembros.madre.membership.id, alumnoId: c.alumnos.thiago.id, versionTexto: (await consentimientoActual()).version } });
    expect(await requireNuditoPlus(ctxAlumno(), c.alumnos.thiago.id)).toMatchObject({ modo: "alumno", alumno: { id: c.alumnos.thiago.id } });
  });

  it("el alumno solo entra como sí mismo; profesores y dirección nunca", async () => {
    await esperarProhibido(requireNuditoPlus(ctxAlumno(), c.alumnos.mateo.id));
    for (const quien of ["tutora", "direccion"] as const) await esperarProhibido(requireNuditoPlus(c.ctxDe(quien), c.alumnos.thiago.id));
  });

  it("modo hijo: solo para su propio hijo y si no tiene cuenta propia", async () => {
    await darLicencia(c.alumnos.mateo.id);
    expect(await requireNuditoPlus(c.ctxDe("madre"), c.alumnos.mateo.id)).toMatchObject({ modo: "hijo" });
    await esperarProhibido(requireNuditoPlus(c.ctxDe("madre"), c.alumnos.valentina.id));
    await esperarProhibido(requireNuditoPlus(c.ctxDe("padreSinConsentimiento"), c.alumnos.mateo.id));
    expect(await evaluarAccesoNuditoPlus(c.ctxDe("madre"), c.alumnos.thiago.id)).toMatchObject({ ok: false, motivo: "cuenta_propia" });
  });

  it("colegio Khipu Base → sin acceso aunque hubiera licencia", async () => {
    await db.licenciaNudito.create({ data: { tenantId: base.tenant.id, alumnoId: base.alumnos.mateo.id, desde: new Date("2026-01-01"), hasta: new Date("2099-01-01"), registradaPorId: ADMIN } });
    expect(await evaluarAccesoNuditoPlus(base.ctxDe("madre"), base.alumnos.mateo.id)).toEqual({ ok: false, motivo: "plan" });
  });
});

describe("contexto y conversación", () => {
  it("el contexto solo trae los cursos y tareas del propio alumno", async () => {
    const d = await datosDelAlumno(dbTenant(c.tenant.id), c.alumnos.thiago.id);
    expect(d.cursos.map((x) => x.nombre)).toEqual(["Ciencia"]);
    expect(d.tareas.map((t) => t.titulo)).toEqual(["TAREA_DE_THIAGO"]);
    expect(JSON.stringify(d)).not.toMatch(/Mateo|Valentina|TAREA_DE_OTRO_SALON/);
    expect(d.sitios.map((s) => s.dominio)).toContain(dominioPrueba);
  });

  it("guía con una pregunta y solo enlaces permitidos; guarda tokens y suma el uso del mes", async () => {
    const acceso = await requireNuditoPlus(ctxAlumno(), c.alumnos.thiago.id);
    const r = await conversar(ctxAlumno(), acceso, { conversacionId: null, texto: "no entiendo las fracciones" });
    expect(r.bloqueado).toBe(false);
    expect(r.texto).toContain("?");
    const dominios = await sitiosPermitidos();
    const urls = [...r.texto.matchAll(/https:\/\/([^\s/]+)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const host of urls) expect(dominioPermitido(host, dominios)).toBe(true);

    const mensajes = await db.nuditoMensaje.findMany({ where: { conversacionId: r.conversacionId }, orderBy: { createdAt: "asc" } });
    expect(mensajes.map((m) => m.autor)).toEqual(["usuario", "nudito"]);
    expect(mensajes[0].intencion).toBe("Matemática|Fracciones|dificultad");
    expect(mensajes[1].tokensSalida).toBeGreaterThan(0);
    const conv = await db.nuditoConversacion.findUniqueOrThrow({ where: { id: r.conversacionId } });
    expect(conv).toMatchObject({ alumnoId: c.alumnos.thiago.id, membershipId: cuentaThiago.membership.id, modo: "alumno" });
    const uso = await db.usoNudito.findUniqueOrThrow({ where: { alumnoId_mes: { alumnoId: c.alumnos.thiago.id, mes: mesLima() } } });
    expect(uso.mensajes).toBe(1);
    expect(uso.tokensEntrada).toBe(mensajes[1].tokensEntrada);

    // Sigue la misma conversación.
    const r2 = await conversar(ctxAlumno(), acceso, { conversacionId: r.conversacionId, texto: "¿cuánto es 3 x 4?" });
    expect(r2.conversacionId).toBe(r.conversacionId);
    expect(r2.texto).not.toContain("12");
  });

  it("riesgo: bloquea, responde con ayuda de un adulto y crea una alerta sin citar al alumno", async () => {
    const acceso = await requireNuditoPlus(ctxAlumno(), c.alumnos.thiago.id);
    const r = await conversar(ctxAlumno(), acceso, { conversacionId: null, texto: "me quiero morir" });
    expect(r.bloqueado).toBe(true);
    expect(r.texto).toContain("adulto de confianza");
    const alerta = await db.alertaNudito.findFirstOrThrow({ where: { alumnoId: c.alumnos.thiago.id, tipo: "seguridad" } });
    expect(alerta.conversacionId).toBe(r.conversacionId);
    expect(alerta.detalle).not.toContain("morir");
    const msg = await db.nuditoMensaje.findFirstOrThrow({ where: { conversacionId: r.conversacionId, autor: "usuario" } });
    expect(msg.bloqueado).toBe(true);
  });

  it("si el proveedor falla: mensaje amable, no se guarda nada ni se cobra uso", async () => {
    const acceso = await requireNuditoPlus(ctxAlumno(), c.alumnos.thiago.id);
    const antes = await db.usoNudito.findUniqueOrThrow({ where: { alumnoId_mes: { alumnoId: c.alumnos.thiago.id, mes: mesLima() } } });
    const caido: ProveedorIA = { nombre: "caido", responder: () => Promise.reject(new Error("timeout")) };
    await expect(conversar(ctxAlumno(), acceso, { conversacionId: null, texto: "hola" }, { proveedor: caido })).rejects.toThrow(MENSAJE_PROVEEDOR_CAIDO);
    const despues = await db.usoNudito.findUniqueOrThrow({ where: { alumnoId_mes: { alumnoId: c.alumnos.thiago.id, mes: mesLima() } } });
    expect(despues.mensajes).toBe(antes.mensajes);
  });
});

describe("privacidad: nadie más lee las conversaciones", () => {
  it("la madre (modo hijo de otro hijo) no puede abrir la conversación de Thiago ni verla en su historial", async () => {
    const deThiago = await db.nuditoConversacion.findFirstOrThrow({ where: { alumnoId: c.alumnos.thiago.id } });
    const accesoHijo = await requireNuditoPlus(c.ctxDe("madre"), c.alumnos.mateo.id);
    expect(await mensajesDeConversacion(c.ctxDe("madre"), accesoHijo, deThiago.id)).toBeNull();
    expect(await listarConversacionesNudito(c.ctxDe("madre"), accesoHijo)).toEqual([]);
    // Ni siquiera haciéndose pasar por Thiago en modo hijo (otra membresía).
    const falso = { alumno: { id: c.alumnos.thiago.id, nombres: "Thiago", apellidos: "Paredes", salonId: c.otroSalon.id }, modo: "alumno" as const };
    expect(await mensajesDeConversacion(c.ctxDe("madre"), falso, deThiago.id)).toBeNull();
    // Thiago sí.
    const propio = await requireNuditoPlus(ctxAlumno(), c.alumnos.thiago.id);
    expect((await mensajesDeConversacion(ctxAlumno(), propio, deThiago.id))?.length).toBeGreaterThan(0);
  });

  it("la exportación del colegio no trae los mensajes de Nudito+", async () => {
    expect(tablasExportadas()).not.toContain("nuditoMensaje");
    const exportado = await exportarColegio(c.ctxDe("direccion"));
    expect(exportado.nuditoMensaje).toBeUndefined();
    expect(aJson(exportado)).not.toContain("no entiendo las fracciones");
  });

  it("el resumen semanal usa solo metadatos y no se repite", async () => {
    const hoy = fechaLima(new Date());
    const semana = { desde: sumarDias(hoy, -6), hasta: hoy };
    const r = await generarResumenAlumno(c.tenant.id, c.alumnos.thiago.id, semana);
    expect(r).not.toBeNull();
    const resumen = await db.resumenNudito.findUniqueOrThrow({ where: { id: r!.id } });
    expect(resumen.texto).toContain("Thiago practicó con Nudito+");
    expect(resumen.texto).not.toMatch(/no entiendo|morir/);
    expect(resumen.temas).toEqual(expect.arrayContaining([expect.objectContaining({ area: "Matemática", tema: "Fracciones" })]));
    expect(await generarResumenAlumno(c.tenant.id, c.alumnos.thiago.id, semana)).toBeNull();
  });
});

describe("topes", () => {
  it("al superar el tope del mes responde amable y crea UNA alerta «uso» por mes", async () => {
    const acceso = await requireNuditoPlus(c.ctxDe("madre"), c.alumnos.mateo.id);
    await db.usoNudito.create({ data: { tenantId: c.tenant.id, alumnoId: c.alumnos.mateo.id, mes: mesLima(), mensajes: 1_000_000 } });
    const r1 = await conversar(c.ctxDe("madre"), acceso, { conversacionId: null, texto: "hola" });
    const r2 = await conversar(c.ctxDe("madre"), acceso, { conversacionId: null, texto: "hola otra vez" });
    expect(r1).toMatchObject({ topeAlcanzado: true, texto: MENSAJE_TOPE });
    expect(r2.topeAlcanzado).toBe(true);
    expect(await db.alertaNudito.count({ where: { alumnoId: c.alumnos.mateo.id, tipo: "uso" } })).toBe(1);
    expect(await db.nuditoConversacion.count({ where: { alumnoId: c.alumnos.mateo.id } })).toBe(0);
  });

  it("límite de 20 mensajes por minuto por membresía", async () => {
    const acceso = await requireNuditoPlus(ctxAlumno(), c.alumnos.thiago.id);
    const conv = await db.nuditoConversacion.create({ data: { tenantId: c.tenant.id, membershipId: cuentaThiago.membership.id, alumnoId: c.alumnos.thiago.id } });
    await db.nuditoMensaje.createMany({ data: Array.from({ length: 20 }, () => ({ tenantId: c.tenant.id, conversacionId: conv.id, autor: "usuario" as const, cuerpo: "x" })) });
    const error = await conversar(ctxAlumno(), acceso, { conversacionId: conv.id, texto: "hola" }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorDeNegocio);
    expect((error as Error).message).toBe(MENSAJE_MUY_RAPIDO);
  });
});

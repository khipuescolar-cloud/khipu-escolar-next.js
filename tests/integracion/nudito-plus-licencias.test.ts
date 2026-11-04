// Requiere la BD local. Crea colegios `test-nudito-*` (Pro y Base), un super administrador de prueba y un sitio
// `*.test-nudito.pe`; borra todo al terminar. No cambia la configuración global de Nudito+.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/generated/prisma/client";
import { fechaDb, fechaLima, isoDeFechaDb, sumarDias } from "@/lib/fechas";
import { extenderHasta, periodoNuevo } from "@/lib/nudito-plus";
import { db } from "@/lib/server/db";
import { tablasExportadas } from "@/lib/server/exportar";
import {
  aceptarConsentimientoIa, hijosConNudito, marcarAlertaVista, panelHijo, reportarPago, revocarConsentimientoIa,
} from "@/lib/server/nudito-plus/familia";
import {
  consentimientoVigente, licenciaVigente, limitesNudito, marcarLicenciasVencidas, recordarVencimientos, sitiosPermitidos,
} from "@/lib/server/nudito-plus/licencias";
import { verificarAdminPlataforma, type AdminContext } from "@/lib/server/plataforma";
import {
  agregarSitio, cancelarLicencia, crearLicenciaManual, extenderLicencia, listarLicencias, pagosPendientes, quitarSitio, rechazarPago, verificarPago,
} from "@/lib/server/plataforma-nudito-plus";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

// REGRESIÓN DEL MODO INERTE (specs/28, specs/44): las licencias familiares están apagadas
// (NUDITO_LICENCIAS_FAMILIARES = false). Aquí se fuerzan solo en tests para seguir validando su lógica histórica; el
// comportamiento real con ellas apagadas (404/403) se prueba en el último bloque.
vi.stubEnv("KHIPU_TEST_NUDITO_LICENCIAS", "1");
afterAll(() => vi.unstubAllEnvs());

const hoy = fechaLima(new Date());
const sufijo = randomUUID().slice(0, 8);
let pro: ColegioPrueba;
let base: ColegioPrueba;
let superadmin: Profile;
let admin: AdminContext;
const ref = (n: string) => `T${sufijo}${n}`;
const pago = (referencia: string, meses = 1) => ({ referencia, monto: String(20 * meses), fechaPago: hoy, meses: String(meses) });

beforeAll(async () => {
  pro = await crearColegioPrueba({ plan: "pro", prefijo: "test-nudito" });
  base = await crearColegioPrueba({ plan: "base", prefijo: "test-nudito" });
  superadmin = await db.profile.create({ data: { id: randomUUID(), email: `super-${sufijo}@test-nudito.local`, nombres: "Equipo", apellidos: "Prueba" } });
  await db.adminPlataforma.create({ data: { userId: superadmin.id } });
  admin = { user: superadmin };
});

afterAll(async () => {
  await db.auditoriaPlataforma.deleteMany({ where: { actorId: superadmin.id } });
  await db.sitioPermitido.deleteMany({ where: { dominio: { endsWith: `${sufijo}.test-nudito.pe` } } });
  await pro.limpiar();
  await base.limpiar();
  await db.profile.delete({ where: { id: superadmin.id } });
  await db.$disconnect();
});

describe("Nudito+ para la familia", () => {
  it("el apoderado solo ve a sus propios hijos", async () => {
    const hijos = await hijosConNudito(pro.ctxDe("madre"), hoy);
    expect(hijos.map((h) => h.id)).toEqual([pro.alumnos.mateo.id]);
    expect(hijos[0].estado).toEqual({ tipo: "sin" });
    await esperarProhibido(panelHijo(pro.ctxDe("madre"), pro.alumnos.thiago.id));
    await esperarProhibido(reportarPago(pro.ctxDe("madre"), pro.alumnos.valentina.id, pago(ref("x"))));
  });

  it("solo apoderados de colegios Pro: un colegio Base no puede comprar", async () => {
    await esperarProhibido(hijosConNudito(base.ctxDe("madre")));
    await esperarProhibido(reportarPago(base.ctxDe("madre"), base.alumnos.mateo.id, pago(ref("base"))));
    await esperarProhibido(hijosConNudito(pro.ctxDe("tutora")));
  });

  it("reporta un pago pendiente y rechaza números de operación repetidos o datos inválidos", async () => {
    await reportarPago(pro.ctxDe("madre"), pro.alumnos.mateo.id, pago(ref("a")));
    const [h] = await hijosConNudito(pro.ctxDe("madre"), hoy);
    expect(h.estado).toEqual({ tipo: "revision" });
    await expect(reportarPago(pro.ctxDe("madre"), pro.alumnos.mateo.id, pago(ref("a")))).rejects.toThrow("ya fue reportado");
    await expect(reportarPago(pro.ctxDe("madre"), pro.alumnos.mateo.id, { ...pago(ref("b")), meses: "13" })).rejects.toThrow("entre 1 y 12");
    await expect(reportarPago(pro.ctxDe("madre"), pro.alumnos.mateo.id, { ...pago(ref("b")), fechaPago: sumarDias(hoy, 1) })).rejects.toThrow("futura");
  });
});

describe("verificación en el panel de plataforma", () => {
  it("solo el super administrador verifica pagos", async () => {
    await esperarProhibido(verificarAdminPlataforma(pro.miembros.madre.user));
    await expect(verificarAdminPlataforma(superadmin)).resolves.toMatchObject({ user: { id: superadmin.id } });
  });

  it("verificar crea la licencia desde hoy y avisa a la familia; otro pago la extiende", async () => {
    const pendiente = (await pagosPendientes(admin)).find((p) => p.referencia === ref("a"))!;
    expect(pendiente).toMatchObject({ meses: 1, monto: 20, alumno: { id: pro.alumnos.mateo.id } });
    const r1 = await verificarPago(admin, pendiente.id, hoy);
    expect(r1).toMatchObject({ extendida: false, hasta: periodoNuevo(hoy, 1).hasta });
    const fila = await db.pagoNudito.findUniqueOrThrow({ where: { id: pendiente.id } });
    expect(fila).toMatchObject({ estado: "verificado", licenciaId: r1.licenciaId, registradoPorId: superadmin.id });
    await expect(verificarPago(admin, pendiente.id, hoy)).rejects.toThrow("ya fue revisado");
    expect(await db.aviso.count({ where: { tenantId: pro.tenant.id, plantilla: "nudito_plus", tipo: "nudito" } })).toBeGreaterThan(0);

    await reportarPago(pro.ctxDe("madre"), pro.alumnos.mateo.id, pago(ref("c"), 3));
    const segundo = (await pagosPendientes(admin)).find((p) => p.referencia === ref("c"))!;
    const r2 = await verificarPago(admin, segundo.id, hoy);
    expect(r2).toEqual({ licenciaId: r1.licenciaId, extendida: true, hasta: extenderHasta(r1.hasta, 3) });
    expect(await db.licenciaNudito.count({ where: { alumnoId: pro.alumnos.mateo.id } })).toBe(1);

    const [h] = await hijosConNudito(pro.ctxDe("madre"), hoy);
    expect(h.estado).toEqual({ tipo: "activa", hasta: r2.hasta, pagoEnRevision: false });
    expect(await db.auditoriaPlataforma.count({ where: { actorId: superadmin.id, accion: "nudito_pago_verificar" } })).toBe(2);
  });

  it("rechazar guarda el motivo y lo muestra solo como motivo del pago", async () => {
    await reportarPago(pro.ctxDe("madre"), pro.alumnos.mateo.id, pago(ref("d")));
    const p = (await pagosPendientes(admin)).find((x) => x.referencia === ref("d"))!;
    await expect(rechazarPago(admin, p.id, "no")).rejects.toThrow("motivo");
    await rechazarPago(admin, p.id, "No encontramos esa operación en Yape");
    const panel = await panelHijo(pro.ctxDe("madre"), pro.alumnos.mateo.id, hoy);
    expect(panel.pagos.find((x) => x.id === p.id)).toMatchObject({ estado: "rechazado", motivo: "No encontramos esa operación en Yape" });
  });

  it("aislamiento: la licencia es del colegio y del alumno", async () => {
    expect(await licenciaVigente(db, pro.tenant.id, pro.alumnos.mateo.id, hoy)).not.toBeNull();
    expect(await licenciaVigente(db, base.tenant.id, pro.alumnos.mateo.id, hoy)).toBeNull();
    expect(await licenciaVigente(base.db, base.tenant.id, pro.alumnos.mateo.id, hoy)).toBeNull();
    expect(await licenciaVigente(pro.db, pro.tenant.id, pro.alumnos.valentina.id, hoy)).toBeNull();
    expect(await base.db.licenciaNudito.count()).toBe(0);
  });
});

describe("consentimiento de IA", () => {
  it("aceptar habilita el uso; retirar lo corta", async () => {
    const madre = pro.ctxDe("madre");
    expect(await consentimientoVigente(pro.db, pro.tenant.id, pro.alumnos.mateo.id)).toBeNull();
    expect((await panelHijo(madre, pro.alumnos.mateo.id, hoy)).puedeUsar).toBe(false);
    await aceptarConsentimientoIa(madre, pro.alumnos.mateo.id, "203.0.113.7");
    await aceptarConsentimientoIa(madre, pro.alumnos.mateo.id, "203.0.113.7");
    expect(await db.consentimientoIa.count({ where: { alumnoId: pro.alumnos.mateo.id } })).toBe(1);
    const c = await consentimientoVigente(pro.db, pro.tenant.id, pro.alumnos.mateo.id);
    expect(c).toMatchObject({ ip: "203.0.113.7", apoderadoId: pro.miembros.madre.membership.id });
    expect((await panelHijo(madre, pro.alumnos.mateo.id, hoy)).puedeUsar).toBe(true);
    await revocarConsentimientoIa(madre, pro.alumnos.mateo.id);
    expect(await consentimientoVigente(pro.db, pro.tenant.id, pro.alumnos.mateo.id)).toBeNull();
    expect((await panelHijo(madre, pro.alumnos.mateo.id, hoy)).puedeUsar).toBe(false);
    await esperarProhibido(aceptarConsentimientoIa(madre, pro.alumnos.thiago.id, null));
  });

  it("alertas: el apoderado marca como vista solo las de su hijo", async () => {
    const propia = await pro.db.alertaNudito.create({ data: { tenantId: pro.tenant.id, alumnoId: pro.alumnos.mateo.id, tipo: "dificultad", detalle: "Le cuesta restar." } });
    const ajena = await pro.db.alertaNudito.create({ data: { tenantId: pro.tenant.id, alumnoId: pro.alumnos.thiago.id, tipo: "animo", detalle: "Otra." } });
    await marcarAlertaVista(pro.ctxDe("madre"), propia.id);
    expect((await db.alertaNudito.findUniqueOrThrow({ where: { id: propia.id } })).vistaAt).not.toBeNull();
    await esperarProhibido(marcarAlertaVista(pro.ctxDe("madre"), ajena.id));
  });
});

describe("vencimientos y acciones manuales", () => {
  it("marca vencidas y recuerda una sola vez a 3 días del fin", async () => {
    const vieja = await db.licenciaNudito.create({
      data: { tenantId: pro.tenant.id, alumnoId: pro.alumnos.valentina.id, estado: "activa", origen: "pago", desde: fechaDb(sumarDias(hoy, -40)), hasta: fechaDb(sumarDias(hoy, -1)), registradaPorId: superadmin.id },
    });
    expect(await marcarLicenciasVencidas(hoy, pro.tenant.id)).toBe(1);
    expect((await db.licenciaNudito.findUniqueOrThrow({ where: { id: vieja.id } })).estado).toBe("vencida");

    const porVencer = await db.licenciaNudito.create({
      data: { tenantId: pro.tenant.id, alumnoId: pro.alumnos.thiago.id, estado: "activa", origen: "pago", desde: fechaDb(sumarDias(hoy, -27)), hasta: fechaDb(sumarDias(hoy, 3)), registradaPorId: superadmin.id },
    });
    // Thiago no tiene apoderado con avisos: no hay a quién recordar. Se vincula a la madre y se recuerda una vez.
    expect(await recordarVencimientos(hoy, pro.tenant.id)).toBe(0);
    await db.apoderadoAlumno.create({ data: { tenantId: pro.tenant.id, apoderadoId: pro.miembros.madre.membership.id, alumnoId: pro.alumnos.thiago.id } });
    expect(await recordarVencimientos(hoy, pro.tenant.id)).toBe(1);
    expect(await recordarVencimientos(hoy, pro.tenant.id)).toBe(0);
    expect(await db.aviso.count({ where: { tenantId: pro.tenant.id, referenciaId: { startsWith: `nudito-vence:${porVencer.id}` } } })).toBeGreaterThan(0);
  });

  it("cortesía/prueba, extender y cancelar con motivo; nunca en colegios Base", async () => {
    await expect(
      crearLicenciaManual(admin, { tenantId: base.tenant.id, alumnoId: base.alumnos.mateo.id, origen: "prueba", hasta: sumarDias(hoy, 7), motivo: "Prueba piloto" }, hoy),
    ).rejects.toThrow("Khipu Pro");
    await expect(
      crearLicenciaManual(admin, { tenantId: pro.tenant.id, alumnoId: pro.alumnos.mateo.id, origen: "prueba", hasta: sumarDias(hoy, 7), motivo: "Prueba piloto" }, hoy),
    ).rejects.toThrow("ya tiene una licencia activa");
    const vieja = await db.licenciaNudito.findFirstOrThrow({ where: { alumnoId: pro.alumnos.valentina.id } });
    // Vencida: extender la reactiva desde hoy.
    const hasta = await extenderLicencia(admin, vieja.id, { meses: 1, motivo: "Compensación por caída" }, hoy);
    expect(hasta).toBe(periodoNuevo(hoy, 1).hasta);
    expect(await licenciaVigente(db, pro.tenant.id, pro.alumnos.valentina.id, hoy)).toMatchObject({ id: vieja.id });
    await cancelarLicencia(admin, vieja.id, "Pedido de la familia", hoy);
    expect(await licenciaVigente(db, pro.tenant.id, pro.alumnos.valentina.id, hoy)).toBeNull();
    await expect(extenderLicencia(admin, vieja.id, { meses: 1, motivo: "Otra vez" }, hoy)).rejects.toThrow("cancelada");
    const id = await crearLicenciaManual(admin, { tenantId: pro.tenant.id, alumnoId: pro.alumnos.valentina.id, origen: "cortesia", hasta: sumarDias(hoy, 13), motivo: "Familia piloto" }, hoy);
    const l = await db.licenciaNudito.findUniqueOrThrow({ where: { id } });
    expect({ origen: l.origen, desde: isoDeFechaDb(l.desde), hasta: isoDeFechaDb(l.hasta) }).toEqual({ origen: "cortesia", desde: hoy, hasta: sumarDias(hoy, 13) });
    const lista = await listarLicencias(admin, { colegio: pro.tenant.id, estado: "cancelada" }, hoy);
    expect(lista.map((x) => x.id)).toEqual([vieja.id]);
    const acciones = await db.auditoriaPlataforma.findMany({ where: { actorId: superadmin.id, tenantId: pro.tenant.id }, select: { accion: true } });
    expect(new Set(acciones.map((a) => a.accion))).toEqual(new Set(["nudito_pago_verificar", "nudito_pago_rechazar", "nudito_licencia_extender", "nudito_licencia_cancelar", "nudito_licencia_crear"]));
  });
});

describe("configuración, sitios y exportación", () => {
  it("límites con valores por defecto válidos y sitios normalizados", async () => {
    const l = await limitesNudito();
    expect(l.mensajesPorMes).toBeGreaterThan(0);
    const dominio = await agregarSitio(admin, { dominio: `https://www.Uno-${sufijo}.test-nudito.pe/cursos`, nombre: "Sitio de prueba" });
    expect(dominio).toBe(`uno-${sufijo}.test-nudito.pe`);
    await expect(agregarSitio(admin, { dominio: `uno-${sufijo}.test-nudito.pe`, nombre: "Repetido" })).rejects.toThrow("ya está en la lista");
    await expect(agregarSitio(admin, { dominio: "no es dominio", nombre: "Malo" })).rejects.toThrow("no es válido");
    expect(await sitiosPermitidos()).toContain(dominio);
    const s = await db.sitioPermitido.findUniqueOrThrow({ where: { dominio } });
    await quitarSitio(admin, s.id);
    expect(await sitiosPermitidos()).not.toContain(dominio);
  });

  it("la exportación del colegio no incluye la actividad de Nudito+", () => {
    const tablas = tablasExportadas();
    for (const t of ["nuditoMensaje", "nuditoConversacion", "alertaNudito", "resumenNudito", "usoNudito"]) expect(tablas).not.toContain(t);
    for (const t of ["licenciaNudito", "pagoNudito", "consentimientoIa"]) expect(tablas).toContain(t);
  });
});

describe("licencias familiares apagadas (modo real)", () => {
  it("reportar pagos y la pantalla «Activar» → 404; verificar, crear o extender licencias → 403", async () => {
    vi.stubEnv("KHIPU_TEST_NUDITO_LICENCIAS", "");
    try {
      const noEncontrado = (p: Promise<unknown>) => expect(p).rejects.toSatisfy((e: unknown) => String((e as { digest?: string }).digest ?? e).includes("404"));
      await noEncontrado(reportarPago(pro.ctxDe("madre"), pro.alumnos.mateo.id, pago(ref("off"))));
      const { datosParaActivar } = await import("@/lib/server/nudito-plus/familia");
      await noEncontrado(datosParaActivar(pro.ctxDe("madre"), pro.alumnos.mateo.id));
      await esperarProhibido(crearLicenciaManual(admin, { tenantId: pro.tenant.id, alumnoId: pro.alumnos.thiago.id, origen: "prueba", hasta: sumarDias(hoy, 7), motivo: "Prueba apagada" }, hoy));
      await esperarProhibido(verificarPago(admin, randomUUID()));
      // Los datos históricos se conservan y se siguen pudiendo listar.
      expect(await db.licenciaNudito.count({ where: { tenantId: pro.tenant.id } })).toBeGreaterThan(0);
      expect((await listarLicencias(admin, { colegio: pro.tenant.id }, hoy)).length).toBeGreaterThan(0);
    } finally {
      vi.stubEnv("KHIPU_TEST_NUDITO_LICENCIAS", "1");
    }
  });
});

// Permisos de asistencia (specs/04, 37), salida en portería (specs/05) y reporte por grado y CSV (specs/27).
// Requiere la BD local.
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aCsv } from "@/lib/csv";
import { fechaDb, momentoEnZona, sumarDias } from "@/lib/fechas";
import { filasCsvDeTabla, tablaDeReporte } from "@/lib/reportes-asistencia-tabla";
import { historialDeHijos } from "@/lib/server/asistencia";
import { controlDelColegio } from "@/lib/server/control-ingreso";
import { db, dbTenant } from "@/lib/server/db";
import { crearEvaluacion } from "@/lib/server/notas";
import { anularPermiso, listarPermisos, registrarPermiso } from "@/lib/server/permisos-asistencia";
import {
  generarCarnetsSalon, MENSAJE_SIN_INGRESO, registrarLlegadaManual, registrarLlegadaPorQr, registrarSalidaManual, registrarSalidaPorQr, urlDeCarnet,
} from "@/lib/server/porteria";
import { reporteAlumno, reporteGrado, reporteSalon, resumenColegio } from "@/lib/server/reportes-asistencia";
import { accesoModulosDeCodigo } from "@/lib/modulos";
import type { TenantContext } from "@/lib/server/tenant";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

let c: ColegioPrueba;
let otro: ColegioPrueba;
let periodoId: string;
let competenciaId: string;
let administrativo: TenantContext;
let perfilAdministrativo: string;
let hoy: string;
const dia = (n: number) => sumarDias(hoy, -n);
/** Instante en hora de Lima. */
const a = (hora: string, fecha: string) => new Date(`${fecha}T${hora}:00-05:00`);

async function registro(alumnoId: string, fecha: string, estado: "falta" | "tarde" | "llego", ambito = "dia", hora = "08:00") {
  return c.db.asistencia.create({
    data: { tenantId: c.tenant.id, alumnoId, cursoId: ambito === "dia" ? null : ambito, ambito, fecha: fechaDb(fecha), hora, estado, origen: "lista" },
  });
}

async function evaluacion(titulo: string, fecha: string) {
  expect(await crearEvaluacion(c.ctxDe("tutora"), { cursoId: c.cursoTutora.id, periodoId, competenciaIds: [competenciaId], titulo, fecha, peso: "1" })).toMatchObject({ ok: true });
  return c.db.evaluacion.findFirstOrThrow({ where: { titulo } });
}

const nota = (evaluacionId: string, alumnoId: string) => c.db.nota.findFirst({ where: { evaluacionId, alumnoId } });

const permisoDiaCompleto = (alumnoId: string, desde: string, hasta = desde) => ({ alumnoId, desde, hasta, todoElDia: true, motivo: "Viaje familiar autorizado" });

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-permisos" });
  otro = await crearColegioPrueba({ prefijo: "test-permisos-otro" });
  hoy = momentoEnZona(new Date(), c.tenant.zonaHoraria).isoFecha;
  periodoId = (await c.db.periodo.create({
    data: { tenantId: c.tenant.id, anio: 2026, tipo: "trimestre", numero: 3, nombre: "III Trimestre", inicio: new Date("2026-09-01"), fin: new Date("2026-12-18") },
  })).id;
  competenciaId = (await c.db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre: "Resuelve problemas", orden: 1 } })).id;
  perfilAdministrativo = randomUUID();
  const user = await db.profile.create({ data: { id: perfilAdministrativo, email: `administrativo-${perfilAdministrativo.slice(0, 8)}@test-basico.local`, nombres: "Sara", apellidos: "Prueba" } });
  const membership = await db.membership.create({ data: { tenantId: c.tenant.id, userId: user.id, rol: "administrativo" } });
  administrativo = { tenant: c.tenant, user, membership, rol: "administrativo", roles: ["administrativo"], db: dbTenant(c.tenant.id), ...accesoModulosDeCodigo(c.tenant.plan) };
}, 60_000);

afterAll(async () => {
  await c?.limpiar();
  await otro?.limpiar();
  if (perfilAdministrativo) await db.profile.deleteMany({ where: { id: perfilAdministrativo } });
}, 60_000);

describe("permisos de asistencia", () => {
  it("solo dirección, administrativo y el tutor del salón registran; los demás no", async () => {
    const entrada = permisoDiaCompleto(c.alumnos.valentina.id, dia(40));
    await esperarProhibido(registrarPermiso(c.ctxDe("otroProfesor"), entrada)); // no es tutor de 3.° B
    await esperarProhibido(registrarPermiso(c.ctxDe("porteria"), entrada));
    await esperarProhibido(registrarPermiso(c.ctxDe("madre"), entrada));
    expect(await registrarPermiso(c.ctxDe("tutora"), entrada)).toMatchObject({ ok: true });
    expect(await registrarPermiso(administrativo, { ...entrada, desde: dia(41), hasta: dia(41) })).toMatchObject({ ok: true });
    expect(await registrarPermiso(c.ctxDe("direccion"), { ...entrada, desde: dia(42), hasta: dia(42) })).toMatchObject({ ok: true });
    // Validaciones: rango y horas.
    expect(await registrarPermiso(c.ctxDe("direccion"), { ...entrada, desde: dia(1), hasta: dia(3) })).toMatchObject({ ok: false });
    expect(await registrarPermiso(c.ctxDe("direccion"), { ...entrada, todoElDia: false, horaDesde: "10:00", horaHasta: "09:00" })).toMatchObject({ ok: false });
    // Otro colegio: el alumno no existe para su contexto.
    await esperarProhibido(registrarPermiso(otro.ctxDe("direccion"), entrada));
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "permiso_asistencia", accion: "crear" } })).toBe(3);
  });

  it("el profesor ve en solo lectura los permisos de sus salones", async () => {
    await registrarPermiso(c.ctxDe("direccion"), permisoDiaCompleto(c.alumnos.thiago.id, dia(40)));
    const ajeno = await listarPermisos(c.ctxDe("otroProfesor")); // tutor de 5.° A
    expect(ajeno.map((p) => p.alumnoId)).toEqual([c.alumnos.thiago.id]);
    expect(ajeno[0].puedeAnular).toBe(true);
    const tutora = await listarPermisos(c.ctxDe("tutora"));
    expect(tutora.every((p) => p.alumnoId !== c.alumnos.thiago.id)).toBe(true);
    await esperarProhibido(listarPermisos(c.ctxDe("madre")));
  });

  it("permiso de día completo: sin «aún no llega» ni falta automática ese día", async () => {
    const fecha = "2026-11-04"; // miércoles hábil
    const t = await db.tenant.update({ where: { id: c.tenant.id }, data: { controlIngresoAutomatico: true, horaLimiteFalta: "09:00" } });
    Object.assign(c.tenant, t);
    expect(await registrarPermiso(c.ctxDe("direccion"), permisoDiaCompleto(c.alumnos.mateo.id, fecha))).toMatchObject({ ok: true });
    await registrarLlegadaManual(c.ctxDe("porteria"), c.alumnos.valentina.id, a("07:50", fecha));
    expect(await controlDelColegio(t, a("08:05", fecha))).toEqual({ avisosNoLlega: 0, faltas: 0 }); // Thiago no tiene familia con avisos
    expect(await controlDelColegio(t, a("09:01", fecha))).toEqual({ avisosNoLlega: 0, faltas: 1 }); // solo Thiago
    expect(await c.db.asistencia.findFirst({ where: { alumnoId: c.alumnos.mateo.id, fecha: fechaDb(fecha), ambito: "dia" } })).toBeNull();
    expect(await c.db.aviso.count({ where: { plantilla: { in: ["asistencia_no_llega", "asistencia_falta"] } } })).toBe(0);
    Object.assign(c.tenant, await db.tenant.update({ where: { id: c.tenant.id }, data: { controlIngresoAutomatico: false } }));
  });

  it("una falta cubierta por un permiso de día completo no genera NSP", async () => {
    const fecha = dia(3);
    await registro(c.alumnos.mateo.id, fecha, "falta");
    await registrarPermiso(c.ctxDe("tutora"), permisoDiaCompleto(c.alumnos.mateo.id, fecha));
    const e = await evaluacion("Examen con permiso", fecha);
    expect(await nota(e.id, c.alumnos.mateo.id)).toBeNull();
    // En el reporte, la falta cuenta como justificada y «con permiso».
    const r = await reporteAlumno(c.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id, desde: fecha, hasta: fecha });
    if (r.detalle.length > 0) {
      expect(r.resumen).toMatchObject({ falta: 1, faltasJustificadas: 1, faltasInjustificadas: 0, conPermiso: 1 });
      expect(r.detalle[0].conPermiso).toBe(true);
    }
  });

  it("permiso registrado después de la falta: el NSP automático se retira; al anularlo, vuelve", async () => {
    const fecha = "2026-10-22"; // fecha fija: evita colisionar con la prueba de control del 04/11
    await registro(c.alumnos.valentina.id, fecha, "falta");
    const e = await evaluacion("Práctica calificada", fecha);
    expect(await nota(e.id, c.alumnos.valentina.id)).toMatchObject({ marca: "nsp" });
    expect(await registrarPermiso(c.ctxDe("direccion"), permisoDiaCompleto(c.alumnos.valentina.id, fecha))).toMatchObject({ ok: true });
    expect(await nota(e.id, c.alumnos.valentina.id)).toBeNull();
    const historial = await c.db.historialNota.findFirstOrThrow({ where: { evaluacionId: e.id, alumnoId: c.alumnos.valentina.id, valorAnterior: "NSP", valorNuevo: null } });
    expect(historial).toMatchObject({ tipo: "cambio_asistencia", cambiadoPorId: null, motivo: "La falta está cubierta por un permiso de asistencia autorizado." });

    const permiso = await c.db.permisoAsistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.valentina.id, desde: fechaDb(fecha) } });
    expect(await anularPermiso(c.ctxDe("otroProfesor"), { permisoId: permiso.id, motivo: "Error" }).catch(() => "403")).toBe("403");
    expect(await anularPermiso(c.ctxDe("direccion"), { permisoId: permiso.id, motivo: "No" })).toMatchObject({ ok: false }); // motivo muy corto
    expect(await anularPermiso(c.ctxDe("direccion"), { permisoId: permiso.id, motivo: "Se registró por error" })).toMatchObject({ ok: true });
    expect(await anularPermiso(c.ctxDe("direccion"), { permisoId: permiso.id, motivo: "Se registró por error" })).toMatchObject({ ok: false, error: "Este permiso ya estaba anulado." });
    const anulado = await c.db.permisoAsistencia.findUniqueOrThrow({ where: { id: permiso.id } });
    expect(anulado).toMatchObject({ anuladoPorId: c.miembros.direccion.membership.id, motivoAnulacion: "Se registró por error" });
    expect(anulado.anuladoAt).not.toBeNull();
    expect(await nota(e.id, c.alumnos.valentina.id)).toMatchObject({ marca: "nsp" });
  });

  it("la tardanza nunca genera NSP; un permiso por horas cubre la falta a clase de esas horas", async () => {
    const fecha = dia(6);
    await registro(c.alumnos.mateo.id, fecha, "tarde");
    await registro(c.alumnos.valentina.id, fecha, "falta", c.cursoTutora.id, "09:00");
    await registrarPermiso(c.ctxDe("tutora"), { alumnoId: c.alumnos.valentina.id, desde: fecha, hasta: fecha, todoElDia: false, horaDesde: "08:30", horaHasta: "10:00", motivo: "Cita médica" });
    const e = await evaluacion("Exposición", fecha);
    expect(await nota(e.id, c.alumnos.mateo.id)).toBeNull();
    expect(await nota(e.id, c.alumnos.valentina.id)).toBeNull();
    // Fuera de esas horas sí hay NSP.
    const otraFecha = dia(7);
    await registro(c.alumnos.valentina.id, otraFecha, "falta", c.cursoTutora.id, "11:00");
    await registrarPermiso(c.ctxDe("tutora"), { alumnoId: c.alumnos.valentina.id, desde: otraFecha, hasta: otraFecha, todoElDia: false, horaDesde: "08:30", horaHasta: "10:00", motivo: "Cita médica" });
    const e2 = await evaluacion("Debate", otraFecha);
    expect(await nota(e2.id, c.alumnos.valentina.id)).toMatchObject({ marca: "nsp" });
  });
});

describe("salida en portería", () => {
  const fecha = "2026-10-14"; // miércoles hábil pasado (sin otros registros de esta prueba)
  let qrMateo: string;

  beforeAll(async () => {
    await generarCarnetsSalon(c.ctxDe("direccion"), c.salon.id);
    const carnet = await c.db.carnetQr.findFirstOrThrow({ where: { alumnoId: c.alumnos.mateo.id, activo: true } });
    qrMateo = urlDeCarnet(carnet.id);
  });

  it("sin ingreso de hoy no registra la salida", async () => {
    expect(await registrarSalidaPorQr(c.ctxDe("porteria"), qrMateo, a("13:00", fecha))).toEqual({ ok: false, mensaje: MENSAJE_SIN_INGRESO });
  });

  it("QR de salida: registra la hora una sola vez y no avisa a la familia", async () => {
    expect(await registrarLlegadaPorQr(c.ctxDe("porteria"), qrMateo, a("07:45", fecha))).toMatchObject({ ok: true, tipo: "registrado", movimiento: "llegada" });
    const avisos = await c.db.aviso.count();
    expect(await registrarSalidaPorQr(c.ctxDe("porteria"), qrMateo, a("13:10", fecha))).toMatchObject({ ok: true, tipo: "registrado", movimiento: "salida", hora: "13:10" });
    expect(await registrarSalidaPorQr(c.ctxDe("porteria"), qrMateo, a("13:12", fecha))).toMatchObject({ ok: true, tipo: "ya-registrado", movimiento: "salida", hora: "13:10" });
    expect(await registrarSalidaManual(c.ctxDe("direccion"), c.alumnos.mateo.id, a("13:20", fecha))).toMatchObject({ tipo: "ya-registrado", hora: "13:10" });
    const fila = await c.db.asistencia.findFirstOrThrow({ where: { alumnoId: c.alumnos.mateo.id, fecha: fechaDb(fecha), ambito: "dia" } });
    expect(fila).toMatchObject({ estado: "llego", hora: "07:45", horaSalida: "13:10", salidaRegistradaPorId: c.miembros.porteria.membership.id });
    expect(await c.db.aviso.count()).toBe(avisos);
    // Una llegada repetida no toca la salida.
    expect(await registrarLlegadaPorQr(c.ctxDe("porteria"), qrMateo, a("13:30", fecha))).toMatchObject({ tipo: "ya-registrado" });
    await esperarProhibido(registrarSalidaPorQr(c.ctxDe("tutora"), qrMateo, a("13:30", fecha)));
    expect(await registrarSalidaPorQr(otro.ctxDe("porteria"), qrMateo, a("13:30", fecha))).toMatchObject({ ok: false });
  });

  it("la salida se ve en el historial de la familia y en el reporte del alumno", async () => {
    const h = await historialDeHijos(c.ctxDe("madre"), "2026-10");
    const registro = h.hijos[0].registros.find((r) => r.fecha === fecha && r.esDia)!;
    expect(registro.horaSalida).toBe("13:10");
    const r = await reporteAlumno(c.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id, desde: fecha, hasta: fecha });
    expect(r.detalle[0]).toMatchObject({ estado: "llego", horaSalida: "13:10" });
    expect(tablaDeReporte(r).secciones[1].filas[0]).toContain("13:10");
  });
});

describe("reporte por grado y CSV", () => {
  const RANGO = { desde: "2026-03-02", hasta: "2026-03-06" };
  let seccionA: { id: string };

  beforeAll(async () => {
    await c.db.salon.update({ where: { id: c.salon.id }, data: { grado: 3 } });
    await c.db.salon.update({ where: { id: c.otroSalon.id }, data: { grado: 5 } });
    seccionA = await c.db.salon.create({ data: { tenantId: c.tenant.id, nombre: "3.° A", nivel: "primaria", grado: 3, anio: 2026 } });
    const lucia = await c.db.alumno.create({ data: { tenantId: c.tenant.id, salonId: seccionA.id, nombres: "Lucía", apellidos: "Mendoza" } });
    for (const d of ["2026-03-02", "2026-03-03"]) {
      await registro(c.alumnos.mateo.id, d, "llego");
      await registro(lucia.id, d, d === "2026-03-02" ? "falta" : "tarde");
    }
    await registro(c.alumnos.thiago.id, "2026-03-02", "llego");
  });

  it("suma todas las secciones del grado y deja fuera los otros grados", async () => {
    const r = await reporteGrado(c.ctxDe("direccion"), { grado: "primaria-3", ...RANGO });
    expect(r.grado).toMatchObject({ nivel: "primaria", grado: 3, nombre: "3.° grado de primaria" });
    expect(r.filas.map((f) => f.salon)).toEqual(["3.° A", "3.° B"]);
    expect(r.filas.some((f) => f.salonId === c.otroSalon.id)).toBe(false);
    expect(r.total.llego).toBe(r.filas.reduce((s, f) => s + f.resumen.llego, 0));
    expect(r.total).toMatchObject({ llego: 2, tarde: 1, falta: 1, diasConRegistro: 4, porcentaje: 75 });
    const tabla = tablaDeReporte(r);
    expect(tabla.secciones[0].total?.[0]).toBe("Total del grado");
    expect(tabla.archivo).toContain("primaria-3");
  });

  it("permisos del reporte por grado: el profesor solo sus salones; la familia y portería no", async () => {
    const tutora = await reporteGrado(c.ctxDe("tutora"), { grado: "primaria-3", ...RANGO });
    expect(tutora.filas.map((f) => f.salonId)).toEqual([c.salon.id]);
    await esperarProhibido(reporteGrado(c.ctxDe("otroProfesor"), { grado: "primaria-3", ...RANGO }));
    await esperarProhibido(reporteGrado(c.ctxDe("madre"), { grado: "primaria-3", ...RANGO }));
    await esperarProhibido(reporteGrado(c.ctxDe("porteria"), { grado: "primaria-3", ...RANGO }));
    expect((await reporteGrado(otro.ctxDe("direccion"), { grado: "primaria-3", ...RANGO })).filas.map((f) => f.salonId)).not.toContain(c.salon.id);
  });

  it("CSV respeta los permisos y se audita", async () => {
    const csv = { accion: "exportar" as const, formato: "csv" as const };
    const propio = await reporteAlumno(c.ctxDe("madre"), { alumnoId: c.alumnos.mateo.id, ...RANGO }, csv);
    const { encabezados, filas } = filasCsvDeTabla(propio.colegio, tablaDeReporte(propio));
    expect(aCsv(encabezados, filas)).toContain("Quispe");
    await esperarProhibido(reporteAlumno(c.ctxDe("madre"), { alumnoId: c.alumnos.valentina.id, ...RANGO }, csv));
    await esperarProhibido(reporteSalon(c.ctxDe("madre"), { salonId: c.salon.id, ...RANGO }, csv));
    await esperarProhibido(reporteSalon(c.ctxDe("tutora"), { salonId: c.otroSalon.id, ...RANGO }, csv));
    await esperarProhibido(resumenColegio(c.ctxDe("porteria"), RANGO, csv));
    await expect(reporteSalon(otro.ctxDe("direccion"), { salonId: c.salon.id, ...RANGO }, csv)).rejects.toThrow();
    await expect(reporteAlumno(otro.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id, ...RANGO }, csv)).rejects.toThrow();
    const auditoria = await db.auditoria.findFirstOrThrow({ where: { tenantId: c.tenant.id, entidad: "reporte_asistencia", accion: "exportar" }, orderBy: { createdAt: "desc" } });
    expect(auditoria.detalle).toMatchObject({ formato: "csv" });
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { solicitarReportesPeriodo } from "@/lib/server/calificacion-periodo";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

process.env.__NEXT_EXPERIMENTAL_AUTH_INTERRUPTS = "true";
let c: ColegioPrueba;
let otro: ColegioPrueba;
let periodoId: string;
let pendienteId: string;
let segundoPendienteId: string;
const ahora = new Date("2026-11-09T15:00:00Z");
const entrada = () => ({ salonId: c.salon.id, periodoId, titulo: "Solicitud de reportes periódicos · IV Bimestre 2026", descripcion: "Por favor, envía tus calificaciones." });

beforeAll(async () => {
  c = await crearColegioPrueba({ plan: "pro", prefijo: "test-solicitar-periodo" });
  otro = await crearColegioPrueba({ plan: "pro", prefijo: "test-solicitar-periodo-otro" });
  periodoId = (await c.db.periodo.create({ data: { tenantId: c.tenant.id, anio: 2026, tipo: "bimestre", numero: 4, nombre: "IV Bimestre", inicio: new Date("2026-10-01"), fin: new Date("2026-11-08"), niveles: ["primaria"] } })).id;
  await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Ciencia", profesorId: c.miembros.otroProfesor.membership.id } });
  pendienteId = (await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Comunicación", profesorId: c.miembros.otroProfesor.membership.id } })).id;
  segundoPendienteId = (await c.db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Arte", profesorId: c.miembros.otroProfesor.membership.id } })).id;
  const cerrado = await c.db.curso.findFirstOrThrow({ where: { salonId: c.salon.id, nombre: "Ciencia" } });
  await c.db.cierreCurso.create({ data: { tenantId: c.tenant.id, cursoId: cerrado.id, periodoId, cerradoPorId: c.miembros.otroProfesor.membership.id } });
}, 60_000);
afterAll(async () => { await c?.limpiar(); await otro?.limpiar(); await db.$disconnect(); }, 60_000);

describe("solicitud de reportes del periodo", () => {
  it("solo envía bandeja y correo al profesor activo con curso pendiente, sin duplicar", async () => {
    expect(await solicitarReportesPeriodo(c.ctxDe("tutora"), entrada(), ahora)).toEqual({ enviados: 1 });
    const filas = await c.db.notificacion.findMany({ where: { tipo: "reporte_periodo" } });
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ membershipId: c.miembros.otroProfesor.membership.id, url: "/notas/" + segundoPendienteId });
    const avisos = await c.db.aviso.findMany({ where: { plantilla: "reporte_periodo_solicitud" } });
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ canal: "correo", destinatario: c.miembros.otroProfesor.user.email, tipo: "libreta" });
    expect(JSON.stringify(avisos[0].payload)).toContain("Comunicación");
    expect(JSON.stringify(avisos[0].payload)).toContain("Arte");
    expect(JSON.stringify(avisos[0].payload)).not.toContain("Ciencia");
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, accion: "enviar", entidad: "reporte_periodo_salon" } })).toBe(1);
  });
  it("rechaza un segundo envío en el mismo día del colegio", async () => {
    await expect(solicitarReportesPeriodo(c.ctxDe("direccion"), entrada(), ahora)).rejects.toThrow("Ya enviaste esta solicitud hoy");
  });
  it("deniega al profesor que no tutora y al otro colegio", async () => {
    await esperarProhibido(solicitarReportesPeriodo(c.ctxDe("otroProfesor"), entrada(), ahora));
    await esperarProhibido(solicitarReportesPeriodo(otro.ctxDe("direccion"), entrada(), ahora));
  });
  it("sin profesores pendientes devuelve error de negocio", async () => {
    await c.db.cierreCurso.create({ data: { tenantId: c.tenant.id, cursoId: pendienteId, periodoId, cerradoPorId: c.miembros.otroProfesor.membership.id } });
    await c.db.cierreCurso.create({ data: { tenantId: c.tenant.id, cursoId: segundoPendienteId, periodoId, cerradoPorId: c.miembros.otroProfesor.membership.id } });
    await expect(solicitarReportesPeriodo(c.ctxDe("tutora"), entrada(), new Date("2026-11-10T15:00:00Z"))).rejects.toBeInstanceOf(ErrorDeNegocio);
  });
});

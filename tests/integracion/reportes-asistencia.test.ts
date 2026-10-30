import { renderToBuffer } from "@react-pdf/renderer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { fechaDb, restarDias, sumarDias } from "@/lib/fechas";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { opcionesDeReporte, reporteAlumno, reporteSalon, resumenColegio } from "@/lib/server/reportes-asistencia";
import { reporteAExcel, TIPO_XLSX } from "@/lib/server/reportes-asistencia-excel";
import { ReporteAsistenciaPdf } from "@/lib/server/reportes-asistencia-pdf";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

// Semana lun 2 a vie 6 de marzo de 2026 (sin feriados): 5 días hábiles.
const RANGO = { desde: "2026-03-02", hasta: "2026-03-06" };

describe("reportes de asistencia", () => {
  let c: ColegioPrueba;
  let otro: ColegioPrueba;

  beforeAll(async () => {
    c = await crearColegioPrueba();
    otro = await crearColegioPrueba();
    const registrar = async (alumnoId: string, fecha: string, estado: "llego" | "tarde" | "falta" | "problema", ambito = "dia", hora = "07:50") =>
      db.asistencia.create({
        data: { tenantId: c.tenant.id, alumnoId, fecha: fechaDb(fecha), ambito, cursoId: ambito === "dia" ? null : ambito, hora, estado, registradoPorId: c.miembros.tutora.membership.id },
      });
    const { mateo, valentina, thiago } = c.alumnos;
    await registrar(mateo.id, "2026-03-02", "llego");
    await registrar(mateo.id, "2026-03-03", "tarde");
    const falta = await registrar(mateo.id, "2026-03-04", "falta");
    await registrar(mateo.id, "2026-03-05", "falta");
    // Mateo, 6 de marzo: sin registro. Un curso que dice «falta» no pisa el ingreso del día.
    await registrar(mateo.id, "2026-03-02", "falta", c.cursoTutora.id, "09:00");
    await db.justificacion.create({
      data: { tenantId: c.tenant.id, asistenciaId: falta.id, apoderadoId: c.miembros.madre.membership.id, motivo: "Cita médica", estado: "aceptada" },
    });
    for (const d of ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06"]) await registrar(valentina.id, d, "llego");
    await registrar(thiago.id, "2026-03-02", "falta");
  });
  afterAll(async () => {
    await c?.limpiar();
    await otro?.limpiar();
  });

  it("el reporte del salón calcula conteos, justificadas y porcentaje por alumno", async () => {
    const r = await reporteSalon(c.ctxDe("direccion"), { salonId: c.salon.id, ...RANGO });
    expect(r.filas.map((f) => f.apellidos)).toEqual(["Quispe", "Ríos"]);
    const mateo = r.filas.find((f) => f.alumnoId === c.alumnos.mateo.id)!.resumen;
    expect(mateo).toMatchObject({ diasHabiles: 5, diasConRegistro: 4, diasSinRegistro: 1, llego: 1, tarde: 1, falta: 2, faltasJustificadas: 1, faltasInjustificadas: 1, porcentaje: 50 });
    const valentina = r.filas.find((f) => f.alumnoId === c.alumnos.valentina.id)!.resumen;
    expect(valentina.porcentaje).toBe(100);
    // 7 presencias de 9 días con registro.
    expect(r.total.porcentaje).toBe(77.8);
  });

  it("el reporte del alumno trae el detalle día a día", async () => {
    const r = await reporteAlumno(c.ctxDe("direccion"), { alumnoId: c.alumnos.mateo.id, ...RANGO });
    expect(r.detalle.map((d) => d.estado)).toEqual(["llego", "tarde", "falta", "falta", null]);
    expect(r.detalle[2].justificada).toBe(true);
    expect(r.detalle[3].justificada).toBe(false);
  });

  it("el resumen del colegio trae una fila por salón", async () => {
    const r = await resumenColegio(c.ctxDe("direccion"), RANGO);
    expect(r.filas.map((f) => f.salon).sort()).toEqual(["3.° B", "5.° A"]);
    expect(r.filas.find((f) => f.salonId === c.otroSalon.id)!.resumen.porcentaje).toBe(0);
  });

  it("el resumen del colegio aguanta un colegio grande (más de 32 767 registros en el rango)", async () => {
    // Prueba de estrés (docs/pruebas-de-estres.md): con las justificaciones en un include, Prisma mandaba cada id de
    // asistencia como parámetro y Postgres rechazaba la consulta (P2029) en un colegio de ~1 000 alumnos y 2 meses.
    const alumnos = Array.from({ length: 280 }, (_, i) => ({ id: crypto.randomUUID(), tenantId: otro.tenant.id, salonId: otro.salon.id, nombres: `Alumno ${i}`, apellidos: "Carga" }));
    await db.alumno.createMany({ data: alumnos });
    const dias = Array.from({ length: 120 }, (_, i) => sumarDias("2026-03-02", i));
    const filas = alumnos.flatMap((a) => dias.map((d) => ({ tenantId: otro.tenant.id, alumnoId: a.id, fecha: fechaDb(d), ambito: "dia", hora: "07:50", estado: "llego" as const, registradoPorId: otro.miembros.tutora.membership.id })));
    for (let i = 0; i < filas.length; i += 10_000) await db.asistencia.createMany({ data: filas.slice(i, i + 10_000) });
    const r = await resumenColegio(otro.ctxDe("direccion"), { desde: dias[0], hasta: dias.at(-1)! });
    expect(r.filas.find((f) => f.salonId === otro.salon.id)!.alumnos).toBeGreaterThanOrEqual(280);
    expect(r.total.porcentaje).toBeGreaterThan(0);
  }, 60_000);

  it("valida el rango: desde > hasta y más de un año fallan", async () => {
    await expect(reporteSalon(c.ctxDe("direccion"), { salonId: c.salon.id, desde: "2026-03-06", hasta: "2026-03-02" })).rejects.toThrow();
    await expect(resumenColegio(c.ctxDe("direccion"), { desde: "2025-01-01", hasta: "2026-06-01" })).rejects.toThrow();
  });

  it("no cuenta días futuros: el rango se recorta a hoy", async () => {
    const hoy = hoyDelColegio(c.ctxDe("direccion")).isoFecha;
    const r = await reporteSalon(c.ctxDe("direccion"), { salonId: c.salon.id, desde: restarDias(hoy, 10), hasta: sumarDias(hoy, 30) });
    expect(r.hastaEfectivo).toBe(hoy);
    expect(r.hasta).toBe(sumarDias(hoy, 30));
  });

  it("el profesor solo ve sus salones y alumnos", async () => {
    const tutora = c.ctxDe("tutora");
    expect((await reporteSalon(tutora, { salonId: c.salon.id, ...RANGO })).filas).toHaveLength(2);
    await esperarProhibido(reporteSalon(tutora, { salonId: c.otroSalon.id, ...RANGO }));
    await esperarProhibido(reporteAlumno(tutora, { alumnoId: c.alumnos.thiago.id, ...RANGO }));
    const ops = await opcionesDeReporte(tutora);
    expect(ops.salones.map((s) => s.id)).toEqual([c.salon.id]);
    expect(ops.alumnos.map((a) => a.id)).not.toContain(c.alumnos.thiago.id);
    expect((await resumenColegio(tutora, RANGO)).filas.map((f) => f.salonId)).toEqual([c.salon.id]);
  });

  it("el apoderado solo ve a sus hijos y no los reportes de salón ni del colegio", async () => {
    const madre = c.ctxDe("madre");
    expect((await reporteAlumno(madre, { alumnoId: c.alumnos.mateo.id, ...RANGO })).resumen.porcentaje).toBe(50);
    await esperarProhibido(reporteAlumno(madre, { alumnoId: c.alumnos.valentina.id, ...RANGO }));
    await esperarProhibido(reporteSalon(madre, { salonId: c.salon.id, ...RANGO }));
    await esperarProhibido(resumenColegio(madre, RANGO));
    expect((await opcionesDeReporte(madre)).alumnos.map((a) => a.id)).toEqual([c.alumnos.mateo.id]);
  });

  it("portería no accede a los reportes", async () => {
    const porteria = c.ctxDe("porteria");
    await esperarProhibido(reporteSalon(porteria, { salonId: c.salon.id, ...RANGO }));
    await esperarProhibido(reporteAlumno(porteria, { alumnoId: c.alumnos.mateo.id, ...RANGO }));
    await esperarProhibido(resumenColegio(porteria, RANGO));
  });

  it("aísla los colegios: dirección de otro colegio no ve salones ni alumnos ajenos", async () => {
    const ajena = otro.ctxDe("direccion");
    await expect(reporteSalon(ajena, { salonId: c.salon.id, ...RANGO })).rejects.toThrow();
    await expect(reporteAlumno(ajena, { alumnoId: c.alumnos.mateo.id, ...RANGO })).rejects.toThrow();
    const propio = await resumenColegio(ajena, RANGO);
    expect(propio.filas.map((f) => f.salonId)).not.toContain(c.salon.id);
  });

  it("audita ver y exportar", async () => {
    const antes = await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "reporte_asistencia", accion: "exportar" } });
    await reporteSalon(c.ctxDe("direccion"), { salonId: c.salon.id, ...RANGO }, { accion: "exportar", formato: "excel" });
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "reporte_asistencia", accion: "exportar" } })).toBe(antes + 1);
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "reporte_asistencia", accion: "ver" } })).toBeGreaterThan(0);
  });

  it("exporta un .xlsx y un PDF válidos", async () => {
    const reporte = await reporteSalon(c.ctxDe("direccion"), { salonId: c.salon.id, ...RANGO });
    expect(TIPO_XLSX).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const xlsx = await reporteAExcel(reporte);
    expect(xlsx.subarray(0, 2).toString()).toBe("PK");
    const ExcelJS = (await import("exceljs")).default;
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(xlsx as never);
    const texto = JSON.stringify(libro.getWorksheet("Asistencia")!.getSheetValues());
    expect(texto).toContain("Quispe");
    expect(texto).toContain("Total del salón");

    const pdf = await renderToBuffer(ReporteAsistenciaPdf({ reporte }));
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });
});

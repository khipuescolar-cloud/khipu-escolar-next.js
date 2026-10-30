import { renderToBuffer } from "@react-pdf/renderer";
import ExcelJS from "exceljs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { fechaDb } from "@/lib/fechas";
import { db } from "@/lib/server/db";
import { indicadoresTablero } from "@/lib/server/tablero";
import { consolidadoNotas } from "@/lib/server/tablero-consolidado";
import { consolidadoAExcel } from "@/lib/server/tablero-consolidado-excel";
import { ConsolidadoNotasPdf } from "@/lib/server/tablero-consolidado-pdf";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

// Dos semanas de marzo de 2026 sin feriados: lun 2 a vie 13.
describe("tablero de dirección", () => {
  let c: ColegioPrueba;
  let otro: ColegioPrueba;
  let base: ColegioPrueba;
  let periodoId: string;
  let periodoOtroId: string;

  beforeAll(async () => {
    c = await crearColegioPrueba({ plan: "pro" });
    otro = await crearColegioPrueba({ plan: "pro" });
    base = await crearColegioPrueba({ plan: "base" });
    const quien = c.miembros.tutora.membership.id;
    const { mateo, valentina, thiago } = c.alumnos;

    const registrar = (t: ColegioPrueba, alumnoId: string, fecha: string, estado: "llego" | "tarde" | "falta", ambito = "dia", hora = "07:50") =>
      db.asistencia.create({ data: { tenantId: t.tenant.id, alumnoId, fecha: fechaDb(fecha), ambito, cursoId: ambito === "dia" ? null : ambito, hora, estado, registradoPorId: t.miembros.tutora.membership.id } });
    await registrar(c, mateo.id, "2026-03-02", "llego");
    await registrar(c, mateo.id, "2026-03-03", "tarde");
    const falta = await registrar(c, mateo.id, "2026-03-04", "falta");
    await registrar(c, mateo.id, "2026-03-05", "falta");
    await registrar(c, mateo.id, "2026-03-02", "falta", c.cursoTutora.id, "09:00"); // el curso no pisa el ingreso del día
    for (const d of ["02", "03", "04", "05", "06", "09", "10", "11", "12", "13"]) await registrar(c, valentina.id, `2026-03-${d}`, "llego");
    await registrar(c, thiago.id, "2026-03-02", "falta");
    await registrar(c, mateo.id, "2026-03-07", "falta"); // sábado: no cuenta
    await db.justificacion.create({ data: { tenantId: c.tenant.id, asistenciaId: falta.id, apoderadoId: c.miembros.madre.membership.id, motivo: "Cita", estado: "pendiente" } });

    const periodo = await db.periodo.create({ data: { tenantId: c.tenant.id, anio: 2026, tipo: "bimestre", numero: 1, nombre: "I Bimestre", inicio: fechaDb("2026-03-02"), fin: fechaDb("2026-03-13") } });
    periodoId = periodo.id;
    const comps = await Promise.all(["Resuelve problemas de cantidad", "Resuelve problemas de forma", "Resuelve problemas de datos"].map((nombre, orden) => db.competencia.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, nombre, orden } })));
    const evals = await Promise.all(comps.map((comp, i) => db.evaluacion.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, periodoId, competenciaId: comp.id, titulo: `Práctica ${i + 1}`, fecha: fechaDb("2026-03-06") } })));
    const nota = (evaluacionId: string, alumnoId: string, valorLiteral: "AD" | "A" | "B" | "C") => db.nota.create({ data: { tenantId: c.tenant.id, evaluacionId, alumnoId, valorLiteral, registradoPorId: quien } });
    await nota(evals[0].id, mateo.id, "C");
    await nota(evals[0].id, valentina.id, "AD");
    await nota(evals[2].id, valentina.id, "B");
    const calif = (alumnoId: string, competenciaId: string, valorLiteral: "AD" | "A" | "B" | "C") => db.calificacionPeriodo.create({ data: { tenantId: c.tenant.id, alumnoId, competenciaId, periodoId, valorLiteral } });
    await calif(mateo.id, comps[0].id, "C");
    await calif(mateo.id, comps[1].id, "C");
    await calif(valentina.id, comps[0].id, "AD");
    await calif(valentina.id, comps[1].id, "A");
    await db.tarea.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, titulo: "Fichas", fechaEntrega: new Date("2026-03-10T13:00:00Z"), creadoPorId: quien, createdAt: new Date("2026-03-04T15:00:00Z") } });
    await db.tarea.create({ data: { tenantId: c.tenant.id, cursoId: c.cursoTutora.id, titulo: "Fuera del periodo", fechaEntrega: new Date("2026-05-10T13:00:00Z"), creadoPorId: quien, createdAt: new Date("2026-05-04T15:00:00Z") } });
    await db.reunion.create({ data: { tenantId: c.tenant.id, titulo: "Reunión de padres", inicio: new Date(Date.now() + 5 * 86_400_000), alcance: "colegio", convocadaPorId: c.miembros.direccion.membership.id } });

    // Datos del otro colegio con otros números: no deben filtrarse.
    await registrar(otro, otro.alumnos.mateo.id, "2026-03-02", "falta");
    const per = await db.periodo.create({ data: { tenantId: otro.tenant.id, anio: 2026, tipo: "bimestre", numero: 1, nombre: "I Bimestre", inicio: fechaDb("2026-03-02"), fin: fechaDb("2026-03-13") } });
    periodoOtroId = per.id;
    const compOtro = await db.competencia.create({ data: { tenantId: otro.tenant.id, cursoId: otro.cursoTutora.id, nombre: "Otra", orden: 0 } });
    await db.calificacionPeriodo.create({ data: { tenantId: otro.tenant.id, alumnoId: otro.alumnos.mateo.id, competenciaId: compOtro.id, periodoId: per.id, valorLiteral: "C" } });
    await db.tarea.create({ data: { tenantId: otro.tenant.id, cursoId: otro.cursoTutora.id, titulo: "Ajena", fechaEntrega: new Date("2026-03-10T13:00:00Z"), creadoPorId: otro.miembros.tutora.membership.id, createdAt: new Date("2026-03-04T15:00:00Z") } });
  });
  afterAll(async () => {
    await c?.limpiar();
    await otro?.limpiar();
    await base?.limpiar();
  });

  it("calcula asistencia: porcentaje, tendencia semanal, ranking y ausentismo crónico", async () => {
    const t = await indicadoresTablero(c.ctxDe("direccion"), { p: periodoId });
    expect(t.asistencia.diasHabiles).toBe(10);
    // Semana 1: Mateo 4 registros (1 llegó, 1 tarde, 2 faltas), Valentina 5 llegó, Thiago 1 falta = 7 de 10. Semana 2: 5 de 5.
    expect(t.asistencia.semanas).toEqual([
      { semana: "2026-03-02", porcentaje: 70, tardanzas: 1, faltas: 3, registros: 10 },
      { semana: "2026-03-09", porcentaje: 100, tardanzas: 0, faltas: 0, registros: 5 },
    ]);
    expect(t.asistencia).toMatchObject({ registros: 15, porcentaje: 80, tardanzas: 1, faltas: 3 });
    expect(t.asistencia.salones.map((s) => [s.salon, s.porcentaje])).toEqual([["3.° B", 85.7], ["5.° A", 0]]);
    // Mateo 50 % con 4 días; Thiago 0 % pero con 1 solo día: no se señala.
    expect(t.asistencia.cronicos.map((f) => [f.nombre, f.porcentaje])).toEqual([["Quispe, Mateo", 50]]);
    expect((await indicadoresTablero(c.ctxDe("direccion"), { p: periodoId, umbral: "50" })).asistencia.totalCronicos).toBe(0);
    expect(t.justificacionesPendientes).toBe(1);
  });

  it("calcula rendimiento, alumnos en riesgo, avance de registro y tareas", async () => {
    const t = await indicadoresTablero(c.ctxDe("direccion"), { p: periodoId });
    expect(t.rendimiento.origen).toBe("calificaciones");
    expect(t.rendimiento.total).toEqual({ AD: 1, A: 1, B: 0, C: 2 });
    expect(t.rendimiento.logroEsperado).toBe(50);
    expect(t.rendimiento.porSalon).toHaveLength(1);
    expect(t.rendimiento.porCurso[0]).toMatchObject({ nombre: "Matemática", salon: "3.° B", total: 4 });
    expect(t.rendimiento.enRiesgo).toEqual([expect.objectContaining({ nombre: "Quispe, Mateo", competenciasEnRiesgo: 2 })]);
    // 3 evaluaciones × 2 alumnos activos = 6 esperadas; hay 3 notas.
    const curso = t.avance.porCurso.find((x) => x.cursoId === c.cursoTutora.id)!;
    expect(curso).toMatchObject({ evaluaciones: 3, registradas: 3, esperadas: 6, porcentaje: 50, cerrado: false });
    expect(t.avance.porProfesor.find((p) => p.cursos === 1 && p.registradas === 3)?.porcentaje).toBe(50);
    expect(t.tareas.total).toBe(1);
    expect(t.reuniones.proximas).toBe(1);
  });

  it("aísla los datos por colegio", async () => {
    const t = await indicadoresTablero(otro.ctxDe("direccion"), { p: periodoOtroId });
    expect(t.asistencia).toMatchObject({ registros: 1, faltas: 1, porcentaje: 0 });
    expect(t.rendimiento.total).toEqual({ AD: 0, A: 0, B: 0, C: 1 });
    expect(t.tareas.total).toBe(1);
    expect(t.reuniones.proximas).toBe(0);
    expect(t.justificacionesPendientes).toBe(0);
    // Un periodo de otro colegio no se acepta: cae en el mes actual, sin sus datos.
    const mezcla = await indicadoresTablero(c.ctxDe("direccion"), { p: periodoOtroId });
    expect(mezcla.periodo.clave).toBe("mes");
    // El consolidado de un salón ajeno no existe para este colegio.
    await expect(consolidadoNotas(c.ctxDe("direccion"), { salonId: otro.salon.id, periodoId })).rejects.toThrow();
  });

  it("el plan base y los roles que no son dirección reciben 403", async () => {
    await esperarProhibido(indicadoresTablero(base.ctxDe("direccion")));
    await esperarProhibido(consolidadoNotas(base.ctxDe("direccion"), { salonId: base.salon.id, periodoId }));
    for (const rol of ["tutora", "otroProfesor", "porteria", "madre"] as const) {
      await esperarProhibido(indicadoresTablero(c.ctxDe(rol)));
      await esperarProhibido(consolidadoNotas(c.ctxDe(rol), { salonId: c.salon.id, periodoId }));
    }
  });

  it("el consolidado trae alumnos × competencias y se exporta a Excel y PDF", async () => {
    const dir = c.ctxDe("direccion");
    const k = await consolidadoNotas(dir, { salonId: c.salon.id, periodoId });
    expect(k.columnas.map((x) => x.competencia)).toEqual(["Resuelve problemas de cantidad", "Resuelve problemas de forma", "Resuelve problemas de datos"]);
    expect(k.filas.map((f) => f.nombre)).toEqual(["Quispe, Mateo", "Ríos, Valentina"]);
    expect(k.filas[1].valores.map((v) => v?.valorLiteral)).toEqual(["AD", "A", "B"]); // la 3.ª sale de la nota (sugerida)
    expect(k.filas[0].valores[2]).toBeNull();
    expect(k.sugeridas).toBe(1);

    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load((await consolidadoAExcel(k)) as unknown as ArrayBuffer);
    const hoja = libro.getWorksheet("Consolidado")!;
    const filas: string[][] = [];
    hoja.eachRow((fila) => filas.push((fila.values as unknown[]).slice(1).map((v) => String(v ?? ""))));
    expect(filas.some((f) => f[0] === "Quispe, Mateo" && f.slice(1, 3).join() === "C,C")).toBe(true);
    expect(filas.some((f) => f[0] === "% logro esperado")).toBe(true);

    const pdf = await renderToBuffer(ConsolidadoNotasPdf({ consolidado: k }));
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    const exportado = await consolidadoNotas(dir, { salonId: c.salon.id, periodoId }, { accion: "exportar", formato: "excel" });
    expect(exportado.filas).toHaveLength(2);
    expect(await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "consolidado_notas", accion: "exportar" } })).toBe(1);
  });

  it("sin calificaciones del periodo usa las notas de las evaluaciones", async () => {
    await db.calificacionPeriodo.deleteMany({ where: { tenantId: c.tenant.id } });
    const t = await indicadoresTablero(c.ctxDe("direccion"), { p: periodoId });
    expect(t.rendimiento.origen).toBe("notas");
    expect(t.rendimiento.total).toEqual({ AD: 1, A: 0, B: 1, C: 1 });
    expect(t.rendimiento.totalEnRiesgo).toBe(0); // Mateo solo tiene 1 competencia con C
  });
});

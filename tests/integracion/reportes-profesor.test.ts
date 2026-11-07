// Reportes del profesor (specs/27): su salón de tutoría (últimos 7 días) y el historial de sus cursos, con permisos.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardarLista, hoyDelColegio } from "@/lib/server/asistencia";
import { db } from "@/lib/server/db";
import { detalleCurso, esReporteDeCursos, historialCurso, opcionesDeReporte, panelReportesProfesor, reporteAlumno, reporteCursos, reporteSalon } from "@/lib/server/reportes-asistencia";
import { crearColegioPrueba, esperarProhibido, type ColegioPrueba } from "./ayudantes/colegio-prueba";

describe("reportes del profesor", () => {
  let c: ColegioPrueba;
  let arteId: string;
  let hoy: string;

  beforeAll(async () => {
    c = await crearColegioPrueba({ prefijo: "test-rep-prof" });
    hoy = hoyDelColegio(c.ctxDe("tutora")).isoFecha;
    // Pedro dicta Arte en 3.° B (no es su tutor); Lucía es la tutora de 3.° B y dicta Matemática.
    arteId = (await db.curso.create({ data: { tenantId: c.tenant.id, salonId: c.salon.id, nombre: "Arte y Cultura", profesorId: c.miembros.otroProfesor.membership.id } })).id;
    await guardarLista(c.ctxDe("tutora"), { salonId: c.salon.id, ambito: "dia", registros: [{ alumnoId: c.alumnos.mateo.id, estado: "llego" }, { alumnoId: c.alumnos.valentina.id, estado: "falta" }] });
    await guardarLista(c.ctxDe("otroProfesor"), { salonId: c.salon.id, ambito: arteId, registros: [{ alumnoId: c.alumnos.mateo.id, estado: "tarde" }, { alumnoId: c.alumnos.valentina.id, estado: "falta" }] });
  });
  afterAll(async () => {
    await c?.limpiar();
  });

  it("la tutora ve primero su salón (últimos 7 días) y luego sus cursos", async () => {
    const p = await panelReportesProfesor(c.ctxDe("tutora"));
    expect(p.hasta).toBe(hoy);
    expect(p.tutorias.map((t) => t.salon.nombre)).toEqual(["3.° B"]);
    expect(p.cursos).toEqual([{ id: c.cursoTutora.id, nombre: "Matemática", salon: "3.° B", porCurso: true }]);
  });

  it("un profesor sin tutoría en el salón solo ve sus cursos de ese salón", async () => {
    const p = await panelReportesProfesor(c.ctxDe("otroProfesor"));
    expect(p.tutorias.map((t) => t.salon.nombre)).toEqual(["5.° A"]);
    expect(p.cursos.map((x) => `${x.nombre} · ${x.salon}`).sort()).toEqual(["Arte y Cultura · 3.° B", "Ciencia · 5.° A"]);
  });

  it("historial del curso: alumnos × clases con su resumen", async () => {
    const r = await historialCurso(c.ctxDe("otroProfesor"), { cursoId: arteId, desde: hoy, hasta: hoy });
    expect(r).toMatchObject({ tipo: "curso", curso: { nombre: "Arte y Cultura" }, salon: { nombre: "3.° B" }, fechas: [hoy], profesor: "Pedro Prueba" });
    expect(r.filas.map((f) => [f.nombres, f.estados[0]])).toEqual([["Mateo", "tarde"], ["Valentina", "falta"]]);
    expect(r.total).toMatchObject({ clases: 1, tarde: 1, falta: 1, porcentaje: 50 });
  });

  it("lo ven el profesor del curso, la tutora del salón y dirección; otro profesor y la familia no", async () => {
    const entrada = { cursoId: arteId, desde: hoy, hasta: hoy };
    await expect(historialCurso(c.ctxDe("tutora"), entrada)).resolves.toMatchObject({ tipo: "curso" });
    await expect(historialCurso(c.ctxDe("direccion"), entrada)).resolves.toMatchObject({ tipo: "curso" });
    // Pedro dicta Arte en 3.° B, pero no Matemática ni es tutor: no ve Matemática.
    await esperarProhibido(historialCurso(c.ctxDe("otroProfesor"), { ...entrada, cursoId: c.cursoTutora.id }));
    await esperarProhibido(historialCurso(c.ctxDe("madre"), entrada));
    await esperarProhibido(panelReportesProfesor(c.ctxDe("direccion")));
  });

  it("ver el historial queda en la auditoría", async () => {
    const n = await db.auditoria.count({ where: { tenantId: c.tenant.id, entidad: "reporte_asistencia", entidadId: arteId } });
    expect(n).toBeGreaterThan(0);
  });

  describe("filtro «Curso»: fuera de su tutoría, solo sus cursos", () => {
    it("las opciones traen sus salones, sus cursos y todos los de su tutoría", async () => {
      const pedro = await opcionesDeReporte(c.ctxDe("otroProfesor"));
      expect(pedro.tutorias).toEqual([c.otroSalon.id]);
      expect(pedro.salones.map((s) => s.nombre)).toEqual(["3.° B", "5.° A"]);
      expect(pedro.cursos.map((x) => `${x.nombre} · ${x.salon}`)).toEqual(["Arte y Cultura · 3.° B", "Ciencia · 5.° A"]);
      const lucia = await opcionesDeReporte(c.ctxDe("tutora"));
      expect(lucia.cursos.map((x) => x.nombre).sort()).toEqual(["Arte y Cultura", "Matemática"]);
      expect((await opcionesDeReporte(c.ctxDe("direccion"))).cursos).toEqual([]);
    });

    it("en un salón ajeno no ve la asistencia al colegio; en su tutoría sí", async () => {
      const pedro = c.ctxDe("otroProfesor");
      await esperarProhibido(reporteSalon(pedro, { salonId: c.salon.id, desde: hoy, hasta: hoy }));
      await esperarProhibido(reporteAlumno(pedro, { alumnoId: c.alumnos.mateo.id, desde: hoy, hasta: hoy }));
      expect(await esReporteDeCursos(pedro, { salonId: c.salon.id, desde: hoy, hasta: hoy })).toBe(true);
      expect(await esReporteDeCursos(pedro, { alumnoId: c.alumnos.mateo.id, desde: hoy, hasta: hoy })).toBe(true);
      expect(await esReporteDeCursos(pedro, { salonId: c.otroSalon.id, desde: hoy, hasta: hoy })).toBe(false);
      expect(await esReporteDeCursos(pedro, { desde: hoy, hasta: hoy })).toBe(true);
      expect(await esReporteDeCursos(c.ctxDe("direccion"), { salonId: c.salon.id, desde: hoy, hasta: hoy })).toBe(false);
    });

    it("«Mis cursos» en un salón ajeno: solo sus cursos, con faltas y tardanzas", async () => {
      const r = await reporteCursos(c.ctxDe("otroProfesor"), { salonId: c.salon.id, cursoId: "mis", desde: hoy, hasta: hoy });
      expect(r.filas).toMatchObject([{ curso: "Arte y Cultura", registros: 2, faltas: 1, tardanzas: 1, faltasConIngreso: 0 }]);
      expect(r.detalle).toBeNull();
      // Sin filtro: todos sus cursos (también los de su tutoría, aunque aún no tengan registros).
      const todos = await reporteCursos(c.ctxDe("otroProfesor"), { cursoId: "mis", desde: hoy, hasta: hoy });
      expect(todos.filas.map((f) => [f.curso, f.registros])).toEqual([["Arte y Cultura", 2], ["Ciencia", 0]]);
    });

    it("en su tutoría ve todos los cursos del salón", async () => {
      const r = await reporteCursos(c.ctxDe("tutora"), { salonId: c.salon.id, cursoId: "mis", desde: hoy, hasta: hoy });
      expect(r.filas.map((f) => f.curso)).toEqual(["Arte y Cultura", "Matemática"]);
      await expect(detalleCurso(c.ctxDe("tutora"), { cursoId: arteId, desde: hoy, hasta: hoy })).resolves.toMatchObject({ curso: { nombre: "Arte y Cultura" } });
    });

    it("un alumno de un salón ajeno: solo sus faltas y tardanzas a clase en los cursos del profesor", async () => {
      const r = await reporteCursos(c.ctxDe("otroProfesor"), { alumnoId: c.alumnos.mateo.id, cursoId: "mis", desde: hoy, hasta: hoy });
      expect(r.alumno).toMatchObject({ nombres: "Mateo", salon: "3.° B" });
      expect(r.detalle).toMatchObject([{ curso: "Arte y Cultura", estado: "tarde", fecha: hoy }]);
      await esperarProhibido(reporteCursos(c.ctxDe("otroProfesor"), { alumnoId: c.alumnos.mateo.id, cursoId: c.cursoTutora.id, desde: hoy, hasta: hoy }));
      await esperarProhibido(reporteCursos(c.ctxDe("tutora"), { alumnoId: c.alumnos.thiago.id, cursoId: "mis", desde: hoy, hasta: hoy }));
      await esperarProhibido(reporteCursos(c.ctxDe("madre"), { cursoId: "mis", desde: hoy, hasta: hoy }));
      // El profesor del curso ve su detalle aunque no sea tutor del salón.
      await expect(detalleCurso(c.ctxDe("otroProfesor"), { cursoId: arteId, desde: hoy, hasta: hoy })).resolves.toMatchObject({ filas: [{}, {}] });
    });

    it("por grado: los cursos que dicta en ese grado", async () => {
      await db.salon.update({ where: { id: c.salon.id }, data: { grado: 3 } });
      await db.salon.update({ where: { id: c.otroSalon.id }, data: { grado: 5 } });
      const r = await reporteCursos(c.ctxDe("otroProfesor"), { grado: { nivel: "primaria", grado: 3 }, cursoId: "mis", desde: hoy, hasta: hoy });
      expect(r.filas.map((f) => f.curso)).toEqual(["Arte y Cultura"]);
      await esperarProhibido(reporteCursos(c.ctxDe("tutora"), { grado: { nivel: "primaria", grado: 5 }, cursoId: "mis", desde: hoy, hasta: hoy }));
    });
  });
});

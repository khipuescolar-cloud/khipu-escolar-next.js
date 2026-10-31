// Reportes del profesor (specs/27): su salón de tutoría (últimos 7 días) y el historial de sus cursos, con permisos.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardarLista, hoyDelColegio } from "@/lib/server/asistencia";
import { db } from "@/lib/server/db";
import { historialCurso, panelReportesProfesor } from "@/lib/server/reportes-asistencia";
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
});

import "server-only";
import { forbidden } from "next/navigation";
import type { Literal, ValorCalificacion } from "@/lib/calificaciones";
import { fechaDeColumnaDate } from "@/lib/fechas";
import { libretaVisibleParaFamilia } from "@/lib/libreta-publicacion";
import { tituloProfesor } from "@/lib/roles";
import { auditar } from "./auditoria";
import { requireFeature } from "./plan";
import { requireAlumnoVisible, type TenantContext } from "./tenant";

export type DatosLibreta = Awaited<ReturnType<typeof datosLibreta>>;

/**
 * Datos de la libreta de un alumno en un periodo: cursos → competencias → calificación + conclusión,
 * y resumen de asistencia. Valida plan y alcance (apoderado: solo sus hijos; profesor: sus salones; dirección: todos).
 * Registra la vista o la descarga en la auditoría.
 */
export async function datosLibreta(ctx: TenantContext, alumnoId: string, periodoId: string, accion: "ver" | "exportar" = "ver") {
  requireFeature(ctx, "libreta");
  await requireAlumnoVisible(ctx, alumnoId);
  const [alumno, periodo] = await Promise.all([
    ctx.db.alumno.findFirst({ where: { id: alumnoId }, include: { salon: { include: { tutor: { include: { user: true } } } } } }),
    ctx.db.periodo.findFirst({ where: { id: periodoId } }),
  ]);
  if (!alumno || !periodo) forbidden();
  // Las familias solo ven periodos publicados (o antiguos ya cerrados); profesores y dirección ven todos.
  if (ctx.rol === "apoderado" && !libretaVisibleParaFamilia(periodo)) forbidden();

  const cursos = await ctx.db.curso.findMany({ where: { salonId: alumno.salonId }, orderBy: { nombre: "asc" } });
  const cursoIds = cursos.map((c) => c.id);
  const [competencias, califs, asistencias] = await Promise.all([
    ctx.db.competencia.findMany({ where: { cursoId: { in: cursoIds } }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] }),
    ctx.db.calificacionPeriodo.findMany({ where: { alumnoId, periodoId } }),
    ctx.db.asistencia.findMany({ where: { alumnoId, fecha: { gte: periodo.inicio, lte: periodo.fin } } }),
  ]);

  // Asistencia: una fila por día. Si hay asistencia del día (portería/tutor) manda; si no, la del curso.
  const porDia = new Map<string, (typeof asistencias)[number]>();
  for (const a of asistencias) {
    const dia = fechaDeColumnaDate(a.fecha);
    const previa = porDia.get(dia);
    if (!previa || (a.ambito === "dia" && previa.ambito !== "dia")) porDia.set(dia, a);
  }
  const asistencia = { llego: 0, tarde: 0, falta: 0, problema: 0, total: porDia.size };
  for (const a of porDia.values()) asistencia[a.estado] += 1;

  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion, entidad: "libreta", entidadId: alumnoId, detalle: { periodoId },
  });

  return {
    colegio: { nombre: ctx.tenant.nombre, ciudad: ctx.tenant.ciudad },
    escala: ctx.tenant.escalaCalificacion,
    alumno: {
      id: alumno.id, nombres: alumno.nombres, apellidos: alumno.apellidos, codigo: alumno.codigo,
      salon: alumno.salon.nombre, tutor: alumno.salon.tutor ? `${alumno.salon.tutor.user.nombres} ${alumno.salon.tutor.user.apellidos}` : null,
      tutorTitulo: tituloProfesor(alumno.salon.tutor?.user.genero, "tutor"),
    },
    periodo: { id: periodo.id, nombre: periodo.nombre, anio: periodo.anio, cerrado: periodo.cerrado },
    cursos: cursos.map((curso) => ({
      nombre: curso.nombre,
      competencias: competencias
        .filter((c) => c.cursoId === curso.id)
        .map((c) => {
          const g = califs.find((x) => x.competenciaId === c.id);
          return {
            nombre: c.nombre,
            calificacion: g
              ? ({ valorLiteral: g.valorLiteral as Literal | null, valorNumerico: g.valorNumerico === null ? null : Number(g.valorNumerico.toString()) } as ValorCalificacion)
              : null,
            conclusion: g?.conclusion ?? null,
          };
        }),
    })),
    asistencia,
  };
}

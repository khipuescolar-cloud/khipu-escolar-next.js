import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { TipoIncidencia } from "@/generated/prisma/enums";
import { urlColegio } from "@/lib/dominio";
import { fechaDb, isoDeFechaDb, momentoEnZona } from "@/lib/fechas";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { encolarAviso } from "./notificaciones/encolar";
import { sincronizarNsp } from "./nsp";
import { requireFeature } from "./plan";
import { requireRol, salonIdsVisibles, type TenantContext } from "./tenant";

// Incidencias y retiros anticipados (specs/37). Entrar al colegio no significa estar en todas las clases: si un alumno
// se accidenta o se retira, las clases afectadas reciben una falta a clase (origen `incidencia`), que pone NSP en las
// actividades de ese día y se justifica como cualquier falta. La descripción es sensible: solo la ven dirección, el
// tutor del salón y quien la registró. Una incidencia NO aprueba por sí sola una recuperación académica.

export const TIPOS_INCIDENCIA = ["accidente", "salud", "otro"] as const satisfies readonly TipoIncidencia[];
export const NOMBRE_TIPO_INCIDENCIA: Record<TipoIncidencia, string> = { accidente: "Accidente", salud: "Malestar o salud", otro: "Otra incidencia" };

const ROLES = ["direccion", "profesor", "administrativo"] as const;
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Escribe la hora como 10:30.");

const esquema = z.object({
  alumnoId: z.uuid("Elige al alumno."),
  fecha: z.iso.date("Elige la fecha."),
  hora: hhmm,
  tipo: z.enum(TIPOS_INCIDENCIA, "Elige el tipo de incidencia."),
  descripcion: z.string().trim().min(3, "Describe brevemente qué pasó.").max(1000, "La descripción es muy larga (máximo 1000 caracteres)."),
  retiro: z.boolean().default(false),
  horaRetiro: hhmm.optional().or(z.literal("").transform(() => undefined)),
  cursoIds: z.array(z.uuid()).max(20).default([]),
});

async function alumnoEnAlcance(ctx: TenantContext, alumnoId: string) {
  const alumno = await ctx.db.alumno.findFirst({
    where: { id: alumnoId, estado: "activo" },
    select: { id: true, nombres: true, apellidos: true, salonId: true, salon: { select: { tutorId: true, nombre: true } } },
  });
  if (!alumno) forbidden();
  if (ctx.rol === "profesor" && !(await salonIdsVisibles(ctx)).includes(alumno.salonId)) forbidden();
  return alumno;
}

/** Cursos del salón del alumno y los sugeridos según el horario (clases de ese día desde la hora indicada). */
export async function cursosParaIncidencia(ctx: TenantContext, alumnoId: string, fecha: string, desde: string) {
  requireFeature(ctx, "asistencia");
  requireRol(ctx, [...ROLES]);
  const alumno = await alumnoEnAlcance(ctx, alumnoId);
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay(); // 0 = domingo … 6 = sábado; el horario usa 1 = lunes … 5 = viernes
  const [cursos, bloques] = await Promise.all([
    ctx.db.curso.findMany({ where: { salonId: alumno.salonId }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    ctx.db.bloqueHorario.findMany({
      where: { salonId: alumno.salonId, dia, cursoId: { not: null } },
      select: { cursoId: true, periodo: { select: { horaInicio: true, horaFin: true } } },
    }),
  ]);
  const sugeridos = new Set(bloques.filter((b) => b.periodo.horaFin > desde).map((b) => b.cursoId!));
  return cursos.map((c) => ({
    ...c,
    sugerido: sugeridos.has(c.id),
    hora: bloques.filter((b) => b.cursoId === c.id).map((b) => b.periodo.horaInicio).sort()[0] ?? null,
  }));
}

/**
 * Registra una incidencia (dirección, administrativo o profesor del salón). Cada curso afectado recibe una falta a clase
 * de ese día (si aún no tenía registro), se ponen los NSP y se avisa a sus profesores, sin el detalle de la incidencia.
 */
export async function registrarIncidencia(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<Resultado> {
  requireFeature(ctx, "asistencia");
  requireRol(ctx, [...ROLES]);
  const d = esquema.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  if (d.data.retiro && !d.data.horaRetiro) return fallo("Indica la hora del retiro.");
  const hoy = momentoEnZona(ahora, ctx.tenant.zonaHoraria).isoFecha;
  if (d.data.fecha > hoy) return fallo("No se puede registrar una incidencia de un día que aún no llega.");
  const alumno = await alumnoEnAlcance(ctx, d.data.alumnoId);
  const cursos = await ctx.db.curso.findMany({
    where: { id: { in: d.data.cursoIds }, salonId: alumno.salonId },
    select: { id: true, nombre: true, profesorId: true, profesor: { select: { estado: true, user: { select: { email: true } } } } },
  });
  if (cursos.length !== d.data.cursoIds.length) return fallo("Algún curso no es del salón del alumno.");
  const fecha = fechaDb(d.data.fecha);
  const horaFalta = d.data.horaRetiro ?? d.data.hora;
  const nota = d.data.retiro ? `Retiro anticipado (${d.data.horaRetiro})` : "Incidencia";

  const { incidencia, faltas } = await ctx.db.$transaction(async (tx) => {
    const incidencia = await tx.incidencia.create({
      data: {
        tenantId: ctx.tenant.id, alumnoId: alumno.id, fecha, hora: d.data.hora, tipo: d.data.tipo, descripcion: d.data.descripcion,
        retiro: d.data.retiro, horaRetiro: d.data.retiro ? d.data.horaRetiro! : null, registradoPorId: ctx.membership.id,
      },
    });
    if (cursos.length > 0) {
      await tx.incidenciaCurso.createMany({ data: cursos.map((c) => ({ tenantId: ctx.tenant.id, incidenciaId: incidencia.id, cursoId: c.id })) });
    }
    // Falta a clase solo donde aún no había registro: no se pisa lo que ya marcó el profesor.
    const r = await tx.asistencia.createMany({
      data: cursos.map((c) => ({
        tenantId: ctx.tenant.id, alumnoId: alumno.id, cursoId: c.id, ambito: c.id, fecha, hora: horaFalta,
        estado: "falta" as const, nota, origen: "incidencia" as const, registradoPorId: ctx.membership.id, incidenciaId: incidencia.id,
      })),
      skipDuplicates: true,
    });
    return { incidencia, faltas: r.count };
  });
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "incidencia", entidadId: incidencia.id,
    detalle: { alumnoId: alumno.id, fecha: d.data.fecha, retiro: d.data.retiro, cursos: cursos.length, faltas },
  });
  await sincronizarNsp(ctx.db, ctx.tenant, { fecha, alumnoIds: [alumno.id] }, ahora);
  let docentes = 0;
  for (const c of cursos) {
    if (!c.profesor || c.profesor.estado !== "activa" || c.profesorId === ctx.membership.id) continue;
    await encolarAviso(ctx.db, {
      tenantId: ctx.tenant.id, tipo: "asistencia", canal: "correo", destinatario: c.profesor.user.email, plantilla: "incidencia_docente",
      referenciaId: incidencia.id,
      payload: {
        colegio: ctx.tenant.nombre, alumno: `${alumno.nombres} ${alumno.apellidos}`.trim(), fecha: d.data.fecha,
        ...(d.data.retiro ? { hora: d.data.horaRetiro } : {}), curso: c.nombre, url: urlColegio(ctx.tenant.slug, "/notas"),
      },
    });
    docentes += 1;
  }
  const textoCursos = cursos.length === 0 ? "" : ` Registramos la inasistencia en ${cursos.length} ${cursos.length === 1 ? "clase" : "clases"}${docentes > 0 ? ` y avisamos a ${docentes} ${docentes === 1 ? "profesor" : "profesores"}` : ""}.`;
  return ok(`Incidencia registrada.${textoCursos}`);
}

export type IncidenciaVista = {
  id: string; fecha: string; hora: string; alumno: string; salon: string; tipo: TipoIncidencia; retiro: boolean; horaRetiro: string | null;
  cursos: string[]; registradoPor: string;
  /** Solo para dirección, el tutor del salón y quien la registró; los demás ven null (dato sensible). */
  descripcion: string | null;
};

/** Incidencias recientes del alcance del usuario (dirección y administrativo: todas; profesor: sus salones). */
export async function listarIncidencias(ctx: TenantContext, opciones: { desde?: string } = {}): Promise<IncidenciaVista[]> {
  requireFeature(ctx, "asistencia");
  requireRol(ctx, [...ROLES]);
  const salones = ctx.rol === "profesor" ? await salonIdsVisibles(ctx) : null;
  const filas = await ctx.db.incidencia.findMany({
    where: { ...(salones ? { alumno: { salonId: { in: salones } } } : {}), ...(opciones.desde ? { fecha: { gte: fechaDb(opciones.desde) } } : {}) },
    orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    take: 100,
    include: {
      alumno: { select: { nombres: true, apellidos: true, salon: { select: { nombre: true, tutorId: true } } } },
      cursos: { select: { curso: { select: { nombre: true } } } },
      registradoPor: { select: { id: true, user: { select: { nombres: true, apellidos: true } } } },
    },
  });
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "incidencia", detalle: { cantidad: filas.length } });
  return filas.map((f) => {
    const puedeVerDetalle = ctx.rol === "direccion" || f.alumno.salon.tutorId === ctx.membership.id || f.registradoPor.id === ctx.membership.id;
    return {
      id: f.id, fecha: isoDeFechaDb(f.fecha), hora: f.hora, alumno: `${f.alumno.apellidos}, ${f.alumno.nombres}`, salon: f.alumno.salon.nombre,
      tipo: f.tipo, retiro: f.retiro, horaRetiro: f.horaRetiro, cursos: f.cursos.map((c) => c.curso.nombre),
      registradoPor: `${f.registradoPor.user.nombres} ${f.registradoPor.user.apellidos}`.trim(),
      descripcion: puedeVerDetalle ? f.descripcion : null,
    };
  });
}

/** Alumnos a los que el usuario puede registrar una incidencia. */
export async function alumnosParaIncidencia(ctx: TenantContext) {
  requireFeature(ctx, "asistencia");
  requireRol(ctx, [...ROLES]);
  const salones = ctx.rol === "profesor" ? await salonIdsVisibles(ctx) : null;
  return ctx.db.alumno.findMany({
    where: { estado: "activo", ...(salones ? { salonId: { in: salones } } : {}), salon: { archivadoAt: null } },
    select: { id: true, nombres: true, apellidos: true, salon: { select: { nombre: true } } },
    orderBy: [{ salon: { nombre: "asc" } }, { apellidos: "asc" }, { nombres: "asc" }],
  });
}

import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { Literal, ValorCalificacion } from "@/lib/calificaciones";
import { fechaDeColumnaDate } from "@/lib/fechas";
import { libretaVisibleParaFamilia } from "@/lib/libreta-publicacion";
import { esVistaFamilia, tituloProfesor } from "@/lib/roles";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { auditar } from "./auditoria";
import { requireFeature } from "./plan";
import { requireAlumnoVisible, type TenantContext } from "./tenant";


/** Salones cuya libreta puede consultar el personal: solo tutoría o dirección. */
export async function salonIdsLibreta(ctx: TenantContext): Promise<string[]> {
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  const salones = await ctx.db.salon.findMany({
    where: { archivadoAt: null, ...(ctx.rol === "profesor" ? { tutorId: ctx.membership.id } : {}) },
    select: { id: true },
  });
  return salones.map((s) => s.id);
}

/** Valida también el alcance del tutor antes de leer o descargar la libreta. */
export async function requireLibretaVisible(ctx: TenantContext, alumnoId: string): Promise<void> {
  if (ctx.rol === "profesor") {
    const alumno = await ctx.db.alumno.findFirst({
      where: { id: alumnoId, salon: { tutorId: ctx.membership.id, archivadoAt: null } },
      select: { id: true },
    });
    if (!alumno) forbidden();
    return;
  }
  if (ctx.rol !== "direccion" && ctx.rol !== "apoderado") forbidden();
  await requireAlumnoVisible(ctx, alumnoId);
}

/** Resumen del salón en consultas agrupadas; listar no audita la vista de cada alumno. */
export async function resumenLibretasSalon(ctx: TenantContext, salonId: string, periodoId: string) {
  requireFeature(ctx, "libreta");
  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  if (!(await salonIdsLibreta(ctx)).includes(salonId)) forbidden();
  const [salon, periodo] = await Promise.all([
    ctx.db.salon.findFirst({ where: { id: salonId }, select: { id: true, nombre: true, nivel: true } }),
    ctx.db.periodo.findFirst({ where: { id: periodoId }, select: { id: true, nombre: true, anio: true, niveles: true } }),
  ]);
  if (!salon || !periodo || !periodo.niveles.includes(salon.nivel)) forbidden();
  const [alumnos, cursos, calificaciones, emitidas] = await Promise.all([
    ctx.db.alumno.findMany({ where: { salonId, estado: "activo" }, select: { id: true, nombres: true, apellidos: true }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] }),
    ctx.db.curso.findMany({ where: { salonId }, select: { id: true, nombre: true, competencias: { select: { id: true, nombre: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] } }, orderBy: { nombre: "asc" } }),
    ctx.db.calificacionPeriodo.findMany({ where: { periodoId, alumno: { salonId, estado: "activo" } }, select: { alumnoId: true, competenciaId: true, valorLiteral: true, valorNumerico: true } }),
    ctx.db.libretaEmitida.findMany({ where: { periodoId, alumno: { salonId, estado: "activo" } }, select: { alumnoId: true, version: true, datos: true }, orderBy: { version: "desc" } }),
  ]);
  const enVivo = new Map(calificaciones.map((g) => [g.alumnoId + ":" + g.competenciaId, {
    valorLiteral: g.valorLiteral as Literal | null,
    valorNumerico: g.valorNumerico === null ? null : Number(g.valorNumerico.toString()),
  }]));
  const emitidaPorAlumno = new Map<string, (typeof emitidas)[number]>();
  for (const e of emitidas) if (!emitidaPorAlumno.has(e.alumnoId)) emitidaPorAlumno.set(e.alumnoId, e);
  return {
    salon, periodo, cursos, escala: ctx.tenant.escalaCalificacion,
    alumnos: alumnos.map((a) => {
      const emitida = emitidaPorAlumno.get(a.id);
      const valores = new Map<string, ValorCalificacion>();
      if (emitida) {
        const datos = emitida.datos as unknown as LibretaConstruida;
        for (const c of datos.cursos) for (const k of c.competencias) if (k.calificacion) valores.set(k.id, k.calificacion);
      } else {
        for (const c of cursos) for (const k of c.competencias) {
          const valor = enVivo.get(a.id + ":" + k.id);
          if (valor) valores.set(k.id, valor);
        }
      }
      return { id: a.id, nombre: a.apellidos + ", " + a.nombres, version: emitida?.version ?? null,
        calificaciones: Object.fromEntries(valores) };
    }),
  };
}

export type ResumenLibretasSalon = Awaited<ReturnType<typeof resumenLibretasSalon>>;

export type DatosLibreta = Awaited<ReturnType<typeof datosLibreta>>;

/**
 * Datos de la libreta de un alumno en un periodo: cursos → competencias → calificación + conclusión,
 * y resumen de asistencia. Valida plan y alcance (apoderado: solo sus hijos; profesor: sus salones; dirección: todos).
 * Registra la vista o la descarga en la auditoría.
 */
export async function datosLibreta(ctx: TenantContext, alumnoId: string, periodoId: string, accion: "ver" | "exportar" = "ver") {
  requireFeature(ctx, "libreta");
  if (ctx.rol === "alumno") forbidden(); // la libreta es de la familia (specs/11)
  await requireLibretaVisible(ctx, alumnoId);
  const [alumno, periodo, emitida] = await Promise.all([
    ctx.db.alumno.findFirst({ where: { id: alumnoId }, include: { salon: { select: { nivel: true, tutorId: true } } } }),
    ctx.db.periodo.findFirst({ where: { id: periodoId } }),
    // La versión emitida vigente (la más reciente) manda sobre los datos en vivo (specs/37).
    ctx.db.libretaEmitida.findFirst({
      where: { alumnoId, periodoId }, orderBy: { version: "desc" },
      select: { version: true, datos: true, emitidaAt: true, emitidaPor: { select: { user: { select: { nombres: true, apellidos: true } } } } },
    }),
  ]);
  if (!alumno || !periodo || !periodo.niveles.includes(alumno.salon.nivel)) forbidden();
  // Las familias y el propio alumno solo ven periodos publicados (o antiguos ya cerrados); profesores y dirección ven todos.
  if (esVistaFamilia(ctx.rol) && !libretaVisibleParaFamilia(periodo)) forbidden();
  await auditar({
    tenantId: ctx.tenant.id, actorId: ctx.user.id, accion, entidad: "libreta", entidadId: alumnoId, detalle: { periodoId, ...(emitida ? { version: emitida.version } : {}) },
  });
  if (emitida) {
    return {
      ...(emitida.datos as unknown as LibretaConstruida),
      emision: {
        version: emitida.version, emitidaAt: emitida.emitidaAt,
        por: `${emitida.emitidaPor.user.nombres} ${emitida.emitidaPor.user.apellidos}`.trim(),
      },
      // Emitida: el comentario del tutor ya no se edita (se corrige por rectificación).
      puedeComentar: false,
    };
  }
  return {
    ...(await construirLibreta(ctx, alumnoId, periodoId)),
    emision: null,
    /** El usuario es el tutor del salón y el periodo sigue abierto: puede escribir el comentario. */
    puedeComentar: ctx.rol === "profesor" && alumno.salon.tutorId === ctx.membership.id && !periodo.cerrado,
  };
}

export type LibretaConstruida = Awaited<ReturnType<typeof construirLibreta>>;

/** Datos en vivo de la libreta (sin validar alcance ni auditar): base de la vista y de la versión emitida. */
export async function construirLibreta(ctx: TenantContext, alumnoId: string, periodoId: string) {
  const [alumno, periodo] = await Promise.all([
    ctx.db.alumno.findFirst({ where: { id: alumnoId }, include: { salon: { include: { tutor: { include: { user: true } } } } } }),
    ctx.db.periodo.findFirst({ where: { id: periodoId } }),
  ]);
  if (!alumno || !periodo) forbidden();

  const cursos = await ctx.db.curso.findMany({ where: { salonId: alumno.salonId }, orderBy: { nombre: "asc" } });
  const cursoIds = cursos.map((c) => c.id);
  const [competencias, califs, asistencias, evaluados, comentarioTutor] = await Promise.all([
    ctx.db.competencia.findMany({
      where: { cursoId: { in: cursoIds } },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      include: { capacidades: { select: { nombre: true }, orderBy: [{ orden: "asc" }, { nombre: "asc" }] } },
    }),
    ctx.db.calificacionPeriodo.findMany({ where: { alumnoId, periodoId } }),
    ctx.db.asistencia.findMany({ where: { alumnoId, fecha: { gte: periodo.inicio, lte: periodo.fin } } }),
    // Desempeños del CNEB (specs/30) que midieron las evaluaciones del periodo en las que el alumno tiene nota.
    ctx.db.desempeno.findMany({
      // Solo notas con calificación: un NSP o «No entregó» no cuenta como desempeño evaluado.
      where: { evaluaciones: { some: { evaluacion: { periodoId, cursoId: { in: cursoIds }, notas: { some: { alumnoId, OR: [{ valorLiteral: { not: null } }, { valorNumerico: { not: null } }] } } } } } },
      select: { competenciaId: true, descripcion: true },
      orderBy: [{ orden: "asc" }, { descripcion: "asc" }],
    }),
    ctx.db.comentarioTutor.findFirst({ where: { alumnoId, periodoId }, select: { texto: true } }),
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
      id: curso.id,
      nombre: curso.nombre,
      competencias: competencias
        .filter((c) => c.cursoId === curso.id)
        .map((c) => {
          const g = califs.find((x) => x.competenciaId === c.id);
          return {
            id: c.id,
            nombre: c.nombre,
            calificacion: g
              ? ({ valorLiteral: g.valorLiteral as Literal | null, valorNumerico: g.valorNumerico === null ? null : Number(g.valorNumerico.toString()) } as ValorCalificacion)
              : null,
            conclusion: g?.conclusion ?? null,
            capacidades: c.capacidades.map((x) => x.nombre),
            desempenosEvaluados: evaluados.filter((d) => d.competenciaId === c.id).map((d) => d.descripcion),
          };
        }),
    })),
    asistencia,
    /** Comentario general del tutor del salón en el periodo (opcional). */
    comentarioTutor: comentarioTutor?.texto ?? null,
  };
}

const esquemaComentario = z.object({
  alumnoId: z.uuid(),
  periodoId: z.uuid(),
  texto: z.string().trim().max(1000, "El comentario es muy largo (máximo 1000 caracteres)."),
});

/**
 * Comentario general del tutor para la libreta (specs/11). Solo el tutor del salón del alumno, con el periodo abierto y
 * del nivel del alumno. Vacío lo borra. Es opcional: su obligatoriedad no está validada.
 */
export async function guardarComentarioTutor(ctx: TenantContext, entrada: unknown): Promise<Resultado> {
  requireFeature(ctx, "libreta");
  const d = esquemaComentario.safeParse(entrada);
  if (!d.success) return fallo(d.error.issues[0].message);
  if (ctx.rol !== "profesor") forbidden();
  const alumno = await ctx.db.alumno.findFirst({ where: { id: d.data.alumnoId, estado: "activo" }, include: { salon: { select: { tutorId: true, nivel: true } } } });
  if (!alumno || alumno.salon.tutorId !== ctx.membership.id) forbidden();
  const periodo = await ctx.db.periodo.findFirst({ where: { id: d.data.periodoId } });
  if (!periodo || !periodo.niveles.includes(alumno.salon.nivel)) return fallo("Este periodo no es del nivel de este alumno.");
  if (periodo.cerrado) return fallo("Este periodo está cerrado. El comentario ya no se puede cambiar.");
  const clave = { alumnoId: alumno.id, periodoId: periodo.id };
  if (d.data.texto === "") {
    await ctx.db.comentarioTutor.deleteMany({ where: clave });
  } else {
    await ctx.db.comentarioTutor.upsert({
      where: { alumnoId_periodoId: clave },
      create: { tenantId: ctx.tenant.id, ...clave, texto: d.data.texto, autorId: ctx.membership.id },
      update: { texto: d.data.texto, autorId: ctx.membership.id },
    });
  }
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "editar", entidad: "comentario_tutor", entidadId: alumno.id, detalle: { periodoId: periodo.id } });
  return ok(d.data.texto === "" ? "Comentario borrado." : "Comentario guardado.");
}

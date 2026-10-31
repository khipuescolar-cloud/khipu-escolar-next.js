import "server-only";
import { fechaDb, fechaLima, formatoDia } from "@/lib/fechas";
import type { DbTenant } from "../db";
import { sitiosPermitidosConNombre } from "./licencias";
import { armarSistema, type CursoNudito, type DatosAlumnoNudito } from "./prompt";

// Contexto del alumno para Nudito+ (specs/29): SOLO datos del propio alumno en su colegio (`ctx.db` ya filtra por
// colegio): su salón (nivel y grado), sus cursos con competencias y desempeños CNEB, y sus tareas próximas.
// Nunca nombres, notas ni datos de compañeros.

const NIVEL_LEGIBLE = { inicial: "inicial", primaria: "primaria", secundaria: "secundaria", academia: "academia" } as const;

const MAX_DESEMPENOS_POR_CURSO = 4;
const MAX_TAREAS = 6;
const DIAS_TAREAS = 14;

export type ContextoNudito = { datos: DatosAlumnoNudito; sistema: string };

/** Datos del alumno para el prompt. Lanza si el alumno no existe en este colegio. */
export async function datosDelAlumno(cliente: DbTenant, alumnoId: string, ahora: Date = new Date()): Promise<DatosAlumnoNudito> {
  const alumno = await cliente.alumno.findFirstOrThrow({
    where: { id: alumnoId },
    select: { nombres: true, salon: { select: { id: true, nombre: true, nivel: true, grado: true } } },
  });
  const salon = alumno.salon;
  const hoy = fechaLima(ahora);
  const [cursos, periodo, sitios] = await Promise.all([
    cliente.curso.findMany({
      where: { salonId: salon.id },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, competencias: { orderBy: { orden: "asc" }, select: { id: true, nombre: true } } },
    }),
    cliente.periodo.findFirst({ where: { inicio: { lte: fechaDb(hoy) }, fin: { gte: fechaDb(hoy) }, niveles: { has: salon.nivel } }, select: { id: true, nombre: true } }),
    sitiosPermitidosConNombre(),
  ]);
  const cursoIds = cursos.map((c) => c.id);
  const competenciaIds = cursos.flatMap((c) => c.competencias.map((x) => x.id));

  // Desempeños: primero los evaluados en el bimestre actual en sus cursos; si no hay, los de su grado.
  const delPeriodo = periodo
    ? await cliente.desempeno.findMany({
        where: { competenciaId: { in: competenciaIds }, evaluaciones: { some: { evaluacion: { periodoId: periodo.id, cursoId: { in: cursoIds } } } } },
        orderBy: { orden: "asc" },
        select: { descripcion: true, competencia: { select: { cursoId: true } } },
      })
    : [];
  const delGrado =
    delPeriodo.length === 0 && salon.grado !== null
      ? await cliente.desempeno.findMany({
          where: { competenciaId: { in: competenciaIds }, nivel: salon.nivel, grado: salon.grado },
          orderBy: [{ competenciaId: "asc" }, { orden: "asc" }],
          select: { descripcion: true, competencia: { select: { cursoId: true } } },
        })
      : [];
  const desempenos = delPeriodo.length > 0 ? delPeriodo : delGrado;

  const tareas = await cliente.tarea.findMany({
    where: { cursoId: { in: cursoIds }, fechaEntrega: { gte: ahora, lte: new Date(ahora.getTime() + DIAS_TAREAS * 86_400_000) } },
    orderBy: { fechaEntrega: "asc" },
    take: MAX_TAREAS,
    select: { titulo: true, fechaEntrega: true, curso: { select: { nombre: true } } },
  });

  const cursosNudito: CursoNudito[] = cursos.map((c) => ({
    nombre: c.nombre,
    competencias: c.competencias.map((x) => x.nombre),
    desempenos: desempenos.filter((d) => d.competencia.cursoId === c.id).slice(0, MAX_DESEMPENOS_POR_CURSO).map((d) => d.descripcion),
  }));

  return {
    nombre: alumno.nombres.split(" ")[0] ?? alumno.nombres,
    grado: salon.grado ? `${salon.grado}.° de ${NIVEL_LEGIBLE[salon.nivel]}` : `${salon.nombre} (${NIVEL_LEGIBLE[salon.nivel]})`,
    cursos: cursosNudito,
    tareas: tareas.map((t) => ({ curso: t.curso.nombre, titulo: t.titulo, entrega: formatoDia(t.fechaEntrega) })),
    periodo: periodo?.nombre ?? null,
    sitios,
  };
}

/** Prompt de sistema + datos del alumno. */
export async function construirContexto(cliente: DbTenant, alumnoId: string, opciones: { guiarSinResolver?: boolean; ahora?: Date } = {}): Promise<ContextoNudito> {
  const datos = await datosDelAlumno(cliente, alumnoId, opciones.ahora);
  return { datos, sistema: armarSistema(datos, { guiarSinResolver: opciones.guiarSinResolver }) };
}

// Notas de Nuevo Horizonte (specs/11 y 33): calificaciones de periodo de los bimestres cerrados, evaluaciones con notas
// del último bimestre cerrado y del vigente (algunos profesores van atrasados, para ver el avance de registro en el tablero).
// Escala literal del CNEB (AD, A, B, C; en inicial solo A, B, C). Deterministas (azar con semilla).
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../src/generated/prisma/client";
import type { CalificacionLiteral } from "../src/generated/prisma/enums";
import { SLUG_COLEGIO, crearAzar, fechaDb, hoyLima, sumarDias } from "./seed-utilidades";

const TITULOS: Record<string, [string, string]> = {
  Matemática: ["Práctica calificada de operaciones", "Resolución de problemas"],
  Comunicación: ["Comprensión lectora: texto narrativo", "Producción de textos"],
  "Personal Social": ["Exposición: mi comunidad", "Línea de tiempo familiar"],
  Psicomotriz: ["Circuito de movimientos", "Juegos de equilibrio"],
  "Ciencia y Tecnología": ["Informe de indagación", "Proyecto: ciclo del agua"],
  "Arte y Cultura": ["Proyecto artístico", "Apreciación de danzas peruanas"],
  "Educación Física": ["Circuito de habilidades motrices", "Juegos predeportivos"],
  "Educación Religiosa": ["Reflexión sobre valores", "Trabajo grupal: la solidaridad"],
  Inglés: ["Oral presentation: my family", "Reading quiz"],
  "Ciencias Sociales": ["Análisis de fuentes históricas", "Mapa de riesgos del distrito"],
  "Desarrollo Personal, Ciudadanía y Cívica": ["Debate: derechos del niño", "Caso de convivencia"],
  "Educación para el Trabajo": ["Plan de negocio escolar", "Prototipo de emprendimiento"],
};

/** Profesores que van atrasados en el registro del bimestre vigente (claves = inicio del correo). */
const ATRASADOS = ["raul.medina", "gustavo.rojas", "pamela.gonzales"];

const CONCLUSIONES: Record<CalificacionLiteral, string[]> = {
  AD: ["Destaca en la competencia y ayuda a sus compañeros.", "Logra la competencia con autonomía y creatividad."],
  A: ["Avanza en la competencia y participa en clase.", "Cumple con lo esperado para el grado."],
  B: ["Está en proceso: necesita practicar más en casa.", "Avanza, pero requiere acompañamiento en algunas tareas."],
  C: ["Necesita refuerzo. Se coordinará con la familia.", "Requiere apoyo constante para lograr la competencia."],
};

export async function sembrarNotas(prisma: PrismaClient) {
  const nh = await prisma.tenant.findUnique({ where: { slug: SLUG_COLEGIO } });
  if (!nh) return;
  const tenantId = nh.id;
  const azar = crearAzar(1133);
  const hoy = hoyLima();
  const periodos = await prisma.periodo.findMany({ where: { tenantId }, orderBy: [{ anio: "asc" }, { numero: "asc" }] });
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const cerrados = periodos.filter((p) => p.cerrado);
  const vigente = periodos.find((p) => !p.cerrado && iso(p.inicio) <= hoy);
  const ultimoCerrado = cerrados.at(-1);

  const salones = await prisma.salon.findMany({
    where: { tenantId },
    include: {
      alumnos: { where: { estado: "activo" }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] },
      cursos: { include: { competencias: { orderBy: { orden: "asc" } }, profesor: { include: { user: { select: { email: true } } } } } },
    },
  });

  // Habilidad de cada alumno (estable) → literal con algo de ruido por competencia.
  const habilidad = new Map<string, number>();
  for (const s of salones) for (const a of s.alumnos) habilidad.set(a.id, 0.25 + azar.num() * 0.75);
  const literal = (alumnoId: string, inicial: boolean): CalificacionLiteral => {
    const r = habilidad.get(alumnoId)! * 0.65 + azar.num() * 0.35;
    const v: CalificacionLiteral = r > 0.8 ? "AD" : r > 0.48 ? "A" : r > 0.3 ? "B" : "C";
    return inicial && v === "AD" ? "A" : v;
  };

  const calificaciones: { tenantId: string; alumnoId: string; competenciaId: string; periodoId: string; valorLiteral: CalificacionLiteral; conclusion: string | null }[] = [];
  const evaluaciones: { id: string; tenantId: string; cursoId: string; periodoId: string; competenciaId: string | null; titulo: string; fecha: Date }[] = [];
  const notas: { tenantId: string; evaluacionId: string; alumnoId: string; valorLiteral: CalificacionLiteral; registradoPorId: string; comentario: string | null }[] = [];

  for (const s of salones) {
    const inicial = s.nivel === "inicial";
    for (const c of s.cursos) {
      if (!c.profesorId || c.competencias.length === 0) continue;
      // Calificación de periodo en cada bimestre cerrado.
      for (const p of cerrados) {
        for (const a of s.alumnos) {
          for (const comp of c.competencias) {
            const v = literal(a.id, inicial);
            calificaciones.push({ tenantId, alumnoId: a.id, competenciaId: comp.id, periodoId: p.id, valorLiteral: v, conclusion: v === "A" && azar.prob(0.7) ? null : azar.elegir(CONCLUSIONES[v]) });
          }
        }
      }
      // Dos evaluaciones en el último bimestre cerrado y dos en el vigente.
      const titulos = TITULOS[c.nombre] ?? ["Evaluación 1", "Evaluación 2"];
      const atrasado = ATRASADOS.some((x) => c.profesor?.user.email.startsWith(x));
      for (const p of [ultimoCerrado, vigente]) {
        if (!p) continue;
        const esVigente = p === vigente;
        const fin = iso(p.fin) < hoy ? iso(p.fin) : sumarDias(hoy, -1);
        const span = Math.max(1, Math.round((Date.parse(fin) - Date.parse(iso(p.inicio))) / 86_400_000));
        titulos.forEach((titulo, i) => {
          const id = randomUUID();
          const fecha = sumarDias(iso(p.inicio), Math.min(span, Math.round(span * (i === 0 ? 0.35 : 0.8))));
          evaluaciones.push({ id, tenantId, cursoId: c.id, periodoId: p.id, competenciaId: c.competencias[i % c.competencias.length].id, titulo, fecha: fechaDb(fecha) });
          // En el vigente: los atrasados registraron solo la mitad de la 1.ª y nada de la 2.ª.
          const cuantos = !esVigente ? s.alumnos.length : atrasado ? (i === 0 ? Math.ceil(s.alumnos.length / 2) : 0) : s.alumnos.length;
          for (const a of s.alumnos.slice(0, cuantos)) {
            notas.push({ tenantId, evaluacionId: id, alumnoId: a.id, valorLiteral: literal(a.id, inicial), registradoPorId: c.profesorId!, comentario: null });
          }
        });
      }
    }
  }

  // Evaluaciones que ya existían (las del CNEB en 3.° B): notas para todo el salón.
  const previas = await prisma.evaluacion.findMany({ where: { tenantId }, include: { curso: { include: { salon: { include: { alumnos: true } } } } } });
  for (const ev of previas) {
    for (const a of ev.curso.salon.alumnos) notas.push({ tenantId, evaluacionId: ev.id, alumnoId: a.id, valorLiteral: literal(a.id, false), registradoPorId: ev.curso.profesorId!, comentario: null });
  }

  // Diego (3.° B) baja en Matemática en el último bimestre cerrado: C con conclusión para citar a la familia.
  const tercero = salones.find((s) => s.nombre === "3.° B");
  const diego = tercero?.alumnos.find((a) => a.nombres === "Diego");
  const mate = tercero?.cursos.find((c) => c.nombre === "Matemática");
  if (diego && mate && ultimoCerrado) {
    for (const comp of mate.competencias.slice(0, 2)) {
      const fila = calificaciones.find((f) => f.alumnoId === diego.id && f.competenciaId === comp.id && f.periodoId === ultimoCerrado.id);
      if (fila) Object.assign(fila, { valorLiteral: "C", conclusion: "Necesita refuerzo en operaciones con fracciones. Se cita a la familia." });
    }
  }
  // Un par de observaciones en notas (las ve la familia).
  for (const n of notas.filter((x) => x.valorLiteral === "C").slice(0, 12)) n.comentario = "Le faltó terminar la actividad. Repasaremos en clase.";
  for (const n of notas.filter((x) => x.valorLiteral === "AD").slice(0, 12)) n.comentario = "Excelente trabajo, muy ordenado.";

  await prisma.calificacionPeriodo.createMany({ data: calificaciones, skipDuplicates: true });
  await prisma.evaluacion.createMany({ data: evaluaciones });
  await prisma.nota.createMany({ data: notas, skipDuplicates: true });
}

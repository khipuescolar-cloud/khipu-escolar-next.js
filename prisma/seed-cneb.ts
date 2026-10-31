// Competencias del CNEB (specs/30) en todos los cursos de Nuevo Horizonte:
// - Matemática y Comunicación de primaria y secundaria: catálogo importado (competencias, capacidades y desempeños del grado).
// - Las demás áreas (y todo inicial): las competencias del CNEB del área, sin capacidades.
// - Dos evaluaciones del bimestre vigente en 3.° B con desempeños marcados.
// Idempotente: no duplica nada si se ejecuta otra vez.
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Nivel } from "../src/generated/prisma/enums";
import { detectarArea, gradoValido, planearImportacion, plantillaCneb } from "../src/lib/cneb/catalogo";
import { SLUG_COLEGIO, fechaDb, hoyLima, sumarDias } from "./seed-utilidades";

/** Competencias del CNEB por área (nombre corto del curso). */
const COMPETENCIAS: Record<string, string[]> = {
  "Personal Social": ["Construye su identidad", "Convive y participa democráticamente en la búsqueda del bien común", "Gestiona responsablemente el espacio y el ambiente"],
  Psicomotriz: ["Se desenvuelve de manera autónoma a través de su motricidad"],
  "Ciencia y Tecnología": [
    "Indaga mediante métodos científicos para construir sus conocimientos",
    "Explica el mundo físico basándose en conocimientos sobre los seres vivos, materia y energía, biodiversidad, Tierra y universo",
    "Diseña y construye soluciones tecnológicas para resolver problemas de su entorno",
  ],
  "Arte y Cultura": ["Aprecia de manera crítica manifestaciones artístico-culturales", "Crea proyectos desde los lenguajes artísticos"],
  "Educación Física": ["Se desenvuelve de manera autónoma a través de su motricidad", "Asume una vida saludable", "Interactúa a través de sus habilidades sociomotrices"],
  "Educación Religiosa": [
    "Construye su identidad como persona humana, amada por Dios, digna, libre y trascendente",
    "Asume la experiencia del encuentro personal y comunitario con Dios en su proyecto de vida",
  ],
  Inglés: [
    "Se comunica oralmente en inglés como lengua extranjera",
    "Lee diversos tipos de textos escritos en inglés como lengua extranjera",
    "Escribe diversos tipos de textos en inglés como lengua extranjera",
  ],
  "Ciencias Sociales": ["Construye interpretaciones históricas", "Gestiona responsablemente el espacio y el ambiente", "Gestiona responsablemente los recursos económicos"],
  "Desarrollo Personal, Ciudadanía y Cívica": ["Construye su identidad", "Convive y participa democráticamente en la búsqueda del bien común"],
  "Educación para el Trabajo": ["Gestiona proyectos de emprendimiento económico o social"],
  // Inicial (el catálogo importable es solo de primaria y secundaria).
  Matemática: ["Resuelve problemas de cantidad", "Resuelve problemas de forma, movimiento y localización"],
  Comunicación: ["Se comunica oralmente en su lengua materna", "Lee diversos tipos de textos escritos en su lengua materna"],
};

async function importarCurso(prisma: PrismaClient, tenantId: string, curso: { id: string; nombre: string; salon: { nivel: Nivel; grado: number | null } }): Promise<boolean> {
  const area = detectarArea(curso.nombre);
  const { nivel, grado } = curso.salon;
  if (!area || !gradoValido(nivel, grado)) return false;
  const plantilla = plantillaCneb(area, nivel, grado);
  if (!plantilla.ok) return false;
  const existentes = await prisma.competencia.findMany({
    where: { tenantId, cursoId: curso.id },
    include: {
      capacidades: { select: { id: true, nombre: true, orden: true } },
      desempenos: { where: { nivel, grado }, select: { codigo: true, descripcion: true, orden: true } },
    },
  });
  const plan = planearImportacion(plantilla.competencias, existentes);
  for (const paso of plan.pasos) {
    const competenciaId = paso.competenciaId
      ?? (await prisma.competencia.create({ data: { tenantId, cursoId: curso.id, nombre: paso.nombre, orden: paso.orden } })).id;
    const capacidades = { ...paso.capacidadesExistentes };
    for (const c of paso.capacidadesNuevas) {
      capacidades[c.nombre] = (await prisma.capacidad.create({ data: { tenantId, competenciaId, nombre: c.nombre, orden: c.orden } })).id;
    }
    await prisma.desempeno.createMany({
      data: paso.desempenosNuevos.map((d) => ({
        tenantId, competenciaId, capacidadId: d.capacidad ? (capacidades[d.capacidad] ?? null) : null,
        nivel, grado, descripcion: d.descripcion, codigo: d.codigo, orden: d.orden,
      })),
    });
  }
  return true;
}

async function marcar(prisma: PrismaClient, tenantId: string, evaluacionId: string, codigos: string[]) {
  const desempenos = await prisma.desempeno.findMany({ where: { tenantId, codigo: { in: codigos }, competencia: { evaluaciones: { some: { id: evaluacionId } } } }, select: { id: true } });
  await prisma.evaluacionDesempeno.createMany({ data: desempenos.map((d) => ({ tenantId, evaluacionId, desempenoId: d.id })), skipDuplicates: true });
}

export async function sembrarCneb(prisma: PrismaClient) {
  const nh = await prisma.tenant.findUnique({ where: { slug: SLUG_COLEGIO } });
  if (!nh) return;
  const tenantId = nh.id;

  // 1. Catálogo o competencias del área en cada curso.
  const cursos = await prisma.curso.findMany({ where: { tenantId }, include: { salon: { select: { nivel: true, grado: true } } } });
  const sinCatalogo: { tenantId: string; cursoId: string; nombre: string; orden: number }[] = [];
  for (const curso of cursos) {
    if (await importarCurso(prisma, tenantId, curso)) continue;
    if (await prisma.competencia.count({ where: { cursoId: curso.id } })) continue;
    (COMPETENCIAS[curso.nombre] ?? []).forEach((nombre, orden) => sinCatalogo.push({ tenantId, cursoId: curso.id, nombre, orden }));
  }
  await prisma.competencia.createMany({ data: sinCatalogo });

  // 2. Evaluaciones del bimestre vigente en 3.° B con desempeños marcados.
  const hoy = hoyLima();
  const periodo = await prisma.periodo.findFirst({ where: { tenantId, inicio: { lte: fechaDb(hoy) } }, orderBy: [{ anio: "desc" }, { numero: "desc" }] });
  const tercero = await prisma.salon.findFirst({ where: { tenantId, nombre: "3.° B" } });
  if (!periodo || !tercero) return;
  const curso = (nombre: string) => cursos.find((c) => c.salonId === tercero.id && c.nombre === nombre)!;
  const competencia = (cursoId: string, inicio: string) => prisma.competencia.findFirst({ where: { tenantId, cursoId, nombre: { startsWith: inicio } } });
  const fechaEval = (dias: number) => {
    const f = sumarDias(hoy, -dias);
    return fechaDb(f < periodo.inicio.toISOString().slice(0, 10) ? periodo.inicio.toISOString().slice(0, 10) : f);
  };
  const crear = async (cursoId: string, inicioCompetencia: string, titulo: string, dias: number, codigos: string[]) => {
    const comp = await competencia(cursoId, inicioCompetencia);
    if (!comp) return;
    const ev = (await prisma.evaluacion.findFirst({ where: { tenantId, cursoId, periodoId: periodo.id, titulo } }))
      ?? (await prisma.evaluacion.create({ data: { tenantId, cursoId, periodoId: periodo.id, competenciaId: comp.id, titulo, fecha: fechaEval(dias) } }));
    await marcar(prisma, tenantId, ev.id, codigos);
  };
  await crear(curso("Matemática").id, "Resuelve problemas de cantidad", "Práctica: fracciones", 10, ["MAT-C1-P3-03", "MAT-C1-P3-04"]);
  await crear(curso("Comunicación").id, "Lee diversos", "Lectura: «El zorro y el cóndor»", 8, ["COM-C2-P3-01", "COM-C2-P3-02", "COM-C2-P3-03"]);
}

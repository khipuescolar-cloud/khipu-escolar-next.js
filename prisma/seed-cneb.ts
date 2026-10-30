// Datos demo del CNEB (specs/30): grados de los salones de Nuevo Horizonte, catálogo importado en Matemática y Comunicación,
// y evaluaciones con desempeños marcados. Idempotente: no duplica nada si se ejecuta otra vez.
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Nivel } from "../src/generated/prisma/enums";
import { detectarArea, gradoValido, planearImportacion, plantillaCneb } from "../src/lib/cneb/catalogo";

const GRADOS_DEMO: Record<string, number> = { "3.° B": 3, "5.° A": 5 };

async function importarCurso(prisma: PrismaClient, tenantId: string, curso: { id: string; nombre: string; salon: { nivel: Nivel; grado: number | null } }) {
  const area = detectarArea(curso.nombre);
  const { nivel, grado } = curso.salon;
  if (!area || !gradoValido(nivel, grado)) return;
  const plantilla = plantillaCneb(area, nivel, grado);
  if (!plantilla.ok) return;
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
}

async function marcar(prisma: PrismaClient, tenantId: string, evaluacionId: string, codigos: string[]) {
  const desempenos = await prisma.desempeno.findMany({ where: { tenantId, codigo: { in: codigos }, competencia: { evaluaciones: { some: { id: evaluacionId } } } }, select: { id: true } });
  await prisma.evaluacionDesempeno.createMany({
    data: desempenos.map((d) => ({ tenantId, evaluacionId, desempenoId: d.id })),
    skipDuplicates: true,
  });
}

export async function sembrarCneb(prisma: PrismaClient) {
  const nh = await prisma.tenant.findUnique({ where: { slug: "nuevohorizonte" } });
  if (!nh) return;

  // 1. Grados de los salones (el seed base no los registra).
  for (const [nombre, grado] of Object.entries(GRADOS_DEMO)) {
    await prisma.salon.updateMany({ where: { tenantId: nh.id, nombre, nivel: "primaria" }, data: { grado } });
  }

  // 2. Catálogo CNEB en los cursos de Matemática y Comunicación.
  const cursos = await prisma.curso.findMany({ where: { tenantId: nh.id }, include: { salon: { select: { nivel: true, grado: true } } } });
  for (const curso of cursos) await importarCurso(prisma, nh.id, curso);

  // 3. Evaluaciones del IV Bimestre con desempeños marcados.
  const periodo = await prisma.periodo.findFirst({ where: { tenantId: nh.id, cerrado: false }, orderBy: [{ anio: "desc" }, { numero: "desc" }] });
  const tercero = await prisma.salon.findFirst({ where: { tenantId: nh.id, nombre: "3.° B" } });
  const lucia = await prisma.membership.findFirst({ where: { tenantId: nh.id, rol: "profesor", user: { email: "lucia.garcia@nuevohorizonte.demo" } } });
  if (!periodo || !tercero || !lucia) return;

  const fracciones = await prisma.evaluacion.findFirst({ where: { tenantId: nh.id, titulo: "Práctica: fracciones", curso: { salonId: tercero.id } } });
  if (fracciones) await marcar(prisma, nh.id, fracciones.id, ["MAT-C1-P3-03", "MAT-C1-P3-04"]);

  const comu = cursos.find((c) => c.salonId === tercero.id && detectarArea(c.nombre)?.area === "comunicacion");
  const lee = comu && (await prisma.competencia.findFirst({ where: { tenantId: nh.id, cursoId: comu.id, nombre: { startsWith: "Lee diversos" } } }));
  if (!comu || !lee) return;
  const titulo = "Lectura: «El zorro y el cóndor»";
  const lectura = (await prisma.evaluacion.findFirst({ where: { tenantId: nh.id, cursoId: comu.id, periodoId: periodo.id, titulo } }))
    ?? (await prisma.evaluacion.create({
      data: { tenantId: nh.id, cursoId: comu.id, periodoId: periodo.id, competenciaId: lee.id, titulo, fecha: new Date("2026-10-22T00:00:00.000Z") },
    }));
  await marcar(prisma, nh.id, lectura.id, ["COM-C2-P3-01", "COM-C2-P3-02", "COM-C2-P3-03"]);
  const alumnos = await prisma.alumno.findMany({ where: { tenantId: nh.id, salonId: tercero.id, estado: "activo" }, orderBy: [{ apellidos: "asc" }, { nombres: "asc" }] });
  const valores = ["A", "AD", "A", "B", "A", "B"] as const;
  await prisma.nota.createMany({
    data: alumnos.map((a, i) => ({ tenantId: nh.id, evaluacionId: lectura.id, alumnoId: a.id, valorLiteral: valores[i % valores.length], registradoPorId: lucia.id })),
    skipDuplicates: true,
  });
}

// Datos demo del tablero de dirección (specs/33): varias semanas de asistencia, notas y avisos para Nuevo Horizonte.
// Ficticios y deterministas (sin azar): el mismo resultado en cada seed. No toca otros colegios.
import type { Prisma, PrismaClient } from "../src/generated/prisma/client";
import { esDiaHabil } from "../src/lib/dias-habiles";

const ANIO = 2026;
const fecha = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const sumar = (iso: string, d: number) => new Date(fecha(iso).getTime() + d * 86_400_000).toISOString().slice(0, 10);
/** Número pseudoaleatorio estable en [0, 1) a partir de dos enteros. */
function ruido(a: number, b: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type PerfilAsistencia = { faltas: number; tardanzas: number };
/** Probabilidad de falta y de tardanza por alumno (por orden de salón): casi todos asisten; uno por salón es crónico y otro llega tarde seguido. */
const PERFILES: Record<string, PerfilAsistencia[]> = {
  "3.° B": [
    { faltas: 0.03, tardanzas: 0.04 }, { faltas: 0.01, tardanzas: 0.02 }, { faltas: 0.05, tardanzas: 0.22 },
    { faltas: 0.04, tardanzas: 0.05 }, { faltas: 0.2, tardanzas: 0.08 }, { faltas: 0.07, tardanzas: 0.06 },
  ],
  "5.° A": [{ faltas: 0.02, tardanzas: 0.03 }, { faltas: 0.03, tardanzas: 0.04 }, { faltas: 0.12, tardanzas: 0.15 }, { faltas: 0.04, tardanzas: 0.02 }],
};

const LITERAL_POR_RUIDO = (r: number) => (r < 0.15 ? "AD" : r < 0.6 ? "A" : r < 0.9 ? "B" : "C") as "AD" | "A" | "B" | "C";

export async function sembrarTablero(prisma: PrismaClient) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: "nuevohorizonte" } });
  if (!tenant) return;
  const tenantId = tenant.id;
  const membresia = async (email: string) => {
    const m = await prisma.membership.findFirst({ where: { tenantId, user: { email } } });
    if (!m) throw new Error(`seed-tablero: falta la cuenta ${email}`);
    return m;
  };
  const lucia = await membresia("lucia.garcia@nuevohorizonte.demo");
  const pedro = await membresia("pedro.salas@nuevohorizonte.demo");
  const rosa = await membresia("rosa.quispe@gmail.com");
  const rios = await membresia("familia.rios@familia.demo");

  const salones = await prisma.salon.findMany({
    where: { tenantId },
    include: { alumnos: { orderBy: { createdAt: "asc" } }, cursos: true },
  });
  const salon = (nombre: string) => salones.find((s) => s.nombre === nombre)!;
  const nh3b = salon("3.° B");
  const nh5a = salon("5.° A");

  // ───────── Asistencia diaria: del 9 de marzo hasta ayer (hora Lima) ─────────
  const hoyLima = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
  const filas: Prisma.AsistenciaCreateManyInput[] = [];
  let n = 0;
  for (let f = "2026-03-09"; f < hoyLima; f = sumar(f, 1)) {
    if (!esDiaHabil(f)) continue;
    n++;
    for (const s of [nh3b, nh5a]) {
      for (const [i, a] of s.alumnos.entries()) {
        const p = PERFILES[s.nombre]?.[i] ?? { faltas: 0.03, tardanzas: 0.04 };
        const r = ruido(n, a.nombres.length * 31 + i * 7 + s.nombre.length);
        const estado = r < p.faltas ? "falta" : r < p.faltas + p.tardanzas ? "tarde" : "llego";
        const minutos = Math.floor(ruido(n + 1, i + 3) * 9);
        filas.push({
          tenantId, alumnoId: a.id, fecha: fecha(f), ambito: "dia", estado,
          hora: estado === "tarde" ? `08:${String(10 + Math.floor(ruido(n, i) * 20)).padStart(2, "0")}` : `07:${String(40 + minutos).padStart(2, "0")}`,
          registradoPorId: s.tutorId ?? lucia.id,
        });
      }
    }
  }
  await prisma.asistencia.createMany({ data: filas, skipDuplicates: true });

  // Justificaciones: las faltas de Mateo y Valentina las justifica la familia; la más reciente queda pendiente.
  for (const [alumno, apoderado] of [[nh3b.alumnos[0], rosa], [nh3b.alumnos[1], rios]] as const) {
    const faltas = await prisma.asistencia.findMany({ where: { tenantId, alumnoId: alumno.id, ambito: "dia", estado: "falta" }, orderBy: { fecha: "asc" } });
    for (const [i, falta] of faltas.entries()) {
      if (await prisma.justificacion.count({ where: { asistenciaId: falta.id } })) continue;
      const pendiente = i === faltas.length - 1;
      await prisma.justificacion.create({
        data: {
          tenantId, asistenciaId: falta.id, apoderadoId: apoderado.id, motivo: i % 2 === 0 ? "Cita médica" : "Malestar estomacal",
          estado: pendiente ? "pendiente" : i % 3 === 0 ? "rechazada" : "aceptada",
          ...(pendiente ? {} : { revisadoPorId: lucia.id, revisadoAt: new Date(falta.fecha.getTime() + 86_400_000) }),
        },
      });
    }
  }

  // ───────── Notas ─────────
  const periodos = await prisma.periodo.findMany({ where: { tenantId, anio: ANIO }, orderBy: { numero: "asc" } });
  const [, , p3, p4] = periodos;
  const curso = (s: typeof nh3b, nombre: string) => s.cursos.find((c) => c.nombre === nombre);
  const mate = curso(nh3b, "Matemática")!;
  const comu = curso(nh3b, "Comunicación")!;
  const ciencia = curso(nh3b, "Ciencia y Tecnología")!;
  const mate5 = curso(nh5a, "Matemática")!;
  const competencia = async (cursoId: string, nombre: string) =>
    (await prisma.competencia.findFirst({ where: { tenantId, cursoId, nombre } })) ??
    (await prisma.competencia.create({ data: { tenantId, cursoId, nombre, orden: await prisma.competencia.count({ where: { cursoId } }) } }));
  const lee = await competencia(comu.id, "Lee diversos tipos de textos escritos");
  const oral = await competencia(comu.id, "Se comunica oralmente en su lengua materna");
  const indaga = await competencia(ciencia.id, "Indaga mediante métodos científicos");
  const cantidad5 = await competencia(mate5.id, "Resuelve problemas de cantidad");
  const regularidad5 = await competencia(mate5.id, "Resuelve problemas de regularidad, equivalencia y cambio");

  const diego = nh3b.alumnos[4];
  // Diego baja en el III Bimestre: C en dos competencias de Matemática.
  const competenciasMate = await prisma.competencia.findMany({ where: { tenantId, cursoId: mate.id }, orderBy: { orden: "asc" } });
  await prisma.calificacionPeriodo.updateMany({
    where: { tenantId, alumnoId: diego.id, periodoId: p3.id, competenciaId: { in: competenciasMate.slice(0, 2).map((c) => c.id) } },
    data: { valorLiteral: "C", conclusion: "Necesita refuerzo en operaciones con fracciones. Se cita a la familia." },
  });

  const evaluar = async (cursoId: string, periodoId: string, competenciaId: string, titulo: string, dia: string, alumnos: typeof nh3b.alumnos, registradoPorId: string, cuantos: number, semilla: number) => {
    let ev = await prisma.evaluacion.findFirst({ where: { tenantId, cursoId, periodoId, titulo } });
    ev ??= await prisma.evaluacion.create({ data: { tenantId, cursoId, periodoId, competenciaId, titulo, fecha: fecha(dia) } });
    for (const [i, a] of alumnos.slice(0, cuantos).entries()) {
      const forzado = a.id === diego.id ? "C" : null;
      await prisma.nota.upsert({
        where: { evaluacionId_alumnoId: { evaluacionId: ev.id, alumnoId: a.id } },
        update: {},
        create: { tenantId, evaluacionId: ev.id, alumnoId: a.id, valorLiteral: forzado ?? LITERAL_POR_RUIDO(ruido(semilla, i * 5 + 1)), registradoPorId },
      });
    }
  };
  // IV Bimestre (vigente): Lucía va al día; Pedro registró poco en 3.° B.
  await evaluar(comu.id, p4.id, lee.id, "Comprensión lectora: texto narrativo", "2026-10-22", nh3b.alumnos, lucia.id, 6, 11);
  await evaluar(comu.id, p4.id, oral.id, "Exposición oral", "2026-10-27", nh3b.alumnos, lucia.id, 3, 12);
  await evaluar(ciencia.id, p4.id, indaga.id, "Informe de indagación", "2026-10-28", nh3b.alumnos, pedro.id, 2, 13);
  // 5.° A Matemática (Pedro): III Bimestre con calificaciones y IV en curso.
  await evaluar(mate5.id, p3.id, cantidad5.id, "Evaluación de cantidad", "2026-09-15", nh5a.alumnos, pedro.id, 4, 21);
  await evaluar(mate5.id, p3.id, regularidad5.id, "Evaluación de patrones", "2026-09-29", nh5a.alumnos, pedro.id, 4, 22);
  await evaluar(mate5.id, p4.id, cantidad5.id, "Práctica de múltiplos", "2026-10-21", nh5a.alumnos, pedro.id, 4, 23);
  for (const [ci, comp] of [cantidad5, regularidad5].entries()) {
    for (const [i, a] of nh5a.alumnos.entries()) {
      await prisma.calificacionPeriodo.upsert({
        where: { alumnoId_competenciaId_periodoId: { alumnoId: a.id, competenciaId: comp.id, periodoId: p3.id } },
        update: {},
        create: { tenantId, alumnoId: a.id, competenciaId: comp.id, periodoId: p3.id, valorLiteral: LITERAL_POR_RUIDO(ruido(30 + ci, i + 2)), conclusion: "Avanza según lo esperado." },
      });
    }
  }
  await prisma.cierreCurso.createMany({ data: [{ tenantId, periodoId: p3.id, cursoId: mate.id, cerradoPorId: lucia.id }, { tenantId, periodoId: p3.id, cursoId: mate5.id, cerradoPorId: pedro.id }], skipDuplicates: true });

  // ───────── Tareas del mes ─────────
  if ((await prisma.tarea.count({ where: { tenantId, titulo: "Ficha de múltiplos y divisores" } })) === 0) await prisma.tarea.createMany({
    data: [
      { tenantId, cursoId: mate5.id, titulo: "Ficha de múltiplos y divisores", fechaEntrega: new Date(Date.now() + 3 * 86_400_000), creadoPorId: pedro.id },
      { tenantId, cursoId: mate5.id, titulo: "Problemas de patrones (pág. 58)", fechaEntrega: new Date(Date.now() + 6 * 86_400_000), creadoPorId: pedro.id },
    ],
  });

  // ───────── Avisos a las familias (resumen del mes) ─────────
  const estados = ["abierto", "abierto", "entregado", "enviado", "abierto", "rebotado", "enviado", "abierto", "error", "entregado"] as const;
  const ahora = Date.now();
  if ((await prisma.aviso.count({ where: { tenantId, plantilla: "asistencia_falta" } })) === 0) await prisma.aviso.createMany({
    data: estados.map((estado, i) => ({
      tenantId, tipo: "asistencia" as const, canal: "correo" as const, apoderadoId: i % 2 === 0 ? rosa.id : rios.id,
      destinatario: i % 2 === 0 ? "rosa.quispe@gmail.com" : "familia.rios@familia.demo", plantilla: "asistencia_falta",
      asunto: "Aviso de asistencia", estado, intentos: estado === "error" ? 3 : 1,
      ...(estado === "error" ? { error: "No se pudo entregar el mensaje." } : {}),
      createdAt: new Date(ahora - (i + 1) * 86_400_000), enviadoAt: new Date(ahora - (i + 1) * 86_400_000 + 60_000),
      ...(estado === "abierto" ? { abiertoAt: new Date(ahora - (i + 1) * 86_400_000 + 3_600_000) } : {}),
    })),
  });
}

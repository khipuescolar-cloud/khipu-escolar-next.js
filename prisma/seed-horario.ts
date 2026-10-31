// Horarios demo (specs/34). Ficticios. Se llama desde prisma/seed.ts (al final).
// Algorítmico y determinista: para cada colegio crea las horas sugeridas de los niveles que usan sus salones y arma el
// horario de cada salón que aún no tiene uno, con sus propios cursos. Nunca pone a un profesor en dos lugares a la vez
// (compara horas reales, así que también sirve entre niveles con horas distintas). Idempotente: no toca salones que ya
// tienen horario ni niveles que ya tienen horas.
import type { PrismaClient } from "../src/generated/prisma/client";
import type { Nivel } from "../src/generated/prisma/enums";
import { DIAS, PERIODOS_SUGERIDOS, buscarCruce, ordenarPorHora, type OcupacionProfesor } from "../src/lib/horario";

const ORDEN_NIVEL: Record<Nivel, number> = { inicial: 0, primaria: 1, secundaria: 2, academia: 3 };
/** Como máximo dos horas del mismo curso por día. */
const MAX_POR_DIA = 2;

type Periodo = { id: string; horaInicio: string; horaFin: string; tipo: "clase" | "recreo" };
type Curso = { id: string; nombre: string; profesorId: string | null };
type SalonPlan = { id: string; nombre: string; tutorId: string | null; cursos: Curso[]; clases: Periodo[] };
export type BloquePlan = { salonId: string; dia: number; periodoId: string; cursoId: string | null; titulo: string | null; profesorId: string | null };

/**
 * Arma los bloques de varios salones (en el orden dado) sin cruzar profesores con `ocupados` ni entre sí.
 * Por salón: «Tutoría» con su tutor (viernes, la última hora libre que pueda), y el resto de casilleros rotando sus
 * cursos (máx. 2 por día). Si ningún curso cabe en un casillero (su profesor está ocupado), queda vacío.
 */
export function planificarHorario(salones: SalonPlan[], ocupados: OcupacionProfesor[]): BloquePlan[] {
  const bloques: BloquePlan[] = [];
  salones.forEach((salon, indice) => {
    const usado = new Set<string>();
    const libre = (profesorId: string | null, dia: number, p: Periodo) => !profesorId || !buscarCruce({ profesorId, dia, horaInicio: p.horaInicio, horaFin: p.horaFin }, ocupados);
    const ocupar = (b: BloquePlan, p: Periodo, titulo: string) => {
      bloques.push(b);
      usado.add(`${b.dia}-${b.periodoId}`);
      if (b.profesorId) ocupados.push({ profesorId: b.profesorId, dia: b.dia, salonId: salon.id, salonNombre: salon.nombre, titulo, horaInicio: p.horaInicio, horaFin: p.horaFin });
    };

    if (salon.tutorId && salon.clases.length) {
      // Viernes primero, de la última hora hacia atrás; luego los demás días.
      const intentos = [5, 4, 3, 2, 1].flatMap((dia) => [...salon.clases].reverse().map((p) => ({ dia, p })));
      const hueco = intentos.find(({ dia, p }) => libre(salon.tutorId, dia, p));
      if (hueco) ocupar({ salonId: salon.id, dia: hueco.dia, periodoId: hueco.p.id, cursoId: null, titulo: "Tutoría", profesorId: salon.tutorId }, hueco.p, "Tutoría");
    }

    const cursos = salon.cursos;
    if (cursos.length === 0) return;
    let k = indice % cursos.length;
    for (const dia of DIAS) {
      const porDia = new Map<string, number>();
      for (const p of salon.clases) {
        if (usado.has(`${dia}-${p.id}`)) continue;
        for (let intento = 0; intento < cursos.length; intento++) {
          const i = (k + intento) % cursos.length;
          const c = cursos[i];
          if ((porDia.get(c.id) ?? 0) >= MAX_POR_DIA || !libre(c.profesorId, dia, p)) continue;
          ocupar({ salonId: salon.id, dia, periodoId: p.id, cursoId: c.id, titulo: null, profesorId: c.profesorId }, p, c.nombre);
          porDia.set(c.id, (porDia.get(c.id) ?? 0) + 1);
          k = i + 1;
          break;
        }
      }
    }
  });
  return bloques;
}

/** Todos los colegios, o solo `tenantIds` (las pruebas lo usan con su colegio de prueba). */
export async function sembrarHorario(prisma: PrismaClient, opciones: { tenantIds?: string[] } = {}) {
  const tenants = await prisma.tenant.findMany({ where: opciones.tenantIds ? { id: { in: opciones.tenantIds } } : {}, select: { id: true, slug: true } });
  for (const t of tenants) {
    const salones = await prisma.salon.findMany({
      where: { tenantId: t.id, archivadoAt: null },
      select: { id: true, nombre: true, nivel: true, tutorId: true, _count: { select: { bloques: true } }, cursos: { select: { id: true, nombre: true, profesorId: true } } },
    });
    if (salones.length === 0) continue;

    // Horas sugeridas de cada nivel que aún no tiene horas.
    const niveles = [...new Set(salones.map((s) => s.nivel))];
    const periodos = new Map<Nivel, Periodo[]>();
    for (const nivel of niveles) {
      if ((await prisma.horarioPeriodo.count({ where: { tenantId: t.id, nivel } })) === 0) {
        await prisma.horarioPeriodo.createMany({ data: PERIODOS_SUGERIDOS[nivel].map((p) => ({ ...p, tenantId: t.id, nivel })) });
      }
      const filas = await prisma.horarioPeriodo.findMany({ where: { tenantId: t.id, nivel }, select: { id: true, horaInicio: true, horaFin: true, tipo: true } });
      periodos.set(nivel, ordenarPorHora(filas));
    }

    // Lo que ya está ocupado (salones con horario previo) también cuenta para no cruzar profesores.
    const existentes = await prisma.bloqueHorario.findMany({
      where: { tenantId: t.id },
      select: { dia: true, salonId: true, profesorId: true, titulo: true, periodo: { select: { horaInicio: true, horaFin: true } }, curso: { select: { nombre: true, profesorId: true } }, salon: { select: { nombre: true } } },
    });
    const ocupados: OcupacionProfesor[] = existentes.flatMap((b) => {
      const profesorId = b.curso ? b.curso.profesorId : b.profesorId;
      return profesorId ? [{ profesorId, dia: b.dia, salonId: b.salonId, salonNombre: b.salon.nombre, titulo: b.curso?.nombre ?? b.titulo ?? "", ...b.periodo }] : [];
    });

    const pendientes = salones
      .filter((s) => s._count.bloques === 0)
      .sort((a, b) => ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel] || a.nombre.localeCompare(b.nombre, "es"))
      .map((s) => ({
        id: s.id, nombre: s.nombre, tutorId: s.tutorId,
        cursos: [...s.cursos].sort((a, b) => a.nombre.localeCompare(b.nombre, "es") || a.id.localeCompare(b.id)),
        clases: (periodos.get(s.nivel) ?? []).filter((p) => p.tipo === "clase"),
      }));
    const bloques = planificarHorario(pendientes, ocupados);
    if (bloques.length) await prisma.bloqueHorario.createMany({ data: bloques.map((b) => ({ ...b, profesorId: b.cursoId ? null : b.profesorId, tenantId: t.id })) });
    if (pendientes.length) console.log(`  Horario: ${t.slug} · ${pendientes.length} salones · ${bloques.length} bloques`);
  }
}

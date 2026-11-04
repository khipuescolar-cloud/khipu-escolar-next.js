import "server-only";
import { forbidden } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { instanteEnZona } from "@/lib/dias-habiles";
import {
  MAX_DIAS_RANGO, esDuracionValida, MINUTO, bloquesPorDia, calcularDisponibilidad, celdasDelDia, esLectivo, estadoCelda, etiquetaParaTercero, fechasEntre, rangosNoLectivos,
  seCruzan, ventanasLaborales, type BloqueDia, type EstadoCelda, type MotivoOcupado, type Ocupacion, type Rango,
} from "@/lib/disponibilidad";
import { momentoEnZona, sumarDias } from "@/lib/fechas";
import { diaDeSemana, esHora } from "@/lib/horario";
import { ROLES_PERSONAL, esPersonal } from "@/lib/reuniones";
import type { DbTenant } from "./db";
import { wherePorProfesor } from "./horario";
import { requireFeature } from "./plan";
import { feriadosAplicables } from "./plataforma-configuracion";
import { whereSalonActivo } from "./salones-activos";
import { requireRol, type TenantContext } from "./tenant";

// Disponibilidad del personal para reuniones (specs/40). Fuentes por persona en un rango (máx. 14 días): clases
// proyectadas desde el horario, reservas activas (reuniones), bloqueos y ausencias; fuera de horas laborales y días no
// lectivos. PRIVACIDAD: de terceros solo «Ocupado» («Clase» solo para dirección y administrativo); nunca el título ni el
// motivo de reuniones, bloqueos o ausencias ajenas. Las familias nunca consultan la ocupación del personal.

/** Cliente o transacción del colegio (las consultas se repiten dentro de la transacción al confirmar). */
export type Tdb = Pick<DbTenant, "bloqueHorario" | "reservaAgenda" | "bloqueoAgenda" | "eventoAgenda" | "membership">;

export type OcupacionDetallada = Ocupacion & {
  /** Detalle privado: solo se muestra a la propia persona. */
  detalle: string | null;
  reunionId?: string | null;
};

export type Agendas = {
  fechas: string[];
  /** Fechas no lectivas extra (feriados del colegio o región y feriados de la agenda) además de fines de semana y feriados nacionales. */
  noLectivos: string[];
  ventana: Rango[];
  noLectivo: Rango[];
  ocupacion: Map<string, OcupacionDetallada[]>;
};

type TenantZona = { id: string; zonaHoraria: string; horaInicioLaboral: string; horaFinLaboral: string };

/** Lee clases, reservas, bloqueos y no lectivos de las personas entre `desde` y `hasta` (AAAA-MM-DD, inclusive). */
export async function leerAgendas(
  tdb: Tdb, tenant: TenantZona, membershipIds: string[], desde: string, hasta: string, opciones: { excluirReunionId?: string } = {},
): Promise<Agendas> {
  const zona = tenant.zonaHoraria;
  const fechas = fechasEntre(desde, hasta);
  const ini = instanteEnZona(desde, "00:00", zona);
  const fin = instanteEnZona(sumarDias(hasta, 1), "00:00", zona);
  const ids = [...new Set(membershipIds)];
  const [extra, feriadosAgenda, bloques, reservas, bloqueos] = await Promise.all([
    feriadosAplicables(tenant.id, desde, hasta),
    tdb.eventoAgenda.findMany({ where: { tipo: "feriado", salonId: null, inicio: { lt: fin }, OR: [{ fin: null, inicio: { gte: ini } }, { fin: { gt: ini } }] }, select: { inicio: true, fin: true } }),
    ids.length === 0 ? [] : tdb.bloqueHorario.findMany({
      where: { salon: whereSalonActivo, OR: ids.map((id) => wherePorProfesor(id)) },
      select: {
        dia: true, titulo: true, profesorId: true, cursoId: true,
        periodo: { select: { horaInicio: true, horaFin: true } },
        curso: { select: { nombre: true, profesorId: true } },
        salon: { select: { nombre: true } },
      },
    } satisfies Prisma.BloqueHorarioFindManyArgs),
    ids.length === 0 ? [] : tdb.reservaAgenda.findMany({
      where: {
        membershipId: { in: ids }, activa: true, inicio: { lt: fin }, fin: { gt: ini },
        ...(opciones.excluirReunionId ? { OR: [{ reunionId: null }, { reunionId: { not: opciones.excluirReunionId } }] } : {}),
      },
      select: { membershipId: true, inicio: true, fin: true, reunionId: true, reunion: { select: { titulo: true } } },
    }),
    ids.length === 0 ? [] : tdb.bloqueoAgenda.findMany({
      where: { membershipId: { in: ids }, inicio: { lt: fin }, fin: { gt: ini } },
      select: { membershipId: true, inicio: true, fin: true, tipo: true, motivo: true },
    }),
  ]);
  const noLectivos = new Set(extra);
  for (const e of feriadosAgenda) {
    const a = momentoEnZona(e.inicio, zona).isoFecha;
    const b = e.fin ? momentoEnZona(new Date(e.fin.getTime() - 1), zona).isoFecha : a;
    for (const f of fechasEntre(a, b < a ? a : b)) noLectivos.add(f);
  }
  const listaNoLectivos = [...noLectivos].sort();
  const ventana = ventanasLaborales({ fechas, horaInicio: tenant.horaInicioLaboral, horaFin: tenant.horaFinLaboral, zona, noLectivos: listaNoLectivos });
  const noLectivo = rangosNoLectivos(fechas, listaNoLectivos, zona);
  const ocupacion = new Map<string, OcupacionDetallada[]>(ids.map((id) => [id, []]));
  const fechasLectivas = fechas.filter((f) => !noLectivo.some((n) => seCruzan(n, { inicio: instanteEnZona(f, "12:00", zona).getTime(), fin: instanteEnZona(f, "12:01", zona).getTime() })));
  for (const b of bloques) {
    const profesorId = b.curso ? b.curso.profesorId : b.profesorId;
    if (!profesorId || !ocupacion.has(profesorId)) continue;
    for (const f of fechasLectivas) {
      if (diaDeSemana(f) !== b.dia) continue;
      ocupacion.get(profesorId)!.push({
        inicio: instanteEnZona(f, b.periodo.horaInicio, zona).getTime(), fin: instanteEnZona(f, b.periodo.horaFin, zona).getTime(),
        motivo: "clase", detalle: `${b.curso?.nombre ?? b.titulo ?? "Clase"} · ${b.salon.nombre}`,
      });
    }
  }
  for (const r of reservas) {
    ocupacion.get(r.membershipId)?.push({ inicio: r.inicio.getTime(), fin: r.fin.getTime(), motivo: "reunion", detalle: r.reunion?.titulo ?? null, reunionId: r.reunionId });
  }
  for (const b of bloqueos) {
    ocupacion.get(b.membershipId)?.push({ inicio: b.inicio.getTime(), fin: b.fin.getTime(), motivo: b.tipo, detalle: b.motivo });
  }
  return { fechas, noLectivos: listaNoLectivos, ventana, noLectivo, ocupacion };
}

// ───────────── Consulta del asistente ─────────────

const esquemaConsulta = z.object({
  /** Personal requerido (además de quien organiza). */
  requeridos: z.array(z.uuid()).max(30).default([]),
  opcionales: z.array(z.uuid()).max(30).default([]),
  fecha: z.iso.date("Elige la fecha."),
  hora: z.string().refine(esHora, "Elige una hora válida."),
  /** Minutos (5–240): las opciones rápidas o «Otra». */
  duracion: z.coerce.number().refine(esDuracionValida, "Elige una duración de 5 a 240 minutos."),
  /** Días hacia adelante para buscar alternativas (1–14). */
  dias: z.coerce.number().int().min(1).max(MAX_DIAS_RANGO).default(7),
  excluirReunionId: z.uuid().optional(),
  /** Calendario del asistente: alternativas que no se cruzan entre sí, máximo 2 por día. */
  separar: z.boolean().default(false),
  /** `false` = solo la agenda (el calendario); las sugerencias se piden aparte, al abrir «Horarios sugeridos». */
  alternativas: z.boolean().default(true),
});

export type CeldaPersona = { estado: EstadoCelda; etiqueta: string | null };
export type FilaGrilla = {
  membershipId: string; nombre: string; rol: string; requerido: boolean; propia: boolean; celdas: CeldaPersona[];
  /** Tramos ocupados de cada día del rango (privacidad: de terceros solo «Ocupado» o «Clase»). */
  bloques: BloqueDia[];
};
export type FranjaVista = { inicio: string; fin: string; fecha: string; hora: string; horaFin: string; opcionalesLibres: number };

export type Disponibilidad = {
  fecha: string;
  zona: string;
  noLectivo: boolean;
  celdas: { inicio: string; hora: string }[];
  personas: FilaGrilla[];
  /** Franja elegida y quiénes la tienen ocupada (con etiqueta según privacidad). */
  preferida: FranjaVista & { libre: boolean; conflictos: { nombre: string; etiqueta: string; esClase: boolean }[]; fueraDeHorario: boolean };
  alternativas: FranjaVista[];
  /** Días consultados (`fecha` … `fecha + dias − 1`) y si son lectivos. */
  dias: { fecha: string; lectivo: boolean }[];
  /** Jornada laboral del colegio (igual para todo el personal). */
  jornada: { desde: string; hasta: string };
  /** Fecha y hora actuales en la zona del colegio (línea «ahora» y franjas pasadas). */
  hoy: { fecha: string; hora: string };
};

const nombreDe = (u: { nombres: string; apellidos: string | null }) => `${u.nombres} ${u.apellidos ?? ""}`.trim();

/** Personal activo del colegio entre los ids (los demás se descartan: familias, alumnos, inactivos u otro colegio). */
export async function personalValido(tdb: Pick<DbTenant, "membership">, ids: string[]) {
  if (ids.length === 0) return [];
  return tdb.membership.findMany({
    where: { id: { in: [...new Set(ids)] }, rol: { in: [...ROLES_PERSONAL] }, estado: "activa" },
    select: { id: true, rol: true, user: { select: { nombres: true, apellidos: true } } },
  });
}

function vistaFranja(r: Rango, zona: string, opcionalesLibres = 0): FranjaVista {
  const a = momentoEnZona(new Date(r.inicio), zona);
  return { inicio: new Date(r.inicio).toISOString(), fin: new Date(r.fin).toISOString(), fecha: a.isoFecha, hora: a.hora, horaFin: momentoEnZona(new Date(r.fin), zona).hora, opcionalesLibres };
}

/** Texto de una ocupación según quién mira (privacidad). */
export function etiquetaOcupacion(o: OcupacionDetallada, propia: boolean, veClases: boolean): string {
  if (propia) {
    const base = { clase: "Clase", reunion: "Reunión", bloqueo: "Bloqueado", ausencia: "Ausencia" }[o.motivo as MotivoOcupado];
    return o.detalle ? `${base}: ${o.detalle}` : base;
  }
  return etiquetaParaTercero(o.motivo, veClases);
}

/**
 * Cuadrícula del día elegido por persona, tramos ocupados por día (calendario del asistente) y alternativas en los
 * próximos `dias` días. Solo personal (las familias no
 * tienen calendario: aparecen «Pendiente de confirmar» en la UI). Quien consulta siempre es requerido.
 */
export async function consultarDisponibilidad(ctx: TenantContext, entrada: unknown, ahora = new Date()): Promise<Disponibilidad | { error: string }> {
  requireFeature(ctx, "reuniones");
  requireRol(ctx, [...ROLES_PERSONAL]);
  const d = esquemaConsulta.safeParse(entrada);
  if (!d.success) return { error: d.error.issues[0].message };
  const zona = ctx.tenant.zonaHoraria;
  const requeridosIds = [ctx.membership.id, ...d.data.requeridos.filter((id) => id !== ctx.membership.id)];
  const opcionalesIds = d.data.opcionales.filter((id) => !requeridosIds.includes(id));
  const personal = await personalValido(ctx.db, [...requeridosIds, ...opcionalesIds]);
  const porId = new Map(personal.map((p) => [p.id, p]));
  const hasta = sumarDias(d.data.fecha, d.data.dias - 1);
  const agendas = await leerAgendas(ctx.db, ctx.tenant, [...porId.keys()], d.data.fecha, hasta, { excluirReunionId: d.data.excluirReunionId });
  const inicio = instanteEnZona(d.data.fecha, d.data.hora, zona).getTime();
  const preferida = { inicio, fin: inicio + d.data.duracion * MINUTO };
  const personas = [...requeridosIds, ...opcionalesIds].filter((id) => porId.has(id));
  const calculo = calcularDisponibilidad({
    personas: personas.map((id) => ({ id, requerido: requeridosIds.includes(id), ocupado: agendas.ocupacion.get(id) ?? [] })),
    ventana: agendas.ventana, duracionMin: d.data.duracion, preferida, noAntesDe: ahora.getTime(),
    maxAlternativas: d.data.alternativas ? 5 : 0,
    distintas: d.data.separar ? { claveDia: (t) => momentoEnZona(new Date(t), zona).isoFecha, maxPorDia: 2 } : undefined,
  });
  const veClases = ctx.rol === "direccion" || ctx.rol === "administrativo";
  const celdas = celdasDelDia(d.data.fecha, { horaInicio: ctx.tenant.horaInicioLaboral, horaFin: ctx.tenant.horaFinLaboral, zona });
  const filas: FilaGrilla[] = personas.map((id) => {
    const p = porId.get(id)!;
    const propia = id === ctx.membership.id;
    const ocupado = agendas.ocupacion.get(id) ?? [];
    return {
      membershipId: id, nombre: nombreDe(p.user), rol: p.rol, requerido: requeridosIds.includes(id), propia,
      celdas: celdas.map((c) => {
        const estado = estadoCelda(c, { laboral: agendas.ventana, noLectivo: agendas.noLectivo, ocupado });
        const o = estado === "ocupado" ? ocupado.find((x) => seCruzan(x, c)) : undefined;
        return { estado, etiqueta: o ? etiquetaOcupacion(o, propia, veClases) : null };
      }),
      bloques: bloquesPorDia(ocupado.map((o) => ({ inicio: o.inicio, fin: o.fin, etiqueta: etiquetaOcupacion(o, propia, veClases), esClase: o.motivo === "clase" })), agendas.fechas, zona),
    };
  });
  const conflictos = personas.flatMap((id) => {
    const o = (agendas.ocupacion.get(id) ?? []).find((x) => seCruzan(x, preferida));
    return o ? [{ nombre: nombreDe(porId.get(id)!.user), etiqueta: etiquetaOcupacion(o, id === ctx.membership.id, veClases), esClase: o.motivo === "clase" }] : [];
  });
  const fueraDeHorario = !agendas.ventana.some((v) => v.inicio <= preferida.inicio && preferida.fin <= v.fin);
  return {
    fecha: d.data.fecha, zona, noLectivo: agendas.noLectivo.some((n) => seCruzan(n, preferida)),
    celdas: celdas.map((c) => ({ inicio: new Date(c.inicio).toISOString(), hora: momentoEnZona(new Date(c.inicio), zona).hora })),
    personas: filas,
    preferida: { ...vistaFranja(preferida, zona), libre: calculo.preferidaLibre, conflictos, fueraDeHorario },
    alternativas: calculo.alternativas.map((a) => vistaFranja(a, zona, a.opcionalesLibres)),
    dias: agendas.fechas.map((f) => ({ fecha: f, lectivo: esLectivo(f, agendas.noLectivos) })),
    jornada: { desde: ctx.tenant.horaInicioLaboral, hasta: ctx.tenant.horaFinLaboral },
    hoy: { fecha: momentoEnZona(ahora, zona).isoFecha, hora: momentoEnZona(ahora, zona).hora },
  };
}

// ───────────── Franjas para familias (horario de atención ∩ libre) ─────────────

/**
 * Franjas que se ofrecen a una familia para pedir una reunión con un docente: horario de atención del docente ∩ su
 * tiempo libre, en los próximos 14 días. No revela la ocupación: solo devuelve franjas libres. Vacío si el docente no
 * configuró horario de atención (la familia propone fecha y hora).
 */
export async function franjasDeAtencion(
  tdb: Tdb & Pick<DbTenant, "horarioAtencion">, tenant: TenantZona, docenteId: string, desde: string, duracion = 30, ahora = new Date(),
): Promise<FranjaVista[]> {
  const horario = await tdb.horarioAtencion.findMany({ where: { membershipId: docenteId }, select: { dia: true, horaDesde: true, horaHasta: true } });
  if (horario.length === 0) return [];
  const hasta = sumarDias(desde, MAX_DIAS_RANGO - 1);
  const agendas = await leerAgendas(tdb, tenant, [docenteId], desde, hasta);
  const atencion: Rango[] = agendas.fechas.flatMap((f) =>
    horario.filter((h) => h.dia === diaDeSemana(f)).map((h) => ({ inicio: instanteEnZona(f, h.horaDesde, tenant.zonaHoraria).getTime(), fin: instanteEnZona(f, h.horaHasta, tenant.zonaHoraria).getTime() })),
  );
  const calculo = calcularDisponibilidad({
    personas: [{ id: docenteId, requerido: true, ocupado: [...(agendas.ocupacion.get(docenteId) ?? []), ...agendas.noLectivo] }],
    ventana: atencion, duracionMin: duracion, preferida: { inicio: ahora.getTime(), fin: ahora.getTime() }, noAntesDe: ahora.getTime() + 60 * MINUTO,
    maxAlternativas: 40, pasoMin: duracion,
  });
  return calculo.alternativas.map((a) => vistaFranja(a, tenant.zonaHoraria));
}

export function requirePersonal(ctx: TenantContext) {
  if (!esPersonal(ctx.rol)) forbidden();
}

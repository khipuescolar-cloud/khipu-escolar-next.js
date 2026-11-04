// Calendario institucional (specs/12, plan Pro): lógica pura compartida cliente/servidor. Vistas Día, Semana, Mes y
// Lista; proyección de las clases del horario semanal a fechas reales; ítems del calendario con su tipo.
import { feriadosNacionales, instanteEnZona } from "@/lib/dias-habiles";
import { cuadriculaMes, esFechaReal, lunesDeSemana, momentoEnZona, sumarDias } from "@/lib/fechas";
import { diaDeSemana, minutos } from "@/lib/horario";

/** Rango máximo (días) que se consulta con clases proyectadas: la cuadrícula de un mes ocupa a lo más 6 semanas. */
export const MAX_DIAS_RANGO = 42;
/** Días que cubre la vista Lista («próximos»). */
export const DIAS_LISTA = 30;

export const VISTAS = ["dia", "semana", "mes", "lista"] as const;
export type VistaAgenda = (typeof VISTAS)[number];
export const NOMBRE_VISTA: Record<VistaAgenda, string> = { dia: "Día", semana: "Semana", mes: "Mes", lista: "Lista" };

/** Filtros por tipo. «todo» muestra todo lo visible; «personal» solo existe para dirección y administrativo. */
export const FILTROS = ["todo", "mis-reuniones", "personal", "academico", "institucional"] as const;
export type FiltroAgenda = (typeof FILTROS)[number];
export const NOMBRE_FILTRO: Record<FiltroAgenda, string> = {
  todo: "Todo",
  "mis-reuniones": "Mis reuniones",
  personal: "Reuniones del personal",
  academico: "Eventos académicos",
  institucional: "Actividades institucionales",
};

export const esVista = (v: string | undefined): v is VistaAgenda => !!v && (VISTAS as readonly string[]).includes(v);
export const esFiltro = (v: string | undefined): v is FiltroAgenda => !!v && (FILTROS as readonly string[]).includes(v);

/** Nombres de los 7 días (1 = lunes … 7 = domingo). */
export const NOMBRE_DIA_SEMANA = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;
export const NOMBRE_DIA_SEMANA_CORTO = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** Fechas AAAA-MM-DD de `desde` a `hasta`, ambas incluidas. */
export function fechasEntre(desde: string, hasta: string): string[] {
  const res: string[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) res.push(f);
  return res;
}

/** Días que muestra cada vista y las fechas de «anterior» y «siguiente». */
export function rangoDeVista(vista: VistaAgenda, fecha: string): { dias: string[]; anterior: string; siguiente: string } {
  if (vista === "dia") return { dias: [fecha], anterior: sumarDias(fecha, -1), siguiente: sumarDias(fecha, 1) };
  if (vista === "semana") {
    const lunes = lunesDeSemana(fecha);
    return { dias: fechasEntre(lunes, sumarDias(lunes, 6)), anterior: sumarDias(lunes, -7), siguiente: sumarDias(lunes, 7) };
  }
  if (vista === "mes") {
    const [anio, mes] = fecha.split("-").map(Number);
    const mesIso = (a: number, m: number) => `${a}-${String(m).padStart(2, "0")}-01`;
    return {
      dias: cuadriculaMes(anio, mes).flat(),
      anterior: mes === 1 ? mesIso(anio - 1, 12) : mesIso(anio, mes - 1),
      siguiente: mes === 12 ? mesIso(anio + 1, 1) : mesIso(anio, mes + 1),
    };
  }
  return { dias: fechasEntre(fecha, sumarDias(fecha, DIAS_LISTA - 1)), anterior: sumarDias(fecha, -DIAS_LISTA), siguiente: sumarDias(fecha, DIAS_LISTA) };
}

/** Lee `?vista=&fecha=&filtro=&salon=` con valores por defecto seguros. */
export function leerEstadoAgenda(sp: Record<string, string | string[] | undefined>, hoy: string) {
  const uno = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const vista = uno("vista");
  const fecha = uno("fecha");
  const filtro = uno("filtro");
  const salon = uno("salon");
  return {
    vista: esVista(vista) ? vista : ("semana" as VistaAgenda),
    fecha: esFechaReal(fecha) ? fecha : hoy,
    filtro: esFiltro(filtro) ? filtro : ("todo" as FiltroAgenda),
    salon: salon && /^[0-9a-f-]{36}$/i.test(salon) ? salon : undefined,
  };
}

/** URL de la agenda con el estado dado (sin los valores por defecto). */
export function urlAgenda(e: { vista: VistaAgenda; fecha?: string; filtro?: FiltroAgenda; salon?: string }): string {
  const p = new URLSearchParams();
  p.set("vista", e.vista);
  if (e.fecha) p.set("fecha", e.fecha);
  if (e.filtro && e.filtro !== "todo") p.set("filtro", e.filtro);
  if (e.salon) p.set("salon", e.salon);
  return `/agenda?${p.toString()}`;
}

// ───────────── Clases proyectadas desde el horario semanal ─────────────

/** Días sin clases: feriados nacionales del Perú más los extra (regionales, del colegio o eventos «Feriado» de todo el colegio). */
export function diasNoLectivos(fechas: readonly string[], extra: readonly string[] = []): Set<string> {
  const anios = new Set(fechas.map((f) => Number(f.slice(0, 4))));
  const nacionales = [...anios].flatMap((a) => feriadosNacionales(a));
  return new Set([...nacionales, ...extra].filter((f) => fechas.includes(f)));
}

export type BloqueSemanal = { id: string; dia: number; horaInicio: string; horaFin: string };

/**
 * Cada bloque del horario semanal (lunes = 1 … domingo = 7, horas «HH:mm» del colegio) en cada fecha del rango que cae en
 * su día de la semana, salvo los días no lectivos. El instante se calcula en la zona horaria del colegio. Id: `<bloque>:<fecha>`.
 */
export function proyectarClases<B extends BloqueSemanal>(
  bloques: readonly B[],
  fechas: readonly string[],
  noLectivos: ReadonlySet<string>,
  zonaHoraria: string,
): { id: string; fecha: string; inicio: Date; fin: Date; bloque: B }[] {
  const res: { id: string; fecha: string; inicio: Date; fin: Date; bloque: B }[] = [];
  for (const fecha of fechas) {
    if (noLectivos.has(fecha)) continue;
    const dia = diaDeSemana(fecha);
    for (const b of bloques) {
      if (b.dia !== dia) continue;
      res.push({ id: `${b.id}:${fecha}`, fecha, inicio: instanteEnZona(fecha, b.horaInicio, zonaHoraria), fin: instanteEnZona(fecha, b.horaFin, zonaHoraria), bloque: b });
    }
  }
  return res.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

// ───────────── Ítems del calendario (lo que dibuja la grilla) ─────────────

export type TipoItemCalendario = "clase" | "reunion" | "evento" | "evaluacion" | "entrega" | "bloqueo";

export type AccionItem = { href: string; texto: string; icono: "lista" | "tareas" | "notas" };

/** Un ítem ya ubicado en la hora del colegio. Serializable (cruza al cliente). */
export type ItemCalendario = {
  id: string;
  tipo: TipoItemCalendario;
  /** Tipo de EventoAgenda (evento, examen, feriado, actividad, reunion) cuando `tipo` es «evento». */
  subtipo?: string;
  titulo: string;
  descripcion: string | null;
  /** Salón, curso, «Todo el colegio» o «Reunión individual». */
  ambito: string;
  lugar: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  /** Feriados, evaluaciones, entregas y eventos sin hora: van en la fila «Todo el día». */
  todoElDia: boolean;
  href?: string;
  /** Estado desconocido o «cancelada» (se muestra tachado). */
  cancelado?: boolean;
  // Solo clases:
  cursoId?: string | null;
  salonNombre?: string;
  aula?: string | null;
  acciones?: AccionItem[];
  enCruce?: boolean;
};

/** Duración que se asume cuando una reunión o evento no tiene hora de fin. */
export const DURACION_SIN_FIN = 60;

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export type ItemAgendaBase = {
  id: string; tipo: string; titulo: string; descripcion: string | null; ambito: string; lugar?: string | null; inicio: Date; fin: Date | null;
  href?: string; sinHora?: boolean; estado?: string; categoria?: string; cursoId?: string | null; salonNombre?: string; aula?: string | null;
};

/** Convierte un ítem de la agenda (instantes) en un ítem del calendario (fecha y horas del colegio). */
export function itemCalendarioDe(item: ItemAgendaBase, zonaHoraria: string): ItemCalendario {
  const inicio = momentoEnZona(item.inicio, zonaHoraria);
  const fin = item.fin ? momentoEnZona(item.fin, zonaHoraria) : null;
  const minInicio = minutos(inicio.hora);
  const minFin = fin ? (fin.isoFecha === inicio.isoFecha ? minutos(fin.hora) : 24 * 60 - 1) : minInicio + DURACION_SIN_FIN;
  const esReunion = item.categoria === "mi-reunion" || item.categoria === "personal";
  const tipo: TipoItemCalendario =
    item.tipo === "clase" ? "clase"
      : esReunion ? "reunion"
        : item.tipo === "entrega" ? "entrega"
          : item.tipo === "examen" && item.sinHora ? "evaluacion"
            : "evento";
  return {
    id: item.id, tipo, subtipo: tipo === "evento" ? item.tipo : undefined,
    titulo: item.titulo, descripcion: item.descripcion, ambito: item.ambito, lugar: item.lugar ?? null,
    fecha: inicio.isoFecha, horaInicio: inicio.hora, horaFin: hhmm(Math.min(Math.max(minFin, minInicio + 15), 24 * 60 - 1)),
    todoElDia: item.tipo === "feriado" || item.tipo === "entrega" || !!item.sinHora || (item.tipo !== "clase" && inicio.hora === "00:00"),
    href: item.href,
    cancelado: item.estado === "cancelada" || undefined,
    ...(item.tipo === "clase" ? { cursoId: item.cursoId ?? null, salonNombre: item.salonNombre, aula: item.aula ?? null } : {}),
  };
}

/** Agrupa ítems por fecha (en orden de hora dentro del día). */
export function porFecha<T extends { fecha: string; horaInicio: string; todoElDia: boolean }>(items: readonly T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  const orden = [...items].sort((a, b) => Number(b.todoElDia) - Number(a.todoElDia) || minutos(a.horaInicio) - minutos(b.horaInicio));
  for (const it of orden) m.set(it.fecha, [...(m.get(it.fecha) ?? []), it]);
  return m;
}

/** Celda del mes: hasta `max` ítems y cuántos más quedan. */
export function resumenCelda<T>(items: readonly T[], max = 3): { visibles: T[]; mas: number } {
  return { visibles: items.slice(0, max), mas: Math.max(0, items.length - max) };
}

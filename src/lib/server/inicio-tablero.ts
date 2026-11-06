import "server-only";
import type { EstadoAsistencia } from "@/generated/prisma/enums";
import { fechaDb } from "@/lib/fechas";
import type { Feature } from "@/lib/planes";
import type { GrupoNav } from "@/lib/navegacion";
import { elegirRegistroDelDia } from "@/lib/reportes-asistencia";
import { AMBITO_DIA, hoyDelColegio, opcionesDeLista } from "./asistencia";
import { whereComunicadosVisibles } from "./comunicados";
import { cursosDelDocente } from "./cursos";
import { cursosDeHoy } from "./horario";
import { contarPendientes } from "./justificaciones";
import { conteoNoLeidos } from "./mensajes";
import { contarNotificacionesSinLeer, ROLES_BANDEJA } from "./notificaciones/bandeja";
import { estadoModulo } from "./plan";
import { resumenAsistenciaHoy, resumenAvisosHoy, type ResumenAvisosHoy, type ResumenSalon } from "./resumen-direccion";
import { dondeVisible } from "./reuniones";
import { whereSalonActivo } from "./salones-activos";
import { tareasDeFamilia } from "./tareas";
import { alumnoIdsVisibles, salonIdsVisibles, type TenantContext } from "./tenant";

// Inicio como tablero de «lo que te toca hoy» (specs/18 · Inicio). Solo lee: cuenta pendientes que ya existen en cada
// módulo, con el mismo alcance por rol que sus páginas. Cada pendiente lleva su sección (color del menú) y una acción.

export type Pendiente = {
  clave: string;
  seccion: GrupoNav;
  cantidad: number;
  /** Frase corta con el número ya incluido: «2 justificaciones por revisar». */
  titulo: string;
  detalle?: string;
  href: string;
  accion: string;
  /** Informativo (permisos o incidencias del día): no es una tarea, se muestra después de las tareas. */
  informativo?: boolean;
};
export type ListaPorPasar = { salonId: string; salon: string; titulo: string; href: string; hora: string | null; ahora: boolean };
export type LlegadaHijo = { alumnoId: string; nombre: string; salon: string; estado: EstadoAsistencia | null; hora: string | null; horaSalida: string | null };
export type TareaProxima = { id: string; titulo: string; curso: string; alumno: string | null; limite: Date | null; href: string };
export type ReunionProxima = { id: string; titulo: string; inicio: Date; lugar: string | null; porConfirmar: boolean; porResponder: boolean };
export type ComunicadoReciente = { id: string; titulo: string; publicadoAt: Date; importante: boolean };
export type IngresosPorteria = { llegaron: number; tarde: number; salidas: number; sinIngreso: number; total: number };
export type AsistenciaColegio = { salones: ResumenSalon[]; sinLista: number } & Omit<ResumenSalon, "salonId" | "salon">;

export type TableroInicio = {
  hoy: { isoFecha: string; hora: string; habil: boolean };
  pendientes: Pendiente[];
  listas: ListaPorPasar[];
  llegadas: LlegadaHijo[];
  tareas: TareaProxima[];
  reuniones: ReunionProxima[];
  comunicados: ComunicadoReciente[];
  porteria: IngresosPorteria | null;
  colegio: AsistenciaColegio | null;
  avisos: ResumenAvisosHoy | null;
};

const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Lunes a viernes (fecha AAAA-MM-DD del colegio). */
function esDiaHabil(isoFecha: string): boolean {
  const d = fechaDb(isoFecha).getUTCDay();
  return d >= 1 && d <= 5;
}

export async function tableroInicio(ctx: TenantContext, ahora = new Date()): Promise<TableroInicio> {
  const { isoFecha, hora } = hoyDelColegio(ctx, ahora);
  const habil = esDiaHabil(isoFecha);
  const activo = (f: Feature) => estadoModulo(ctx, f).estado === "activo";
  const rol = ctx.rol;
  const personal = rol === "direccion" || rol === "profesor" || rol === "administrativo";
  const familia = rol === "apoderado" || rol === "alumno";

  const [
    listas, justificaciones, mensajes, notificaciones, entregas, evaluaciones, reuniones, delDia, colegio, avisos, llegadas, tareas, comunicados, porteria,
  ] = await Promise.all([
    rol === "profesor" && habil && activo("asistencia") ? listasPorPasar(ctx, isoFecha, ahora) : [],
    (rol === "profesor" || rol === "direccion") && activo("justificaciones") ? contarPendientes(ctx) : 0,
    (rol === "profesor" || rol === "apoderado") && activo("mensajes") ? conteoNoLeidos(ctx) : 0,
    ROLES_BANDEJA.includes(rol) && activo("avisos") ? contarNotificacionesSinLeer(ctx) : 0,
    rol === "profesor" && activo("tareas") ? entregasPorRevisar(ctx) : 0,
    rol === "profesor" && activo("notas") ? evaluacionesPorPublicar(ctx, isoFecha) : 0,
    rol !== "alumno" && rol !== "porteria" && activo("reuniones") ? reunionesProximas(ctx, ahora) : { proximas: [], porConfirmar: 0, porResponder: 0 },
    personal && activo("asistencia") ? permisosEIncidenciasDeHoy(ctx, isoFecha) : { permisos: 0, incidencias: 0 },
    rol === "direccion" && activo("asistencia") ? asistenciaDelColegio(ctx, ahora) : null,
    (rol === "direccion" || rol === "administrativo") && activo("avisos") ? resumenAvisosHoy(ctx, ahora) : null,
    rol === "apoderado" && activo("asistencia") ? llegadasDeHoy(ctx, isoFecha) : [],
    familia && activo("tareas") ? tareasProximas(ctx, ahora) : { lista: [], total: 0 },
    rol !== "porteria" && activo("comunicados") ? comunicadosRecientes(ctx, ahora) : [],
    rol === "porteria" && activo("porteria") ? ingresosDelDia(ctx, isoFecha) : null,
  ]);

  const pendientes: Pendiente[] = [];
  const agregar = (p: Pendiente) => p.cantidad > 0 && pendientes.push(p);
  agregar({
    clave: "listas", seccion: "dia", cantidad: listas.length, titulo: plural(listas.length, "lista por pasar", "listas por pasar"),
    detalle: listas.slice(0, 3).map((l) => `${l.titulo} · ${l.salon}`).join(" · "), href: listas[0]?.href ?? "/asistencia", accion: "Pasar lista",
  });
  if (colegio) {
    agregar({
      clave: "salones-sin-lista", seccion: "dia", cantidad: colegio.sinLista, titulo: plural(colegio.sinLista, "salón sin asistencia registrada", "salones sin asistencia registrada"),
      detalle: colegio.salones.filter((s) => s.total > 0 && s.sinRegistrar === s.total).slice(0, 4).map((s) => s.salon).join(" · "),
      href: "/asistencia/reportes", accion: "Ver reporte",
    });
  }
  agregar({ clave: "justificaciones", seccion: "dia", cantidad: justificaciones, titulo: plural(justificaciones, "justificación por revisar", "justificaciones por revisar"), href: "/justificaciones", accion: "Revisar" });
  agregar({ clave: "mensajes", seccion: "comunicacion", cantidad: mensajes, titulo: plural(mensajes, "mensaje sin leer", "mensajes sin leer"), href: "/mensajes", accion: "Leer" });
  agregar({
    clave: "reuniones-confirmar", seccion: "comunicacion", cantidad: reuniones.porConfirmar, titulo: plural(reuniones.porConfirmar, "solicitud de reunión por confirmar", "solicitudes de reunión por confirmar"),
    href: "/reuniones", accion: "Confirmar",
  });
  agregar({
    clave: "reuniones-responder", seccion: "comunicacion", cantidad: reuniones.porResponder, titulo: plural(reuniones.porResponder, "invitación a reunión por responder", "invitaciones a reunión por responder"),
    href: "/reuniones", accion: "Responder",
  });
  agregar({ clave: "entregas", seccion: "academico", cantidad: entregas, titulo: plural(entregas, "entrega de tarea por revisar", "entregas de tareas por revisar"), href: "/tareas", accion: "Revisar" });
  agregar({ clave: "evaluaciones", seccion: "academico", cantidad: evaluaciones, titulo: plural(evaluaciones, "evaluación por publicar", "evaluaciones por publicar"), detalle: "Ya pasó su fecha y sigue programada.", href: "/notas", accion: "Ir a notas" });
  agregar({
    clave: "tareas", seccion: "academico", cantidad: tareas.total, titulo: plural(tareas.total, "tarea por entregar esta semana", "tareas por entregar esta semana"),
    href: "/tareas", accion: "Ver tareas",
  });
  if (avisos) {
    agregar({ clave: "avisos-error", seccion: "dia", cantidad: avisos.conError, titulo: plural(avisos.conError, "aviso a familias no se entregó", "avisos a familias no se entregaron"), href: "/avisos?estado=fallidos", accion: "Revisar avisos" });
  }
  agregar({ clave: "notificaciones", seccion: "comunicacion", cantidad: notificaciones, titulo: plural(notificaciones, "notificación nueva", "notificaciones nuevas"), href: "/notificaciones", accion: "Ver" });
  agregar({ clave: "permisos", seccion: "dia", cantidad: delDia.permisos, titulo: plural(delDia.permisos, "permiso vigente hoy", "permisos vigentes hoy"), href: "/permisos", accion: "Ver", informativo: true });
  agregar({ clave: "incidencias", seccion: "dia", cantidad: delDia.incidencias, titulo: plural(delDia.incidencias, "incidencia registrada hoy", "incidencias registradas hoy"), href: "/incidencias", accion: "Ver", informativo: true });

  return {
    hoy: { isoFecha, hora, habil },
    pendientes,
    listas,
    llegadas,
    tareas: tareas.lista,
    reuniones: reuniones.proximas,
    comunicados,
    porteria,
    colegio,
    avisos,
  };
}

/** Profesor: listas de hoy que aún no pasa (la del día si es tutor y las de sus cursos con clase hoy). */
async function listasPorPasar(ctx: TenantContext, isoFecha: string, ahora: Date): Promise<ListaPorPasar[]> {
  const [opciones, cursosHoy] = await Promise.all([opcionesDeLista(ctx), cursosDeHoy(ctx, ahora)]);
  const candidatas = opciones.filter((o) => o.ambito === AMBITO_DIA || cursosHoy.has(o.ambito));
  if (candidatas.length === 0) return [];
  // Una lista cuenta como pasada si ya tiene algún registro hecho desde la lista (portería no reemplaza la del tutor).
  const registradas = await ctx.db.asistencia.findMany({
    where: {
      fecha: fechaDb(isoFecha),
      origen: "lista",
      ambito: { in: [...new Set(candidatas.map((o) => o.ambito))] },
      alumno: { salonId: { in: [...new Set(candidatas.map((o) => o.salonId))] } },
    },
    select: { ambito: true, alumno: { select: { salonId: true } } },
  });
  const pasadas = new Set(registradas.map((r) => `${r.alumno.salonId}:${r.ambito}`));
  return candidatas
    .filter((o) => !pasadas.has(`${o.salonId}:${o.ambito}`))
    .map((o) => {
      const clase = o.ambito === AMBITO_DIA ? null : cursosHoy.get(o.ambito);
      return { salonId: o.salonId, salon: o.salonNombre, titulo: o.titulo, href: `/asistencia?salon=${o.salonId}&ambito=${o.ambito}`, hora: clase?.horaInicio ?? null, ahora: clase?.ahora ?? false };
    })
    .sort((a, b) => Number(b.ahora) - Number(a.ahora) || (a.hora ?? "").localeCompare(b.hora ?? ""));
}

/** Profesor: entregas recibidas que aún no revisa (tareas suyas o de sus cursos, como en Tareas). */
async function entregasPorRevisar(ctx: TenantContext): Promise<number> {
  const cursoIds = (await cursosDelDocente(ctx)).map((c) => c.id);
  return ctx.db.tareaAsignacion.count({
    where: {
      estado: "entregada",
      retiradaAt: null,
      tarea: { estado: { not: "archivada" }, OR: [{ creadoPorId: ctx.membership.id }, { cursos: { some: { cursoId: { in: cursoIds } } } }] },
    },
  });
}

/** Profesor: evaluaciones de sus cursos que siguen programadas aunque su fecha ya llegó (una por grupo). */
async function evaluacionesPorPublicar(ctx: TenantContext, isoFecha: string): Promise<number> {
  const grupos = await ctx.db.evaluacion.groupBy({
    by: ["grupoId"],
    where: { estado: "programada", fecha: { lte: fechaDb(isoFecha) }, curso: { profesorId: ctx.membership.id, salon: whereSalonActivo } },
  });
  return grupos.length;
}

/** Reuniones de los próximos 7 días visibles para el usuario, solicitudes que organiza por confirmar e invitaciones por responder. */
async function reunionesProximas(ctx: TenantContext, ahora: Date) {
  const futuras = { inicio: { gte: ahora } };
  const [filas, porConfirmar, porResponder] = await Promise.all([
    ctx.db.reunion.findMany({
      where: { AND: [dondeVisible(ctx), { estado: { in: ["programada", "por_confirmar"] }, inicio: { gte: ahora, lte: new Date(ahora.getTime() + SEMANA_MS) } }] },
      orderBy: { inicio: "asc" },
      take: 4,
      select: { id: true, titulo: true, inicio: true, lugar: true, estado: true, organizadorId: true, invitados: { where: { membershipId: ctx.membership.id }, select: { respuesta: true }, take: 1 } },
    }),
    ctx.rol === "apoderado" ? 0 : ctx.db.reunion.count({ where: { estado: "por_confirmar", organizadorId: ctx.membership.id, ...futuras } }),
    ctx.db.reunionInvitado.count({ where: { membershipId: ctx.membership.id, respuesta: "pendiente", reunion: { estado: "programada", ...futuras } } }),
  ]);
  return {
    proximas: filas.map((r) => ({
      id: r.id, titulo: r.titulo, inicio: r.inicio, lugar: r.lugar,
      porConfirmar: r.estado === "por_confirmar" && r.organizadorId === ctx.membership.id,
      porResponder: r.estado === "programada" && r.invitados[0]?.respuesta === "pendiente",
    })),
    porConfirmar,
    porResponder,
  };
}

/** Permisos vigentes e incidencias registradas hoy en el alcance del usuario (profesor: sus salones). */
async function permisosEIncidenciasDeHoy(ctx: TenantContext, isoFecha: string) {
  const fecha = fechaDb(isoFecha);
  const alcance = ctx.rol === "profesor" ? { alumno: { salonId: { in: await salonIdsVisibles(ctx) } } } : {};
  const [permisos, incidencias] = await Promise.all([
    ctx.db.permisoAsistencia.count({ where: { anuladoAt: null, desde: { lte: fecha }, hasta: { gte: fecha }, ...alcance } }),
    ctx.db.incidencia.count({ where: { fecha, ...alcance } }),
  ]);
  return { permisos, incidencias };
}

/** Dirección: asistencia al colegio de hoy, sumada y por salón (los salones con alumnos y sin ningún registro = sin lista). */
async function asistenciaDelColegio(ctx: TenantContext, ahora: Date): Promise<AsistenciaColegio> {
  const salones = await resumenAsistenciaHoy(ctx, ahora);
  const suma = { llego: 0, tarde: 0, falta: 0, problema: 0, sinRegistrar: 0, total: 0 };
  for (const s of salones) for (const k of Object.keys(suma) as (keyof typeof suma)[]) suma[k] += s[k];
  return { salones, sinLista: salones.filter((s) => s.total > 0 && s.sinRegistrar === s.total).length, ...suma };
}

/** Familia: llegada de hoy de cada hijo (registro que cuenta del día, como en los reportes). */
async function llegadasDeHoy(ctx: TenantContext, isoFecha: string): Promise<LlegadaHijo[]> {
  const ids = await alumnoIdsVisibles(ctx);
  if (ids.length === 0) return [];
  const [hijos, registros] = await Promise.all([
    ctx.db.alumno.findMany({ where: { id: { in: ids }, estado: "activo" }, orderBy: { nombres: "asc" }, select: { id: true, nombres: true, salon: { select: { nombre: true } } } }),
    ctx.db.asistencia.findMany({ where: { alumnoId: { in: ids }, fecha: fechaDb(isoFecha) }, select: { alumnoId: true, ambito: true, estado: true, hora: true, horaSalida: true } }),
  ]);
  return hijos.map((h) => {
    const r = elegirRegistroDelDia(registros.filter((x) => x.alumnoId === h.id));
    return { alumnoId: h.id, nombre: h.nombres.split(/\s+/)[0], salon: h.salon.nombre, estado: r?.estado ?? null, hora: r?.hora ?? null, horaSalida: r?.horaSalida ?? null };
  });
}

/** Familia y alumno: tareas pendientes para mañana y esta semana (las mismas que agrupa Tareas). */
async function tareasProximas(ctx: TenantContext, ahora: Date) {
  const porHijo = await tareasDeFamilia(ctx, ahora);
  const conNombre = porHijo.length > 1;
  const items = porHijo.flatMap((h) =>
    [...h.grupos.manana, ...h.grupos.semana].map((t) => ({
      id: t.id, titulo: t.titulo, curso: t.curso, alumno: conNombre ? h.alumno.nombres.split(/\s+/)[0] : null, limite: t.limite,
      href: `/tareas/${t.id}?alumno=${h.alumno.id}`,
    })),
  );
  items.sort((a, b) => (a.limite?.getTime() ?? Infinity) - (b.limite?.getTime() ?? Infinity));
  return { lista: items.slice(0, 5), total: items.length };
}

/** Comunicados visibles publicados en los últimos 7 días (los 3 más recientes). */
async function comunicadosRecientes(ctx: TenantContext, ahora: Date): Promise<ComunicadoReciente[]> {
  return ctx.db.comunicado.findMany({
    where: { AND: [await whereComunicadosVisibles(ctx), { publicadoAt: { gte: new Date(ahora.getTime() - SEMANA_MS) } }] },
    orderBy: { publicadoAt: "desc" },
    take: 3,
    select: { id: true, titulo: true, publicadoAt: true, importante: true },
  });
}

/** Portería: ingresos de hoy al colegio (asistencia del día de alumnos activos) y salidas registradas. */
async function ingresosDelDia(ctx: TenantContext, isoFecha: string): Promise<IngresosPorteria> {
  const dia = { fecha: fechaDb(isoFecha), ambito: AMBITO_DIA, alumno: { estado: "activo" as const, salon: whereSalonActivo } };
  const [porEstado, salidas, total] = await Promise.all([
    ctx.db.asistencia.groupBy({ by: ["estado"], where: dia, _count: { _all: true } }),
    ctx.db.asistencia.count({ where: { ...dia, horaSalida: { not: null } } }),
    ctx.db.alumno.count({ where: { estado: "activo", salon: whereSalonActivo } }),
  ]);
  const de = (e: EstadoAsistencia) => porEstado.find((p) => p.estado === e)?._count._all ?? 0;
  const llegaron = de("llego") + de("tarde");
  return { llegaron, tarde: de("tarde"), salidas, sinIngreso: Math.max(0, total - llegaron), total };
}

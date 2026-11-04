import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { fechaDb, fechaLima, inicioDiaLima, sumarDias } from "@/lib/fechas";
import { db } from "../db";
import { decodificarTema } from "./temas";

// Resúmenes semanales de Nudito+ para la familia (specs/29). Se arman SOLO con metadatos (`NuditoMensaje.intencion`
// = «área|tema|dificultad»), nunca con el texto de las conversaciones. Los llama el cron semanal o una acción manual.

export type TemaResumen = { area: string; tema: string; mensajes: number };

export type Agregado = { temas: TemaResumen[]; dificultades: string[]; mensajes: number };

/** Puro: agrupa los metadatos de los mensajes del alumno por área y tema. Dificultad = 2+ mensajes con dificultad en un tema. */
export function agregarTemas(intenciones: (string | null)[]): Agregado {
  const porTema = new Map<string, TemaResumen & { dificultad: number }>();
  for (const i of intenciones) {
    const t = decodificarTema(i);
    if (!t || (t.tema === "General" && t.area === "General")) continue;
    const clave = `${t.area}|${t.tema}`;
    const fila = porTema.get(clave) ?? { area: t.area, tema: t.tema, mensajes: 0, dificultad: 0 };
    fila.mensajes += 1;
    if (t.dificultad) fila.dificultad += 1;
    porTema.set(clave, fila);
  }
  const filas = [...porTema.values()].sort((a, b) => b.mensajes - a.mensajes || a.tema.localeCompare(b.tema));
  return {
    temas: filas.map(({ area, tema, mensajes }) => ({ area, tema, mensajes })),
    dificultades: filas.filter((f) => f.dificultad >= 2).map((f) => f.tema),
    mensajes: intenciones.length,
  };
}

/** Puro: texto para la familia. En positivo (Nudito nunca da malas noticias): lo difícil va como «para reforzar». */
export function textoResumen(nombre: string, conversaciones: number, a: Agregado): string {
  const veces = conversaciones === 1 ? "1 conversación" : `${conversaciones} conversaciones`;
  const partes = [`Esta semana ${nombre} practicó con Nudito+ en ${veces} (${a.mensajes} ${a.mensajes === 1 ? "mensaje" : "mensajes"}).`];
  if (a.temas.length > 0) {
    partes.push(`Temas: ${a.temas.slice(0, 5).map((t) => `${t.tema} (${t.area})`).join(", ")}.`);
  }
  if (a.dificultades.length > 0) partes.push(`Para reforzar en casa: ${a.dificultades.join(", ")}.`);
  partes.push("Pregúntale qué aprendió: le encantará contártelo.");
  return partes.join(" ");
}

export type Semana = { desde: string; hasta: string };

/** Últimos 7 días completos (hora de Lima) hasta ayer. */
export function semanaAnterior(ahora: Date = new Date()): Semana {
  const hasta = sumarDias(fechaLima(ahora), -1);
  return { desde: sumarDias(hasta, -6), hasta };
}

/**
 * Genera (una sola vez por semana) el resumen de un alumno. null si no conversó esa semana o si ya existía.
 * Usa el cliente global con `tenantId` explícito (cron sin sesión).
 */
export async function generarResumenAlumno(tenantId: string, alumnoId: string, semana: Semana): Promise<{ id: string } | null> {
  const desde = fechaDb(semana.desde);
  const hasta = fechaDb(semana.hasta);
  const ya = await db.resumenNudito.findFirst({ where: { tenantId, alumnoId, desde, hasta }, select: { id: true } });
  if (ya) return null;

  const rango = { gte: inicioDiaLima(semana.desde), lt: inicioDiaLima(sumarDias(semana.hasta, 1)) };
  const mensajes = await db.nuditoMensaje.findMany({
    where: { tenantId, autor: "usuario", bloqueado: false, createdAt: rango, conversacion: { alumnoId } },
    select: { intencion: true, conversacionId: true },
  });
  if (mensajes.length === 0) return null;
  const alumno = await db.alumno.findFirst({ where: { id: alumnoId, tenantId }, select: { nombres: true } });
  if (!alumno) return null;
  const nombre = alumno.nombres.split(" ")[0] ?? alumno.nombres;

  const agregado = agregarTemas(mensajes.map((m) => (m.intencion?.startsWith("filtro:") ? null : m.intencion)));
  const conversaciones = new Set(mensajes.map((m) => m.conversacionId)).size;
  const resumen = await db.resumenNudito.create({
    data: { tenantId, alumnoId, desde, hasta, texto: textoResumen(nombre, conversaciones, agregado), temas: agregado.temas as unknown as Prisma.InputJsonValue },
    select: { id: true },
  });
  if (agregado.dificultades.length > 0) {
    await db.alertaNudito.create({
      data: { tenantId, alumnoId, tipo: "dificultad", detalle: `${nombre} pidió más ayuda con: ${agregado.dificultades.join(", ")}. Un repaso juntos en casa le vendría bien.` },
    });
  }
  return resumen;
}

/** Para el cron semanal: resúmenes de todos los alumnos que conversaron la semana pasada en colegios Pro. */
export async function generarResumenesSemanales(ahora: Date = new Date()): Promise<{ semana: Semana; alumnos: number; creados: number }> {
  const semana = semanaAnterior(ahora);
  const rango = { gte: inicioDiaLima(semana.desde), lt: inicioDiaLima(sumarDias(semana.hasta, 1)) };
  const conversaciones = await db.nuditoConversacion.findMany({
    where: { alumnoId: { not: null }, tenant: { plan: "pro" }, mensajes: { some: { autor: "usuario", createdAt: rango } } },
    distinct: ["alumnoId"],
    select: { tenantId: true, alumnoId: true },
  });
  let creados = 0;
  for (const c of conversaciones) {
    try {
      if (await generarResumenAlumno(c.tenantId, c.alumnoId!, semana)) creados += 1;
    } catch (error) {
      console.error("[nudito-plus] no se pudo generar un resumen", error);
    }
  }
  return { semana, alumnos: conversaciones.length, creados };
}

// ───────────── Resumen semanal de la práctica con el tutor (specs/44) ─────────────

/** Puro: texto en positivo a partir de la práctica de la semana (sesiones, temas, dominios logrados y a reforzar). */
export function textoResumenPractica(nombre: string, sesiones: number, temas: string[], dominados: string[], reforzar: string[]): string {
  const veces = sesiones === 1 ? "1 sesión" : `${sesiones} sesiones`;
  const partes = [`Esta semana ${nombre} practicó con Nudito en ${veces}.`];
  if (temas.length > 0) partes.push(`Temas: ${temas.slice(0, 5).join(", ")}.`);
  if (dominados.length > 0) partes.push(`¡Logró dominar: ${dominados.slice(0, 5).join(", ")}!`);
  if (reforzar.length > 0) partes.push(`Para seguir practicando: ${reforzar.slice(0, 5).join(", ")}.`);
  partes.push("Es práctica formativa, no es nota. Pregúntale qué aprendió: le encantará contártelo.");
  return partes.join(" ");
}

/**
 * Resumen semanal de la práctica de un alumno armado con sesiones y eventos de dominio (nunca con texto de conversaciones).
 * null si no practicó esa semana o si ya había resumen de esa semana.
 */
export async function generarResumenPractica(tenantId: string, alumnoId: string, semana: Semana, nombreTema: (clave: string) => string = (c) => c): Promise<{ id: string } | null> {
  const desde = fechaDb(semana.desde);
  const hasta = fechaDb(semana.hasta);
  if (await db.resumenNudito.findFirst({ where: { tenantId, alumnoId, desde, hasta }, select: { id: true } })) return null;
  const rango = { gte: inicioDiaLima(semana.desde), lt: inicioDiaLima(sumarDias(semana.hasta, 1)) };
  const [sesiones, eventos, alumno] = await Promise.all([
    db.nuditoSesion.findMany({ where: { tenantId, alumnoId, iniciadaAt: rango }, select: { temaClave: true, area: true } }),
    db.nuditoDominioEvento.findMany({ where: { tenantId, alumnoId, tipo: "estado", createdAt: rango, aEstado: { in: ["dominado", "reforzar"] } }, select: { temaClave: true, aEstado: true } }),
    db.alumno.findFirst({ where: { id: alumnoId, tenantId }, select: { nombres: true } }),
  ]);
  if (sesiones.length === 0 || !alumno) return null;
  const conteo = new Map<string, TemaResumen>();
  for (const s of sesiones) {
    if (!s.temaClave) continue;
    const fila = conteo.get(s.temaClave) ?? { area: s.area ?? "", tema: nombreTema(s.temaClave), mensajes: 0 };
    fila.mensajes += 1;
    conteo.set(s.temaClave, fila);
  }
  const temas = [...conteo.values()].sort((a, b) => b.mensajes - a.mensajes);
  const unicos = (estado: string) => [...new Set(eventos.filter((e) => e.aEstado === estado).map((e) => nombreTema(e.temaClave)))];
  const nombre = alumno.nombres.split(" ")[0] ?? alumno.nombres;
  return db.resumenNudito.create({
    data: {
      tenantId, alumnoId, desde, hasta,
      texto: textoResumenPractica(nombre, sesiones.length, temas.map((t) => t.tema), unicos("dominado"), unicos("reforzar")),
      temas: temas as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}

/** Cron semanal: resúmenes de práctica de los alumnos con sesiones la semana pasada (colegios Pro). */
export async function generarResumenesPractica(ahora: Date = new Date(), nombreTema?: (clave: string) => string): Promise<{ alumnos: number; creados: number }> {
  const semana = semanaAnterior(ahora);
  const rango = { gte: inicioDiaLima(semana.desde), lt: inicioDiaLima(sumarDias(semana.hasta, 1)) };
  const filas = await db.nuditoSesion.findMany({ where: { iniciadaAt: rango, tenant: { plan: "pro" } }, distinct: ["alumnoId"], select: { tenantId: true, alumnoId: true } });
  let creados = 0;
  for (const f of filas) {
    try {
      if (await generarResumenPractica(f.tenantId, f.alumnoId, semana, nombreTema)) creados += 1;
    } catch (error) {
      console.error("[nudito] no se pudo generar un resumen de práctica", error);
    }
  }
  return { alumnos: filas.length, creados };
}

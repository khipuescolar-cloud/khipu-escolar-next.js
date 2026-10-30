import "server-only";
import type { ModoNudito } from "@/generated/prisma/enums";
import { auditar } from "../auditoria";
import { ErrorDeNegocio } from "../contexto-accion";
import type { TenantContext } from "../tenant";
import type { AlumnoNuditoPlus } from "./acceso";
import { construirContexto } from "./contexto";
import { armarSistema } from "./prompt";
import { limitesNudito } from "./licencias";
import { configProveedor, obtenerProveedor, type MensajeIA, type ProveedorIA } from "./proveedor";
import {
  analizarEntrada,
  analizarSalida,
  detalleAlertaAnimo,
  detalleAlertaSeguridad,
  RESPUESTA_ANIMO,
  RESPUESTA_DATOS_AJENOS,
  RESPUESTA_INAPROPIADO,
  RESPUESTA_SEGURIDAD,
} from "./seguridad";
import { codificarTema, detectarTema, tieneDificultad } from "./temas";
import { MENSAJE_TOPE, registrarUso, verificarTope } from "./uso";

// Conversación con Nudito+ (specs/29). Solo el alumno conversa (cuenta propia o modo hijo); nadie más lee los mensajes.

export const MAX_CARACTERES_NUDITO = 800;
export const LIMITE_POR_MINUTO_NUDITO = 20;
const HISTORIAL = 12;

export const MENSAJE_PROVEEDOR_CAIDO = "Nudito está descansando un momento. Inténtalo de nuevo en unos minutos.";
export const MENSAJE_MUY_RAPIDO = "Estás escribiendo muy rápido. Espera un momento e inténtalo de nuevo.";

export type ResultadoConversar = {
  conversacionId: string;
  texto: string;
  bloqueado: boolean;
  topeAlcanzado: boolean;
};

type Acceso = { alumno: AlumnoNuditoPlus; modo: ModoNudito };

/** La conversación es de esta membresía, de este alumno y en este modo; si no, null. */
export async function conversacionPropia(ctx: TenantContext, acceso: Acceso, conversacionId: string) {
  return ctx.db.nuditoConversacion.findFirst({
    where: { id: conversacionId, membershipId: ctx.membership.id, alumnoId: acceso.alumno.id, modo: acceso.modo },
    select: { id: true, createdAt: true },
  });
}

/** Conversaciones del alumno en este modo y con esta cuenta (la más reciente primero), con un título corto. */
export async function listarConversacionesNudito(ctx: TenantContext, acceso: Acceso, limite = 20) {
  const filas = await ctx.db.nuditoConversacion.findMany({
    where: { membershipId: ctx.membership.id, alumnoId: acceso.alumno.id, modo: acceso.modo },
    orderBy: { createdAt: "desc" },
    take: limite,
    select: {
      id: true,
      createdAt: true,
      mensajes: { where: { autor: "usuario", bloqueado: false }, orderBy: { createdAt: "asc" }, take: 1, select: { cuerpo: true } },
    },
  });
  return filas.map((c) => ({
    id: c.id,
    createdAt: c.createdAt,
    titulo: tituloCorto(c.mensajes[0]?.cuerpo ?? "Conversación nueva"),
  }));
}

function tituloCorto(texto: string): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  return limpio.length > 48 ? `${limpio.slice(0, 47)}…` : limpio;
}

export type MensajeVista = { id: string; autor: "usuario" | "nudito"; texto: string };

/** Mensajes de una conversación propia (para reabrirla). Los bloqueados del alumno se muestran tal cual a él. */
export async function mensajesDeConversacion(ctx: TenantContext, acceso: Acceso, conversacionId: string): Promise<MensajeVista[] | null> {
  if (!(await conversacionPropia(ctx, acceso, conversacionId))) return null;
  const filas = await ctx.db.nuditoMensaje.findMany({
    where: { conversacionId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, autor: true, cuerpo: true },
  });
  return filas.map((m) => ({ id: m.id, autor: m.autor, texto: m.cuerpo }));
}

async function crearAlerta(ctx: TenantContext, alumnoId: string, tipo: "seguridad" | "animo", detalle: string, conversacionId: string) {
  // Ánimo: una alerta por conversación basta (no saturar a la familia).
  if (tipo === "animo") {
    const ya = await ctx.db.alertaNudito.findFirst({ where: { alumnoId, tipo, conversacionId }, select: { id: true } });
    if (ya) return;
  }
  await ctx.db.alertaNudito.create({ data: { tenantId: ctx.tenant.id, alumnoId, tipo, detalle, conversacionId } });
}

/**
 * Un turno de conversación: límite por minuto → tope del mes → filtro de entrada → proveedor → filtro de salida
 * → guarda ambos mensajes y suma el uso. Si el proveedor falla: mensaje amable, no se guarda nada ni se cobra uso.
 */
export async function conversar(
  ctx: TenantContext,
  acceso: Acceso,
  entrada: { conversacionId: string | null; texto: string },
  opciones: { proveedor?: ProveedorIA; ahora?: Date } = {},
): Promise<ResultadoConversar> {
  const ahora = opciones.ahora ?? new Date();
  const texto = entrada.texto.trim();
  if (!texto) throw new ErrorDeNegocio("Escribe tu pregunta.");
  if (texto.length > MAX_CARACTERES_NUDITO) throw new ErrorDeNegocio(`Máximo ${MAX_CARACTERES_NUDITO} caracteres.`);
  const { alumno } = acceso;
  const nombre = alumno.nombres.split(" ")[0] ?? alumno.nombres;

  // Límite simple por membresía (en BD: vale entre instancias).
  const recientes = await ctx.db.nuditoMensaje.count({
    where: { autor: "usuario", createdAt: { gte: new Date(ahora.getTime() - 60_000) }, conversacion: { membershipId: ctx.membership.id } },
  });
  if (recientes >= LIMITE_POR_MINUTO_NUDITO) throw new ErrorDeNegocio(MENSAJE_MUY_RAPIDO);

  let conversacionId = entrada.conversacionId;
  if (conversacionId && !(await conversacionPropia(ctx, acceso, conversacionId))) throw new ErrorDeNegocio("No encontré esa conversación.");

  const tope = await verificarTope(ctx.db, ctx.tenant.id, alumno, await limitesNudito(), ahora);
  if (tope.alcanzado) return { conversacionId: conversacionId ?? "", texto: MENSAJE_TOPE, bloqueado: false, topeAlcanzado: true };

  const contexto = await construirContexto(ctx.db, alumno.id, { ahora });
  const cursos = contexto.datos.cursos.map((c) => c.nombre);
  const analisis = analizarEntrada(texto, { cursos });

  async function asegurarConversacion(): Promise<string> {
    if (conversacionId) return conversacionId;
    const nueva = await ctx.db.nuditoConversacion.create({
      data: { tenantId: ctx.tenant.id, membershipId: ctx.membership.id, alumnoId: alumno.id, modo: acceso.modo },
    });
    await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "crear", entidad: "nudito_conversacion", entidadId: nueva.id, detalle: { modo: acceso.modo, alumnoId: alumno.id } });
    conversacionId = nueva.id;
    return nueva.id;
  }

  const tema = detectarTema(texto, cursos);
  const intencion = codificarTema(tema, tieneDificultad(texto));

  // Respuestas fijas: no pasan por el proveedor ni cuentan uso.
  const fija: Record<string, { respuesta: string; bloqueado: boolean } | undefined> = {
    seguridad: { respuesta: RESPUESTA_SEGURIDAD, bloqueado: true },
    inapropiado: { respuesta: RESPUESTA_INAPROPIADO, bloqueado: true },
    datos_ajenos: { respuesta: RESPUESTA_DATOS_AJENOS, bloqueado: true },
    animo: { respuesta: RESPUESTA_ANIMO, bloqueado: false },
  };
  const respuestaFija = fija[analisis.tipo];
  if (respuestaFija) {
    const id = await asegurarConversacion();
    await ctx.db.nuditoMensaje.create({
      data: { tenantId: ctx.tenant.id, conversacionId: id, autor: "usuario", cuerpo: texto, bloqueado: respuestaFija.bloqueado, intencion: `filtro:${analisis.tipo}` },
    });
    await ctx.db.nuditoMensaje.create({ data: { tenantId: ctx.tenant.id, conversacionId: id, autor: "nudito", cuerpo: respuestaFija.respuesta, derivado: analisis.tipo === "seguridad" || analisis.tipo === "animo" } });
    if (analisis.tipo === "seguridad") await crearAlerta(ctx, alumno.id, "seguridad", detalleAlertaSeguridad(analisis.categoria, nombre), id);
    if (analisis.tipo === "animo") await crearAlerta(ctx, alumno.id, "animo", detalleAlertaAnimo(nombre), id);
    return { conversacionId: id, texto: respuestaFija.respuesta, bloqueado: respuestaFija.bloqueado, topeAlcanzado: false };
  }

  // Historial reciente de esta conversación (sin los mensajes bloqueados).
  const previos = conversacionId
    ? await ctx.db.nuditoMensaje.findMany({
        where: { conversacionId, bloqueado: false },
        orderBy: { createdAt: "desc" },
        take: HISTORIAL,
        select: { autor: true, cuerpo: true },
      })
    : [];
  const mensajes: MensajeIA[] = [
    ...previos.reverse().map((m): MensajeIA => ({ rol: m.autor === "usuario" ? "usuario" : "asistente", texto: m.cuerpo })),
    { rol: "usuario", texto },
  ];
  const sistema = analisis.tipo === "trampa" ? armarSistema(contexto.datos, { guiarSinResolver: true }) : contexto.sistema;

  const config = await configProveedor();
  const proveedor = opciones.proveedor ?? (await obtenerProveedor(config));
  let respuesta;
  try {
    respuesta = await proveedor.responder({ sistema, mensajes });
  } catch (error) {
    console.error("[nudito-plus] el proveedor falló", error);
    throw new ErrorDeNegocio(MENSAJE_PROVEEDOR_CAIDO);
  }

  const salida = analizarSalida(respuesta.texto, contexto.datos.sitios.map((s) => s.dominio));
  const id = await asegurarConversacion();
  await ctx.db.nuditoMensaje.create({ data: { tenantId: ctx.tenant.id, conversacionId: id, autor: "usuario", cuerpo: texto, intencion } });
  await ctx.db.nuditoMensaje.create({
    data: {
      tenantId: ctx.tenant.id,
      conversacionId: id,
      autor: "nudito",
      cuerpo: salida.texto,
      bloqueado: salida.bloqueado,
      tokensEntrada: respuesta.tokensEntrada,
      tokensSalida: respuesta.tokensSalida,
    },
  });
  await registrarUso(ctx.db, ctx.tenant.id, alumno.id, respuesta, config, ahora);
  return { conversacionId: id, texto: salida.texto, bloqueado: salida.bloqueado, topeAlcanzado: false };
}

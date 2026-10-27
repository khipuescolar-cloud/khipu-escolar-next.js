import "server-only";
import type { TenantContext } from "@/lib/server/tenant";
import { alumnoIdsVisibles } from "@/lib/server/tenant";
import { decidir, nombreCorto } from "./intenciones";
import { normalizar } from "./normalizar";
import {
  ayuda, conDisclaimer, derivarAPersona, derivarATutora, derivarDesconocido, noCompara, preguntarHijo,
  respuestaAsistencia, respuestaDocumento, respuestaFechas, respuestaNotas, respuestaTareas, saludar, type NotaDato,
} from "./respuestas";
import { esAgradecimiento } from "./intenciones";
import type { Hijo, MensajeHistorial, NuditoProvider, RespuestaNudito } from "./tipos";

function hoyEnLima(): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** Motor por intenciones, sin LLM: responde solo con datos reales de los hijos del apoderado en este colegio. */
export class IntentNudito implements NuditoProvider {
  async responder(ctx: TenantContext, entrada: string, historial: MensajeHistorial[]): Promise<RespuestaNudito> {
    const ids = await alumnoIdsVisibles(ctx);
    const hijos: Hijo[] =
      ids.length === 0
        ? []
        : await ctx.db.alumno.findMany({
            where: { id: { in: ids } },
            select: { id: true, nombres: true, salonId: true },
            orderBy: { nombres: "asc" },
          });
    const respuesta = await this.resolver(ctx, entrada, historial, hijos);
    const esPrimera = !historial.some((m) => m.autor === "nudito");
    return conDisclaimer(respuesta, esPrimera);
  }

  private async resolver(ctx: TenantContext, entrada: string, historial: MensajeHistorial[], hijos: Hijo[]): Promise<RespuestaNudito> {
    const corto = hijos.map((h) => ({ id: h.id, nombre: nombreCorto(h) }));
    const d = decidir(entrada, hijos, historial);

    if (d.tipo === "comparar") return noCompara(hijos.length === 1 ? nombreCorto(hijos[0]) : null);
    if (d.tipo === "delicado") return derivarATutora(d.intencion, corto);
    if (d.tipo === "preguntar_hijo") return preguntarHijo(d.intencion, corto);

    const { intencion, hijo } = d;
    const nombre = hijo ? nombreCorto(hijo) : "";
    const ahora = new Date();

    switch (intencion) {
      case "saludo":
        return saludar(ctx.user.nombres.split(" ")[0], esAgradecimiento(entrada));
      case "ayuda":
        return ayuda();
      case "hablar_con_persona":
        return derivarAPersona(hijo ? [{ id: hijo.id, nombre }] : corto);
      case "tareas_pendientes": {
        const tareas = await ctx.db.tarea.findMany({
          where: { curso: { salonId: hijo!.salonId }, fechaEntrega: { gte: ahora } },
          orderBy: { fechaEntrega: "asc" },
          take: 5,
          select: { titulo: true, fechaEntrega: true, curso: { select: { nombre: true } } },
        });
        return respuestaTareas(nombre, tareas.map((t) => ({ titulo: t.titulo, fechaEntrega: t.fechaEntrega, curso: t.curso.nombre })), hijo!.id);
      }
      case "proximas_fechas": {
        const eventos = await ctx.db.eventoAgenda.findMany({
          where: { inicio: { gte: ahora }, OR: [{ salonId: null }, { salonId: hijo!.salonId }] },
          orderBy: { inicio: "asc" },
          take: 5,
          select: { titulo: true, tipo: true, inicio: true },
        });
        return respuestaFechas(nombre, eventos, hijo!.id);
      }
      case "asistencia_hoy": {
        const filas = await ctx.db.asistencia.findMany({
          where: { alumnoId: hijo!.id, fecha: hoyEnLima() },
          select: { estado: true, hora: true, ambito: true },
        });
        // Preferimos la asistencia del día (portería); si no, cualquiera del día.
        const fila = filas.find((f) => f.ambito === "dia") ?? filas[0];
        // Si hay varios registros y alguno no es «llegó», se deriva: nunca damos malas noticias.
        const algunaMala = filas.some((f) => f.estado !== "llego");
        return respuestaAsistencia(nombre, fila ? { estado: algunaMala ? "tarde" : fila.estado, hora: fila.hora } : null, corto, hijo!.id);
      }
      case "notas": {
        const [periodo, parciales] = await Promise.all([
          ctx.db.calificacionPeriodo.findMany({ where: { alumnoId: hijo!.id }, select: { valorLiteral: true, valorNumerico: true }, take: 50 }),
          ctx.db.nota.findMany({ where: { alumnoId: hijo!.id }, select: { valorLiteral: true, valorNumerico: true }, take: 50 }),
        ]);
        const notas: NotaDato[] = [...periodo, ...parciales].map((n) => ({
          literal: n.valorLiteral,
          numerico: n.valorNumerico === null ? null : Number(n.valorNumerico),
        }));
        return respuestaNotas(nombre, notas, corto, hijo!.id);
      }
      case "horario":
      case "reglamento": {
        const docs = await ctx.db.documentoColegio.findMany({ where: { tipo: intencion }, orderBy: { titulo: "asc" }, select: { titulo: true, contenido: true } });
        return respuestaDocumento(intencion, docs, normalizar(entrada));
      }
      default:
        return derivarDesconocido(corto);
    }
  }
}

export const nuditoProvider: NuditoProvider = new IntentNudito();

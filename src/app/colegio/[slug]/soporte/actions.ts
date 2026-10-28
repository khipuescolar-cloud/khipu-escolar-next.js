"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { texto } from "@/lib/server/accion-formulario";
import { adjuntosDeFormData } from "@/lib/server/adjuntos";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import {
  cerrarColegio, crearTicket, exigirSoporte, marcarResueltoColegio, obtenerTicketColegio, reabrirColegio, responderColegio, ROLES_SOPORTE,
  valorarTicket, type TicketVista,
} from "@/lib/server/soporte";
import { fallo, ok, type Resultado } from "@/lib/resultado";

// Mesa de ayuda del colegio (specs/23). Cada acción valida rol, módulo y que no sea modo soporte (`exigirSoporte`).

async function contexto() {
  const ctx = await contextoDeAccion([...ROLES_SOPORTE]);
  exigirSoporte(ctx);
  return ctx;
}

/** Envía ahora los avisos encolados al equipo Khipu (sin esperar al cron). */
function procesarDespues(tenantId: string) {
  after(async () => {
    try {
      await procesarCola({ tenantId });
    } catch (error) {
      console.error("[avisos] error al procesar la cola", error);
    }
  });
}

async function intentar(fn: () => Promise<string | void>): Promise<Resultado> {
  try {
    const mensaje = await fn();
    revalidatePath("/colegio/[slug]/soporte", "layout");
    return ok(mensaje || undefined);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}

export async function crearTicketAction(_previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const ctx = await contexto();
  let id = "";
  const r = await intentar(async () => {
    const creado = await crearTicket(
      ctx,
      { asunto: texto(datos, "asunto"), categoria: texto(datos, "categoria") as "duda", prioridad: texto(datos, "prioridad") as "normal", cuerpo: texto(datos, "cuerpo") },
      await adjuntosDeFormData(datos, "adjunto"),
    );
    id = creado.id;
    if (creado.avisos > 0) procesarDespues(ctx.tenant.id);
  });
  if (!r.ok) return r;
  redirect(`/soporte/${id}?ok=${encodeURIComponent("Enviamos tu consulta al equipo de Khipu.")}`);
}

/** Sondeo del hilo (cada ~5 s): sin notas internas; marca como leído. */
export async function refrescarTicketAction(id: string): Promise<TicketVista> {
  const ctx = await contexto();
  return obtenerTicketColegio(ctx, id);
}

export async function responderTicketAction(datos: FormData): Promise<Resultado> {
  const ctx = await contexto();
  return intentar(async () => {
    const { avisos } = await responderColegio(ctx, texto(datos, "id"), texto(datos, "cuerpo"), await adjuntosDeFormData(datos, "adjunto"));
    if (avisos > 0) procesarDespues(ctx.tenant.id);
  });
}

export async function resolverTicketAction(datos: FormData): Promise<Resultado> {
  const ctx = await contexto();
  return intentar(async () => {
    await marcarResueltoColegio(ctx, texto(datos, "id"));
    return "Marcaste la conversación como resuelta.";
  });
}

export async function reabrirTicketAction(datos: FormData): Promise<Resultado> {
  const ctx = await contexto();
  return intentar(async () => {
    await reabrirColegio(ctx, texto(datos, "id"));
    return "Reabriste la conversación.";
  });
}

export async function cerrarTicketAction(datos: FormData): Promise<Resultado> {
  const ctx = await contexto();
  return intentar(async () => {
    await cerrarColegio(ctx, texto(datos, "id"));
    return "Cerraste la conversación.";
  });
}

export async function valorarTicketAction(_previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const ctx = await contexto();
  return intentar(async () => {
    await valorarTicket(ctx, texto(datos, "id"), { valoracion: Number(texto(datos, "valoracion")), comentario: texto(datos, "comentario") });
    return "Gracias por tu valoración.";
  });
}

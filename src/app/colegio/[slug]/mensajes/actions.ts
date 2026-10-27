"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio, contextoDeAccion } from "@/lib/server/contexto-accion";
import { abrirConversacion, enviarMensaje, obtenerHilo, type HiloVista } from "@/lib/server/mensajes";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireFeature } from "@/lib/server/plan";

export async function abrirConversacionAction(formData: FormData) {
  const ctx = await contextoDeAccion(["apoderado", "profesor"]);
  requireFeature(ctx, "mensajes");
  let id = "";
  await ejecutarYVolver("/mensajes/nuevo", async () => {
    id = await abrirConversacion(ctx, { alumnoId: texto(formData, "alumnoId"), contraparteId: texto(formData, "contraparteId") });
    redirect(`/mensajes/${id}`);
  });
}

/** Polling cada 10 s desde el cliente: devuelve el hilo actualizado (y marca como leídos los mensajes recibidos). */
export async function refrescarHiloAction(id: string): Promise<HiloVista> {
  const ctx = await contextoDeAccion(["apoderado", "profesor", "direccion"]);
  requireFeature(ctx, "mensajes");
  return obtenerHilo(ctx, id);
}

export async function enviarMensajeAction(id: string, cuerpo: string): Promise<{ error?: string }> {
  const ctx = await contextoDeAccion(["apoderado", "profesor"]);
  requireFeature(ctx, "mensajes");
  try {
    const { avisos } = await enviarMensaje(ctx, { conversacionId: id, cuerpo });
    // Aviso al otro lado ahora, sin esperar al cron (mismo worker: respeta el tope diario y la reserva atómica).
    if (avisos > 0) {
      after(async () => {
        try {
          await procesarCola({ tenantId: ctx.tenant.id });
        } catch (error) {
          console.error("[avisos] error al procesar la cola", error);
        }
      });
    }
    return {};
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

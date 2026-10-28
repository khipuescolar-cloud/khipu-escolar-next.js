"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { procesarCola } from "@/lib/server/notificaciones/cola";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { asignarTicket, cambiarEstadoTicket, cambiarPrioridadTicket, hiloKhipu, responderKhipu } from "@/lib/server/plataforma-mesa-ayuda";
import type { TicketVista } from "@/lib/server/soporte";
import { fallo, ok, type Resultado } from "@/lib/resultado";

// Mesa de ayuda del equipo Khipu (specs/23). Cada acción exige super administrador y queda auditada en el servidor.

async function intentar(fn: () => Promise<string | void>): Promise<Resultado> {
  try {
    const mensaje = await fn();
    revalidatePath("/plataforma/mesa-ayuda", "layout");
    return ok(mensaje || undefined);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}

/** Sondeo del hilo (~5 s): incluye notas internas; marca como leído por Khipu. */
export async function refrescarHiloKhipuAction(id: string): Promise<TicketVista> {
  const admin = await requireAdminPlataforma();
  return hiloKhipu(admin, id);
}

export async function responderKhipuAction(datos: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return intentar(async () => {
    const { avisos, tenantId } = await responderKhipu(admin, texto(datos, "id"), texto(datos, "cuerpo"), texto(datos, "interno") === "1");
    if (avisos > 0) {
      after(async () => {
        try {
          await procesarCola({ tenantId });
        } catch (error) {
          console.error("[avisos] error al procesar la cola", error);
        }
      });
    }
  });
}

export async function asignarAction(_previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return intentar(async () => {
    const valor = texto(datos, "asignado");
    await asignarTicket(admin, texto(datos, "id"), valor === "yo" ? admin.user.id : valor || null);
    return "Asignación guardada.";
  });
}

export async function cambiarEstadoAction(_previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return intentar(async () => {
    await cambiarEstadoTicket(admin, texto(datos, "id"), texto(datos, "estado"));
    return "Estado actualizado.";
  });
}

export async function cambiarPrioridadAction(_previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return intentar(async () => {
    await cambiarPrioridadTicket(admin, texto(datos, "id"), texto(datos, "prioridad"));
    return "Prioridad actualizada.";
  });
}

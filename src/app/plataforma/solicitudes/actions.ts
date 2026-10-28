"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { texto } from "@/lib/server/accion-formulario";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { asignarSolicitud, cambiarEstadoSolicitud, eliminarSolicitud, guardarNotasSolicitud } from "@/lib/server/plataforma-solicitudes";
import { fallo, ok, type Resultado } from "@/lib/resultado";

// Solicitudes de demo (specs/25). Cada acción exige super administrador y queda auditada en el servidor.

async function intentar(fn: () => Promise<string | void>): Promise<Resultado> {
  try {
    const mensaje = await fn();
    revalidatePath("/plataforma/solicitudes", "layout");
    return ok(mensaje || undefined);
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return fallo(e.message);
    throw e;
  }
}

export async function cambiarEstadoSolicitudAction(_previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return intentar(async () => {
    await cambiarEstadoSolicitud(admin, texto(datos, "id"), texto(datos, "estado"));
    return "Estado actualizado.";
  });
}

export async function asignarSolicitudAction(_previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return intentar(async () => {
    const valor = texto(datos, "asignado");
    await asignarSolicitud(admin, texto(datos, "id"), valor === "yo" ? admin.user.id : valor || null);
    return "Asignación guardada.";
  });
}

export async function guardarNotasSolicitudAction(_previo: Resultado | null, datos: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  return intentar(async () => {
    await guardarNotasSolicitud(admin, texto(datos, "id"), texto(datos, "notas"));
    return "Notas guardadas.";
  });
}

export async function eliminarSolicitudAction(datos: FormData): Promise<Resultado> {
  const admin = await requireAdminPlataforma();
  const r = await intentar(async () => {
    await eliminarSolicitud(admin, texto(datos, "id"));
  });
  if (r.ok) redirect(`/solicitudes?ok=${encodeURIComponent("Solicitud eliminada.")}`);
  return r;
}

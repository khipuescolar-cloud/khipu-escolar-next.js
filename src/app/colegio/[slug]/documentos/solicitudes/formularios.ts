"use server";
import { ejecutarYVolver, texto } from "@/lib/server/accion-formulario";
import { contextoDeAccion, ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { crearSolicitud, publicarSolicitud, presentarVersion, comenzarRevision, observarVersion, aprobarVersion } from "@/lib/server/solicitudes/index";
import { revalidatePath } from "next/cache";
const volver = "/documentos?seccion=gestion";
const terminar = async (fn: () => Promise<string>) => ejecutarYVolver(volver, async () => { const mensaje = await fn(); revalidatePath("/documentos"); return mensaje; });
export async function crearFormulario(form: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await terminar(async () => { const fecha = texto(form, "fechaLimite"); const r = await crearSolicitud(ctx, { titulo: texto(form, "titulo"), instrucciones: texto(form, "instrucciones"), anioAcademico: Number(texto(form, "anioAcademico")), fechaLimite: fecha ? new Date(`${fecha}T23:59:59-05:00`) : undefined, destinatarios: { membershipIds: form.getAll("destinatario").map(String) } }); await publicarSolicitud(ctx, r.id); return "Solicitud publicada."; });
}
export async function entregarFormulario(form: FormData) {
  const ctx = await contextoDeAccion(["profesor"]);
  await terminar(async () => { const archivo = form.get("archivo"); if (!(archivo instanceof File) || !archivo.size) throw new ErrorDeNegocio("Adjunta un archivo."); await presentarVersion(ctx, texto(form, "destinatarioId"), { archivos: [{ nombre: archivo.name, buffer: Buffer.from(await archivo.arrayBuffer()) }], comentario: texto(form, "comentario") }); return "Versión presentada."; });
}
export async function revisarFormulario(form: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await terminar(async () => { await comenzarRevision(ctx, texto(form, "destinatarioId")); return "Revisión iniciada."; });
}
export async function observarFormulario(form: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await terminar(async () => { await observarVersion(ctx, texto(form, "destinatarioId"), { observaciones: texto(form, "observaciones") }); return "Observaciones registradas."; });
}
export async function aprobarFormulario(form: FormData) {
  const ctx = await contextoDeAccion(["direccion"]);
  await terminar(async () => { await aprobarVersion(ctx, texto(form, "destinatarioId")); return "Versión aprobada."; });
}

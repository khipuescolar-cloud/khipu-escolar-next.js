"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { esquemaLeccion } from "@/lib/nudito/leccion";
import { fallo, ok, type Resultado } from "@/lib/resultado";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { contextoDeAccion } from "@/lib/server/contexto-accion";
import { aprobarLeccion, editarLeccion, enviarARevision, publicarLeccion, retirarLeccion, solicitarCambios } from "@/lib/server/nudito/lecciones";
import { prepararMateriales, procesarLote } from "@/lib/server/nudito/lecciones/preparacion";

const id = z.uuid();
async function ctx() { return contextoDeAccion(["profesor", "direccion"]); }
export async function prepararAction(planId: string) {
  const c = await ctx();
  const trabajo = await prepararMateriales(c, id.parse(planId));
  await procesarLote(c, trabajo.id);
  revalidatePath("/planificacion/" + planId + "/materiales");
}
export async function continuarAction(planId: string, trabajoId: string) {
  const c = await ctx();
  await procesarLote(c, id.parse(trabajoId));
  revalidatePath("/planificacion/" + id.parse(planId) + "/materiales");
}
export async function revisarAction(planId: string, leccionId: string, accion: "enviar" | "cambios" | "aprobar" | "publicar" | "retirar", form: FormData) {
  const c = await ctx();
  const p = id.parse(planId), l = id.parse(leccionId);
  const comentario = String(form.get("comentario") ?? "").slice(0, 1000);
  if (accion === "enviar") await enviarARevision(c,p,l);
  if (accion === "cambios") await solicitarCambios(c,p,l,comentario);
  if (accion === "aprobar") await aprobarLeccion(c,p,l);
  if (accion === "publicar") await publicarLeccion(c,p,l);
  if (accion === "retirar") await retirarLeccion(c,p,l,comentario);
  revalidatePath("/planificacion/" + p + "/materiales");
}
export async function editarAction(planId: string, leccionId: string, _previo: Resultado | null, form: FormData): Promise<Resultado> {
  const c = await ctx();
  const p = id.parse(planId), l = id.parse(leccionId);
  const actual = await c.db.nuditoLeccion.findFirst({ where: { id: l }, select: { contenido: true } });
  if (!actual) return fallo("No se encontró la lección.");
  const anterior = esquemaLeccion.safeParse(actual.contenido);
  if (!anterior.success) return fallo("El contenido actual de la lección es inválido.");
  const texto = (nombre: string) => String(form.get(nombre) ?? "").trim();
  const ejemplos = Array.from({ length: 3 }, (_, i) => ({ enunciado: texto("ejemploEnunciado" + i), desarrollo: texto("ejemploDesarrollo" + i) }))
    .filter(x => x.enunciado || x.desarrollo);
  const ejerciciosMuestra = Array.from({ length: 5 }, (_, i) => ({
    enunciado: texto("muestraEnunciado" + i), respuesta: texto("muestraRespuesta" + i),
    pistas: texto("muestraPistas" + i).split("\n").map(x => x.trim()).filter(Boolean),
  })).filter(x => x.enunciado || x.respuesta || x.pistas.length);
  const entrada = {
    titulo: texto("titulo"), idea: texto("idea"), explicacion: texto("explicacion"),
    ejemplos, errorFrecuente: texto("errorFrecuente") || undefined,
    recursos: anterior.data.recursos, ejerciciosMuestra,
  };
  const validacion = esquemaLeccion.safeParse(entrada);
  if (!validacion.success) {
    const campo = validacion.error.issues[0]?.path.join(".") ?? "contenido";
    return fallo("Revisa " + campo + ": completa el dato y respeta su longitud máxima.");
  }
  try {
    await editarLeccion(c, p, l, validacion.data);
    revalidatePath("/planificacion/" + p + "/materiales");
    return ok("Lección guardada.");
  } catch (error) {
    if (error instanceof ErrorDeNegocio) return fallo(error.message);
    throw error;
  }
}

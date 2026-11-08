"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
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
export async function editarAction(planId: string, leccionId: string, form: FormData) {
  const c = await ctx();
  const contenido = JSON.parse(String(form.get("contenido") ?? "{}"));
  await editarLeccion(c, id.parse(planId), id.parse(leccionId), contenido);
  revalidatePath("/planificacion/" + planId + "/materiales");
}

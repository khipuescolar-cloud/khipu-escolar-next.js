"use server";

import { z } from "zod";
import { esquemaEnvioRespuesta, type SalidaApi } from "@/lib/nudito/contratos";
import { contextoDeAccion, ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireAccesoTutor } from "@/lib/server/nudito/acceso-tutor";
import { subirFoto } from "@/lib/server/nudito/fotos";
import * as sesiones from "@/lib/server/nudito/sesiones";
import { MAX_ENTRADA_NUDITO } from "@/lib/server/nudito/seguridad";
import { requireFeature } from "@/lib/server/plan";

// Server actions del tutor Nudito (specs/41). El colegio sale del host; el alumno, de la cuenta (o del hijo elegido por el
// apoderado, validado con `alumnoIdsVisibles`). El grado y el nivel salen SIEMPRE del salón, nunca del cliente.

export type ResultadoNudito<T> = { ok: true; datos: T } | { ok: false; error: string };

const alumnoId = z.uuid().nullable().optional();
const uuid = z.uuid();

async function ejecutar<T>(alumno: string | null | undefined, fn: (ctx: Awaited<ReturnType<typeof contextoDeAccion>>, acceso: Awaited<ReturnType<typeof requireAccesoTutor>>) => Promise<T>): Promise<ResultadoNudito<T>> {
  const ctx = await contextoDeAccion(["alumno", "apoderado"]);
  requireFeature(ctx, "nudito_plus");
  const acceso = await requireAccesoTutor(ctx, alumno);
  try {
    return { ok: true, datos: await fn(ctx, acceso) };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { ok: false, error: e.message };
    throw e;
  }
}

function invalido(error: z.ZodError): { ok: false; error: string } {
  return { ok: false, error: error.issues[0]?.message ?? "Datos no válidos." };
}

export async function iniciarSesionAction(e: { alumnoId?: string | null }): Promise<ResultadoNudito<SalidaApi<"iniciarSesion">>> {
  const p = z.object({ alumnoId }).safeParse(e);
  if (!p.success) return invalido(p.error);
  return ejecutar(p.data.alumnoId, (ctx, a) => sesiones.iniciarSesion(ctx, a.acceso, { alumnoId: a.acceso.alumno.id }));
}

export async function elegirCursoAction(e: { alumnoId?: string | null; sesionId: string; cursoId: string }): Promise<ResultadoNudito<SalidaApi<"elegirCurso">>> {
  const p = z.object({ alumnoId, sesionId: uuid, cursoId: uuid }).safeParse(e);
  if (!p.success) return invalido(p.error);
  return ejecutar(p.data.alumnoId, (ctx, a) => sesiones.elegirCurso(ctx, a.acceso, p.data));
}

export async function elegirTemaAction(e: { alumnoId?: string | null; sesionId: string; temaClave?: string; textoLibre?: string }): Promise<ResultadoNudito<SalidaApi<"elegirTema">>> {
  const p = z
    .object({ alumnoId, sesionId: uuid, temaClave: z.string().max(80).optional(), textoLibre: z.string().trim().min(2, "Escribe el tema.").max(MAX_ENTRADA_NUDITO).optional() })
    .refine((x) => Boolean(x.temaClave) !== Boolean(x.textoLibre), "Elige un tema.")
    .safeParse(e);
  if (!p.success) return invalido(p.error);
  const { sesionId, temaClave, textoLibre } = p.data;
  return ejecutar(p.data.alumnoId, (ctx, a) => sesiones.elegirTema(ctx, a.acceso, temaClave ? { sesionId, temaClave } : { sesionId, textoLibre: textoLibre ?? "" }));
}

export async function pedirRepasoAction(e: { alumnoId?: string | null; sesionId: string; otraVez?: boolean }): Promise<ResultadoNudito<SalidaApi<"pedirRepaso">>> {
  const p = z.object({ alumnoId, sesionId: uuid, otraVez: z.boolean().optional() }).safeParse(e);
  if (!p.success) return invalido(p.error);
  return ejecutar(p.data.alumnoId, (ctx, a) => sesiones.pedirRepaso(ctx, a.acceso, { sesionId: p.data.sesionId }, { otraVez: p.data.otraVez }));
}

export async function siguienteEjercicioAction(e: { alumnoId?: string | null; sesionId: string }): Promise<ResultadoNudito<SalidaApi<"siguienteEjercicio">>> {
  const p = z.object({ alumnoId, sesionId: uuid }).safeParse(e);
  if (!p.success) return invalido(p.error);
  return ejecutar(p.data.alumnoId, (ctx, a) => sesiones.siguienteEjercicio(ctx, a.acceso, { sesionId: p.data.sesionId }));
}

export async function responderAction(e: { alumnoId?: string | null; ejercicioId: string } & z.input<typeof esquemaEnvioRespuesta>): Promise<ResultadoNudito<SalidaApi<"responder">>> {
  const p = esquemaEnvioRespuesta.extend({ alumnoId, ejercicioId: uuid }).safeParse(e);
  if (!p.success) return invalido(p.error);
  const { alumnoId: id, ...entrada } = p.data;
  return ejecutar(id, (ctx, a) => sesiones.responder(ctx, a.acceso, entrada));
}

export async function pedirPistaAction(e: { alumnoId?: string | null; ejercicioId: string }): Promise<ResultadoNudito<SalidaApi<"pedirPista">>> {
  const p = z.object({ alumnoId, ejercicioId: uuid }).safeParse(e);
  if (!p.success) return invalido(p.error);
  return ejecutar(p.data.alumnoId, (ctx, a) => sesiones.pedirPista(ctx, a.acceso, { ejercicioId: p.data.ejercicioId }));
}

export async function preguntarAction(e: { alumnoId?: string | null; sesionId: string; texto: string }): Promise<ResultadoNudito<SalidaApi<"preguntar">>> {
  const p = z.object({ alumnoId, sesionId: uuid, texto: z.string().trim().min(1, "Escribe tu pregunta.").max(MAX_ENTRADA_NUDITO, `Máximo ${MAX_ENTRADA_NUDITO} caracteres.`) }).safeParse(e);
  if (!p.success) return invalido(p.error);
  return ejecutar(p.data.alumnoId, (ctx, a) => sesiones.preguntar(ctx, a.acceso, { sesionId: p.data.sesionId, texto: p.data.texto }));
}

export async function finalizarAction(e: { alumnoId?: string | null; sesionId: string }): Promise<ResultadoNudito<SalidaApi<"finalizar">>> {
  const p = z.object({ alumnoId, sesionId: uuid }).safeParse(e);
  if (!p.success) return invalido(p.error);
  return ejecutar(p.data.alumnoId, (ctx, a) => sesiones.finalizar(ctx, a.acceso, { sesionId: p.data.sesionId }));
}

/**
 * Foto del cuaderno (specs/44, `fotos.ts` de D): solo si el colegio activó `permitirFotos`. Devuelve la transcripción
 * para que el alumno la revise antes de enviar; si no se pudo leer (hoy siempre, con el proveedor simulado), el mensaje
 * amable pide escribir la respuesta. Una foto ilegible nunca marca la respuesta como incorrecta.
 */
export async function subirFotoAction(formData: FormData): Promise<ResultadoNudito<{ archivoId: string; transcripcion: string }>> {
  const archivo = formData.get("foto");
  const p = z
    .object({ alumnoId, sesionId: uuid, ejercicioId: uuid.optional() })
    .safeParse({ alumnoId: formData.get("alumnoId") || null, sesionId: formData.get("sesionId"), ejercicioId: formData.get("ejercicioId") || undefined });
  if (!p.success) return invalido(p.error);
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, error: "Elige una foto." };
  const buffer = new Uint8Array(await archivo.arrayBuffer());
  return ejecutar(p.data.alumnoId, async (ctx, a) => {
    const r = await subirFoto(ctx, a.acceso, { sesionId: p.data.sesionId, ...(p.data.ejercicioId ? { ejercicioId: p.data.ejercicioId } : {}), archivo: { nombre: archivo.name, buffer } });
    return { archivoId: r.archivoId, transcripcion: r.lectura.transcripcion };
  });
}

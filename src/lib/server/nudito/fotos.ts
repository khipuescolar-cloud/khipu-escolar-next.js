import "server-only";
import { forbidden, notFound } from "next/navigation";
import { z } from "zod";
import { esquemaLecturaImagen, type AccesoNudito, type EntradaApi, type LecturaImagen, type ProveedorTutorIA, type SalidaApi } from "@/lib/nudito/contratos";
import { ErrorDeNegocio } from "../contexto-accion";
import { borrarArchivoDelProveedor, storage, urlArchivo } from "../storage";
import { detectarMime, MAX_BYTES_ARCHIVO } from "../storage/validacion";
import type { TenantContext } from "../tenant";
import { configNudito } from "./config-colegio";
import { obtenerProveedorTutor, registrarConsumo } from "./ia/proveedor";

// Responsable: D (specs/44). Foto de un ejercicio o procedimiento: solo si el colegio la permite; Archivo PRIVADO con
// `nuditoSesionId`, tipo real por firma (detectarMime: JPG/PNG/WEBP), máx. 5 MB, URL temporal de 5 min (storage/index.ts).
// La interpretación pasa por `ProveedorTutorIA.interpretarImagen` (HOY SIMULADA); si `contieneRostro` o no es legible,
// la foto se descarta (proveedor y fila) y se pide escribir la respuesta: una lectura incierta NUNCA marca incorrecto.
//
// PUNTO DE INTEGRACIÓN (Dev C, UI /nudito): la action llama `requireNuditoPlus(ctx, alumnoId)` y luego
// `subirFoto(ctx, acceso, { sesionId, ejercicioId?, archivo: { nombre, buffer } })`. Si va bien, devuelve
// `{ archivoId, lectura }` y la UI manda `fotoArchivoId` en `responder` (esquemaEnvioRespuesta). Si lanza
// `ErrorDeNegocio`, se muestra su mensaje tal cual (amable: «escríbelo o toma otra foto»). Para ver la foto: `urlFotoNudito`.

const MIMES_FOTO = new Set(["image/jpeg", "image/png", "image/webp"]);

export const MENSAJE_FOTOS_APAGADAS = "Tu colegio no tiene activadas las fotos en Nudito. Escribe tu respuesta.";
export const MENSAJE_FOTO_TIPO = "Solo se aceptan fotos JPG, PNG o WEBP.";
export const MENSAJE_FOTO_TAMANO = "La foto pesa más de 5 MB. Toma otra con menos resolución.";
export const MENSAJE_FOTO_ROSTRO = "Esa foto muestra una cara. Por tu privacidad no la guardamos: toma otra solo del ejercicio, o escríbelo.";
export const MENSAJE_FOTO_ILEGIBLE = "No pude leer bien la foto. Escríbelo aquí o toma otra con más luz.";

/** Confianza mínima para usar la transcripción de una foto (por debajo, se pide escribirla). */
export const CONFIANZA_MINIMA_FOTO = 0.6;

/** La lectura sirve para continuar: legible, sin rostro y con confianza suficiente. */
export function lecturaUtilizable(l: LecturaImagen): boolean {
  return l.legible && !l.contieneRostro && l.confianza >= CONFIANZA_MINIMA_FOTO && l.transcripcion.trim().length > 0;
}

export async function subirFoto(
  ctx: TenantContext,
  acceso: AccesoNudito,
  entrada: EntradaApi<"subirFoto">,
  opciones: { proveedor?: ProveedorTutorIA; proposito?: "ejercicio" | "procedimiento" } = {},
): Promise<SalidaApi<"subirFoto">> {
  if (ctx.soporte) forbidden();
  const estado = await configNudito(ctx);
  if (!estado.activo) forbidden();
  if (!estado.config.permitirFotos) throw new ErrorDeNegocio(MENSAJE_FOTOS_APAGADAS);
  if (!z.uuid().safeParse(entrada.sesionId).success) notFound();
  const sesion = await ctx.db.nuditoSesion.findFirst({ where: { id: entrada.sesionId, alumnoId: acceso.alumno.id }, select: { id: true } });
  if (!sesion) notFound();
  if (entrada.ejercicioId !== undefined) {
    if (!z.uuid().safeParse(entrada.ejercicioId).success) notFound();
    const ej = await ctx.db.nuditoEjercicio.findFirst({ where: { id: entrada.ejercicioId, sesionId: sesion.id }, select: { id: true } });
    if (!ej) notFound();
  }

  const bytes = entrada.archivo.buffer;
  if (bytes.length === 0) throw new ErrorDeNegocio(MENSAJE_FOTO_TIPO);
  if (bytes.length > MAX_BYTES_ARCHIVO) throw new ErrorDeNegocio(MENSAJE_FOTO_TAMANO);
  const mime = detectarMime(bytes);
  if (!mime || !MIMES_FOTO.has(mime)) throw new ErrorDeNegocio(MENSAJE_FOTO_TIPO);

  const buffer = Buffer.from(bytes);
  const subido = await storage().subir(buffer, { tenantId: ctx.tenant.id, carpeta: "nudito", privado: true, mimeType: mime });
  const archivo = await ctx.db.archivo.create({
    data: {
      tenantId: ctx.tenant.id, proveedor: subido.proveedor, publicId: subido.publicId, url: null, mimeType: mime, bytes: buffer.length,
      privado: true, subidoPorId: ctx.membership.id, nuditoSesionId: sesion.id, nombre: "foto-nudito",
    },
  });

  let lectura: LecturaImagen;
  try {
    const ia = opciones.proveedor ?? (await obtenerProveedorTutor());
    const salida = await ia.interpretarImagen({ mime, bytes: new Uint8Array(buffer), proposito: opciones.proposito ?? "ejercicio" });
    const r = esquemaLecturaImagen.safeParse(salida.datos);
    lectura = r.success ? r.data : { transcripcion: "", contieneRostro: false, legible: false, confianza: 0 };
    // El registro del consumo no debe impedir la práctica (si falla, solo se pierde ese dato de costo).
    await registrarConsumo(ctx.db, { tenantId: ctx.tenant.id, alumnoId: acceso.alumno.id, sesionId: sesion.id, operacion: "interpretar_imagen", consumo: salida.consumo, ok: r.success }).catch(() => undefined);
  } catch {
    lectura = { transcripcion: "", contieneRostro: false, legible: false, confianza: 0 };
  }

  if (!lecturaUtilizable(lectura)) {
    await descartar(ctx, archivo.id);
    throw new ErrorDeNegocio(lectura.contieneRostro ? MENSAJE_FOTO_ROSTRO : MENSAJE_FOTO_ILEGIBLE);
  }
  return { archivoId: archivo.id, lectura };
}

/** Borra la foto del proveedor y su fila (rostro, ilegible). */
async function descartar(ctx: TenantContext, archivoId: string): Promise<void> {
  const a = await ctx.db.archivo.findFirst({ where: { id: archivoId } });
  if (!a) return;
  await borrarArchivoDelProveedor(a).catch(() => undefined);
  await ctx.db.archivo.delete({ where: { id: a.id } });
}

/** URL temporal (5 min) de una foto propia (alumno o su apoderado en modo hijo). Nadie más la ve. */
export async function urlFotoNudito(ctx: TenantContext, acceso: AccesoNudito, archivoId: string): Promise<string> {
  if (!z.uuid().safeParse(archivoId).success) notFound();
  const archivo = await ctx.db.archivo.findFirst({ where: { id: archivoId, nuditoSesion: { alumnoId: acceso.alumno.id } } });
  if (!archivo) notFound();
  return urlArchivo(archivo);
}

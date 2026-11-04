import "server-only";
import type { AccesoNudito, EntradaApi, SalidaApi } from "@/lib/nudito/contratos";
import { pendiente } from "@/lib/nudito/pendiente";
import type { TenantContext } from "../tenant";

// Responsable: D (specs/44). Foto de un ejercicio o procedimiento: solo si el colegio la permite; Archivo PRIVADO con
// `nuditoSesionId`, tipo real por firma (detectarMime), máx. 5 MB, URL temporal de 5 min (storage/index.ts). La
// interpretación pasa por `ProveedorTutorIA.interpretarImagen` (HOY SIMULADA); si `contieneRostro`, se descarta.

export async function subirFoto(ctx: TenantContext, acceso: AccesoNudito, entrada: EntradaApi<"subirFoto">): Promise<SalidaApi<"subirFoto">> {
  return pendiente("D", "subirFoto", ctx, acceso, entrada);
}

/** URL temporal de una foto propia (alumno o su apoderado). Nadie más la ve. */
export async function urlFotoNudito(ctx: TenantContext, acceso: AccesoNudito, archivoId: string): Promise<string> {
  return pendiente("D", "urlFotoNudito", ctx, acceso, archivoId);
}

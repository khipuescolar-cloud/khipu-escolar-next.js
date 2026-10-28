import { NextResponse } from "next/server";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { adjuntoDeMesa } from "@/lib/server/plataforma-mesa-ayuda";
import { urlArchivo } from "@/lib/server/storage";
import { leerArchivoLocal } from "@/lib/server/storage/local";

// Capturas que los colegios adjuntan en la mesa de ayuda (specs/23). Solo super administradores y solo archivos de mensajes de soporte.
export async function GET(_request: Request, ctx: RouteContext<"/plataforma/mesa-ayuda/archivos/[id]">) {
  const admin = await requireAdminPlataforma();
  const { id } = await ctx.params;
  const archivo = await adjuntoDeMesa(admin, id);
  if (archivo.proveedor !== "local") return NextResponse.redirect(await urlArchivo(archivo), 307);
  const contenido = await leerArchivoLocal(archivo.publicId);
  const nombre = (archivo.nombre ?? "archivo").replace(/[^\w.\- ()]/g, "_");
  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": archivo.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": `attachment; filename="${nombre}"; filename*=UTF-8''${encodeURIComponent(archivo.nombre ?? "archivo")}`,
    },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { requireArchivoVisible } from "@/lib/server/archivos";
import { urlArchivo } from "@/lib/server/storage";
import { leerArchivoLocal, verificarFirmaArchivoLocal } from "@/lib/server/storage/local";
import { requireTenantContext } from "@/lib/server/tenant";

// Sirve archivos privados del colegio (specs/14). Siempre exige sesión y alcance (`requireArchivoVisible`).
// - Adjuntos de comunicados, tareas y mesa de ayuda: enlace estable `/archivos/<id>` (sin firma); se descargan como adjunto.
// - Resto de archivos locales (justificaciones, fotos): además exigen una URL firmada vigente.
export async function GET(request: NextRequest, ctx: RouteContext<"/colegio/[slug]/archivos/[id]">) {
  const { slug, id } = await ctx.params;
  const tenant = await requireTenantContext(slug);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("No encontrado", { status: 404 });
  const archivo = await requireArchivoVisible(tenant, id);
  const esAdjunto = !!(archivo.comunicadoId || archivo.tareaId || archivo.mensajeSoporteId);

  if (!esAdjunto) {
    const exp = Number(request.nextUrl.searchParams.get("exp"));
    const sig = request.nextUrl.searchParams.get("sig") ?? "";
    if (!verificarFirmaArchivoLocal(id, exp, sig)) return new NextResponse("Enlace vencido", { status: 403 });
    if (archivo.proveedor !== "local") return new NextResponse("No encontrado", { status: 404 });
  } else if (archivo.proveedor !== "local") {
    // Cloudinary u otro proveedor: URL temporal firmada generada solo para quien pasó el control de acceso.
    return NextResponse.redirect(await urlArchivo(archivo), 307);
  }

  const contenido = await leerArchivoLocal(archivo.publicId);
  const nombre = (archivo.nombre ?? "archivo").replace(/[^\w.\- ()]/g, "_");
  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": archivo.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": esAdjunto ? `attachment; filename="${nombre}"; filename*=UTF-8''${encodeURIComponent(archivo.nombre ?? "archivo")}` : "inline",
    },
  });
}

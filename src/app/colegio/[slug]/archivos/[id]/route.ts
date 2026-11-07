import { NextResponse, type NextRequest } from "next/server";
import { requireArchivoVisible } from "@/lib/server/archivos";
import { storageDe } from "@/lib/server/storage";
import { segundosUrl } from "@/lib/almacenamiento";
import { registrarMetrica } from "@/lib/server/almacenamiento/metricas";
import { leerArchivoLocal, verificarFirmaArchivoLocal } from "@/lib/server/storage/local";
import { requireTenantContext } from "@/lib/server/tenant";
import { disposicionArchivo } from "@/lib/disposicion-archivo";

// Sirve archivos privados del colegio (specs/14). Siempre exige sesión y alcance (`requireArchivoVisible`).
// - Adjuntos de comunicados, tareas, mesa de ayuda y documentos de la biblioteca: enlace estable `/archivos/<id>` (sin firma); se descargan como adjunto.
// - Resto de archivos locales (justificaciones, fotos): además exigen una URL firmada vigente.
export async function GET(request: NextRequest, ctx: RouteContext<"/colegio/[slug]/archivos/[id]">) {
  const { slug, id } = await ctx.params;
  const tenant = await requireTenantContext(slug);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("No encontrado", { status: 404 });
  const archivo = await requireArchivoVisible(tenant, id);
  await registrarMetrica(tenant.tenant.id, archivo.categoria, "descargas", archivo.bytes);
  const esAdjunto = !!(archivo.comunicadoId || archivo.tareaId || archivo.entregaId || archivo.mensajeSoporteId || archivo.documentoId || (archivo.categoria === "material_clase" && await tenant.db.materialVersionArchivo.count({ where: { archivoId: archivo.id } })));

  if (!esAdjunto) {
    const exp = Number(request.nextUrl.searchParams.get("exp"));
    const sig = request.nextUrl.searchParams.get("sig") ?? "";
    if (!verificarFirmaArchivoLocal(id, exp, sig)) return new NextResponse("Enlace vencido", { status: 403 });
    if (archivo.proveedor !== "local") return new NextResponse("No encontrado", { status: 404 });
  } else if (archivo.proveedor !== "local") {
    // El servidor controla la disposición también para proveedores externos, después de validar el acceso.
    const url = await storageDe(archivo.proveedor).urlTemporal(archivo, segundosUrl(archivo.categoria));
    const origen = await fetch(url, { cache: "no-store" });
    if (!origen.ok) return new NextResponse("No se pudo abrir el archivo", { status: 502 });
    return new NextResponse(origen.body, { headers: {
      "Content-Type": archivo.mimeType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Content-Disposition": disposicionArchivo(archivo.nombre, archivo.mimeType, request.nextUrl.searchParams.get("vista") === "1"),
    } });
  }

  const contenido = await leerArchivoLocal(archivo.publicId);
  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": archivo.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": disposicionArchivo(archivo.nombre, archivo.mimeType, request.nextUrl.searchParams.get("vista") === "1"),
    },
  });
}

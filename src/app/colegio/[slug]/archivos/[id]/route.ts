import { NextResponse, type NextRequest } from "next/server";
import { requireArchivoVisible } from "@/lib/server/archivos";
import { leerArchivoLocal, verificarFirmaArchivoLocal } from "@/lib/server/storage/local";
import { requireTenantContext } from "@/lib/server/tenant";

// Sirve archivos de LocalStorage (desarrollo): exige sesión, alcance y una URL firmada vigente (specs/14).
export async function GET(request: NextRequest, ctx: RouteContext<"/colegio/[slug]/archivos/[id]">) {
  const { slug, id } = await ctx.params;
  const tenant = await requireTenantContext(slug);
  const exp = Number(request.nextUrl.searchParams.get("exp"));
  const sig = request.nextUrl.searchParams.get("sig") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id) || !verificarFirmaArchivoLocal(id, exp, sig)) {
    return new NextResponse("Enlace vencido", { status: 403 });
  }
  const archivo = await requireArchivoVisible(tenant, id);
  if (archivo.proveedor !== "local") return new NextResponse("No encontrado", { status: 404 });
  const contenido = await leerArchivoLocal(archivo.publicId);
  return new NextResponse(new Uint8Array(contenido), {
    headers: {
      "Content-Type": archivo.mimeType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}

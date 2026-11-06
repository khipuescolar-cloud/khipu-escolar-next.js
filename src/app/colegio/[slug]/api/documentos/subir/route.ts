import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { subirDocumento } from "@/lib/server/documentos";
import { ErrorDeNegocio } from "@/lib/server/contexto-accion";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo", "profesor"]);
  requireFeature(ctx, "documentos");
  if (Number(request.headers.get("content-length") ?? 0) > 11 * 1024 * 1024) return NextResponse.json({ error: "El archivo supera los 10 MB." }, { status: 413 });
  const datos = await request.formData();
  const archivo = datos.get("archivo");
  if (!(archivo instanceof File)) return NextResponse.json({ error: "Elige un archivo." }, { status: 400 });
  const carpetaId = typeof datos.get("carpetaId") === "string" && datos.get("carpetaId") ? String(datos.get("carpetaId")) : null;
  // En la Biblioteca, lo que se sube a una carpeta con roles hereda esos roles (y su salón) para que quienes ven la carpeta vean el archivo.
  const padre = carpetaId && /^[0-9a-f-]{36}$/i.test(carpetaId) ? await ctx.db.carpetaDocumento.findFirst({ where: { id: carpetaId, eliminadoAt: null }, select: { ambito: true, visibleRoles: true, salonId: true } }) : null;
  const hereda = padre?.ambito === "biblioteca";
  try {
    const r = await subirDocumento(ctx, {
      titulo: String(datos.get("titulo") ?? archivo.name), descripcion: null, carpetaId,
      salonId: typeof datos.get("salonId") === "string" && datos.get("salonId") ? String(datos.get("salonId")) : (hereda ? padre.salonId : null),
      visibleRoles: hereda ? padre.visibleRoles.filter((r) => ctx.rol === "profesor" ? r !== "administrativo" && r !== "direccion" : r !== "direccion") : [], ambito: datos.get("ambito") === "unidad" ? "unidad" : "biblioteca",
    }, { nombre: archivo.name, buffer: Buffer.from(await archivo.arrayBuffer()) });
    return NextResponse.json({ id: r.id });
  } catch (e) {
    if (e instanceof ErrorDeNegocio || e instanceof ZodError) return NextResponse.json({ error: e instanceof ZodError ? (e.issues[0]?.message ?? "Revisa los datos.") : e.message }, { status: 400 });
    throw e;
  }
}

import { exportarColegioDesdePlataforma, requireAdminPlataforma } from "@/lib/server/plataforma";

// Garantía de salida (specs/15 y 16): el super administrador descarga el ZIP de un colegio. Auditado en ambas bitácoras.
export async function GET(_request: Request, { params }: RouteContext<"/plataforma/colegios/[id]/exportar">) {
  const admin = await requireAdminPlataforma();
  const { id } = await params;
  const { tenant, zip } = await exportarColegioDesdePlataforma(admin, id);
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(zip), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${tenant.slug}-datos-${fecha}.zip"`,
      "cache-control": "no-store",
    },
  });
}

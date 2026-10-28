import { aCsv } from "@/lib/csv";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { exportarSolicitudes } from "@/lib/server/plataforma-solicitudes";

// Solicitudes de demo en CSV (specs/25). Mismos filtros que /solicitudes. Contiene datos personales: queda auditado.
export async function GET(request: Request) {
  const admin = await requireAdminPlataforma();
  const sp = new URL(request.url).searchParams;
  const { encabezados, filas } = await exportarSolicitudes(admin, { q: sp.get("q") ?? undefined, estado: sp.get("estado") ?? undefined, orden: sp.get("orden") as never });
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(aCsv(encabezados, filas), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="khipu-solicitudes-demo-${fecha}.csv"`,
      "cache-control": "no-store",
    },
  });
}

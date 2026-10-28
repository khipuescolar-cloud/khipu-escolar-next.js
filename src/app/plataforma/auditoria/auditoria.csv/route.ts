import { aCsv } from "@/lib/csv";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { exportarAuditoria } from "@/lib/server/plataforma-auditoria";

// Bitácora de plataforma en CSV (specs/21). Mismos filtros que /auditoria; el detalle va sin datos sensibles.
export async function GET(request: Request) {
  const admin = await requireAdminPlataforma();
  const sp = new URL(request.url).searchParams;
  const filas = await exportarAuditoria(admin, {
    tenantId: sp.get("colegio") ?? undefined, accion: sp.get("accion") ?? undefined, actor: sp.get("actor") ?? undefined,
    desde: sp.get("desde") ?? undefined, hasta: sp.get("hasta") ?? undefined,
  });
  const csv = aCsv(
    ["fecha", "accion", "accion_codigo", "actor", "correo_actor", "colegio", "detalle"],
    filas.map((f) => [f.fecha.toISOString(), f.texto, f.accion, f.actor?.nombre ?? "", f.actor?.email ?? "", f.colegio?.nombre ?? "", f.detalle === null ? "" : JSON.stringify(f.detalle)]),
  );
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="khipu-auditoria-${fecha}.csv"`,
      "cache-control": "no-store",
    },
  });
}

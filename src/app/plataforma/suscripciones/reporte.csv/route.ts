import { aCsv } from "@/lib/csv";
import { NOMBRE_CICLO, NOMBRE_ESTADO_SUSCRIPCION, textoRenovacion } from "@/lib/comercial";
import { NOMBRE_PLAN } from "@/lib/planes";
import { requireAdminPlataforma } from "@/lib/server/plataforma";
import { esquemaFiltroSuscripciones, reporteSuscripciones } from "@/lib/server/plataforma-suscripciones";

// Suscripciones en CSV (specs/20). Mismos filtros que /suscripciones; solo importes y fechas del contrato.
export async function GET(request: Request) {
  const admin = await requireAdminPlataforma();
  const sp = new URL(request.url).searchParams;
  const filtro = esquemaFiltroSuscripciones.parse({ estado: sp.get("estado") || undefined, plan: sp.get("plan") || undefined });
  const { filas } = await reporteSuscripciones(admin, filtro);
  const csv = aCsv(
    ["colegio", "subdominio", "plan", "estado", "ciclo", "monto_por_ciclo_pen", "alumnos_activos", "alumnos_contratados", "inicio", "proxima_renovacion", "renovacion", "ultimo_pago"],
    filas.map((f) => {
      const s = f.suscripcion;
      return [
        f.nombre, f.slug, NOMBRE_PLAN[s?.plan ?? f.planColegio], s ? NOMBRE_ESTADO_SUSCRIPCION[s.estado] : "Sin suscripción",
        s ? NOMBRE_CICLO[s.ciclo] : "", s ? s.montoPorCiclo.toFixed(2) : "", f.alumnosActivos, s?.alumnosContratados ?? "",
        s?.inicio ?? "", s?.proximaRenovacion ?? "", f.renovacion ? textoRenovacion(f.renovacion) : "", f.ultimoPago ?? "",
      ];
    }),
  );
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="khipu-suscripciones-${fecha}.csv"`,
      "cache-control": "no-store",
    },
  });
}

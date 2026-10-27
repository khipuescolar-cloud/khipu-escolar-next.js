import { aCsv } from "@/lib/csv";
import { NOMBRE_PLAN } from "@/lib/planes";
import { reporteColegios, requireAdminPlataforma } from "@/lib/server/plataforma";

// Reporte de colegios en CSV (specs/16). Mismos filtros que /colegios; solo conteos agregados.
export async function GET(request: Request) {
  const admin = await requireAdminPlataforma();
  const sp = new URL(request.url).searchParams;
  const filas = await reporteColegios(admin, { q: sp.get("q") ?? undefined, plan: sp.get("plan") as never, estado: sp.get("estado") as never });
  const iso = (d: Date | null) => (d ? d.toISOString() : "");
  const csv = aCsv(
    ["colegio", "subdominio", "ciudad", "plan", "estado", "alumnos", "profesores", "familias", "ultimo_ingreso", "asistencia_7d", "avisos_7d", "abiertos_7d", "apertura_7d", "rebotes_7d", "alta"],
    filas.map((f) => [
      f.nombre, f.slug, f.ciudad, NOMBRE_PLAN[f.plan], f.estado, f.alumnos, f.profesores, f.familias, iso(f.ultimoIngreso),
      f.asistencias7d, f.avisos7d, f.abiertos7d, f.avisos7d ? (f.abiertos7d / f.avisos7d).toFixed(3) : "", f.rebotes7d, iso(f.createdAt),
    ]),
  );
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="khipu-colegios-${fecha}.csv"`,
      "cache-control": "no-store",
    },
  });
}

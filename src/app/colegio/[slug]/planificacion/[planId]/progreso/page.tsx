import { CircleCheck, CircleDashed, CircleHelp, Clock3 } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { mapearEstadoProgreso } from "@/lib/nudito/leccion";
import { auditar } from "@/lib/server/auditoria";
import { requireTenantContext } from "@/lib/server/tenant";
import { fotoDelPlan, nombresDeTemas } from "@/lib/server/nudito/lecciones";
import { obtenerPlan } from "@/lib/server/plan-anual";

const iconos = { pendiente: CircleDashed, en_progreso: Clock3, necesita_refuerzo: CircleHelp, dominado: CircleCheck } as const;
export default async function ProgresoPlanPage({ params }: PageProps<"/colegio/[slug]/planificacion/[planId]/progreso">) {
  const { slug, planId } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  if (!(await obtenerPlan(ctx, planId)).versionPublicada) return <p className="inline-flex items-center gap-2 text-cuerpo-sm"><CircleDashed className="size-4" strokeWidth={2} aria-hidden />Publica el plan para seguir el progreso de tus alumnos en Nudito.</p>;
  const { plan, claves } = await fotoDelPlan(ctx, planId);
  const [alumnos, lecciones] = await Promise.all([
    ctx.db.alumno.findMany({ where: { estado: "activo", salon: { anio: plan.anio, nivel: plan.nivel, grado: plan.grado, archivadoAt: null, cursos: { some: { areaCneb: plan.area } } } }, select: { id: true, nombres: true, apellidos: true }, orderBy: { apellidos: "asc" } }),
    ctx.db.nuditoLeccion.findMany({ where: { temaClave: { in: claves }, area: plan.area, estado: "publicada" }, select: { temaClave: true } }),
  ]);
  const temas = claves.filter(c => lecciones.some(l => l.temaClave === c));
  const dominios = alumnos.length && temas.length ? await ctx.db.nuditoDominio.findMany({ where: { alumnoId: { in: alumnos.map(a => a.id) }, temaClave: { in: temas } }, select: { alumnoId: true, temaClave: true, estado: true } }) : [];
  await auditar({ tenantId: ctx.tenant.id, actorId: ctx.user.id, accion: "ver", entidad: "nudito_progreso_plan", entidadId: planId, detalle: { alumnos: alumnos.length } });
  const nombres = await nombresDeTemas(ctx.db, temas);
  const porAlumno = new Map(dominios.map(d => [d.alumnoId + "|" + d.temaClave, d.estado]));
  return <div className="min-w-0">
    <EncabezadoPagina titulo="Progreso del plan en Nudito" seccion="academico" descripcion="Seguimiento formativo, sin notas oficiales." />
    <p className="mb-4 text-cuerpo-sm">{alumnos.length} alumnos · {temas.length} temas publicados</p>
    <ul className="grid gap-4 sm:grid-cols-2">
      {alumnos.map(a => <li key={a.id} className="min-w-0 rounded-lg border border-borde-sutil bg-superficie p-4">
        <h2 className="font-semibold">{a.nombres} {a.apellidos}</h2>
        <ul className="mt-3 space-y-2">{temas.map(clave => {
          const estado = mapearEstadoProgreso(porAlumno.get(a.id + "|" + clave) ?? null);
          const Icono = iconos[estado];
          return <li key={clave} className="flex min-w-0 items-start gap-2 text-cuerpo-sm"><Icono className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden /><span className="min-w-0 break-words">{nombres.get(clave)} · {estado.replaceAll("_"," ")}</span></li>;
        })}</ul>
      </li>)}
    </ul>
  </div>;
}

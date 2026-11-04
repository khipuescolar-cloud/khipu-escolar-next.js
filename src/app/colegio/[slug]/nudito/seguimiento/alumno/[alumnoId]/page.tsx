import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { esAreaNudito } from "@/lib/nudito/contratos";
import { detalleProgresoAlumno } from "@/lib/server/nudito/progreso";
import { requireTenantContext } from "@/lib/server/tenant";
import { ProgresoTemas } from "../../_componentes/ProgresoTemas";

export const metadata: Metadata = { title: "Progreso en Nudito" };

/** Progreso de un alumno (docente: solo el área de sus cursos; tutor y dirección: todas). Sin conversaciones. */
export default async function SeguimientoAlumno({ params, searchParams }: PageProps<"/colegio/[slug]/nudito/seguimiento/alumno/[alumnoId]">) {
  const { slug, alumnoId } = await params;
  const { area } = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const p = await detalleProgresoAlumno(ctx, alumnoId, esAreaNudito(area) ? area : undefined);
  const alumno = await ctx.db.alumno.findFirst({ where: { id: alumnoId }, select: { nombres: true, apellidos: true, salon: { select: { nombre: true } } } });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/nudito/seguimiento" className="enlace inline-flex w-fit items-center gap-1 text-cuerpo-sm">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Seguimiento de Nudito
      </Link>
      <EncabezadoPagina titulo={alumno ? `${alumno.nombres} ${alumno.apellidos}` : "Alumno"} descripcion={alumno ? `${alumno.salon.nombre} · progreso de práctica con Nudito` : undefined} />
      <ProgresoTemas areas={p.areas} temas={p.temas} vacio="Aún no practicó con Nudito en estos cursos." />
    </div>
  );
}

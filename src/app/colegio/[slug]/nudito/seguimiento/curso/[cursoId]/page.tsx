import { ArrowLeft, CheckCircle2, RefreshCw, Sprout } from "lucide-react";
import { ListaDividida } from "@/components/ui/Superficies";
import type { Metadata } from "next";
import Link from "next/link";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatoDia } from "@/lib/fechas";
import { AVISO_FORMATIVO, NOMBRE_AREA_NUDITO } from "@/lib/nudito-seguimiento";
import { cursoDeSeguimiento, progresoDeCurso } from "@/lib/server/nudito/progreso";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Seguimiento de Nudito por curso" };

/** Progreso agregado de un curso (specs/44): por alumno, dominados / practicando / para reforzar y temas difíciles. */
export default async function SeguimientoCurso({ params }: PageProps<"/colegio/[slug]/nudito/seguimiento/curso/[cursoId]">) {
  const { slug, cursoId } = await params;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion"]);
  const curso = await cursoDeSeguimiento(ctx, cursoId);
  const p = await progresoDeCurso(ctx, { cursoId });

  return (
    <div className="flex flex-col gap-6">
      <Link href="/nudito/seguimiento" className="enlace inline-flex w-fit items-center gap-1 text-cuerpo-sm">
        <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Seguimiento de Nudito
      </Link>
      <EncabezadoPagina titulo={`${curso.nombre} · ${curso.salon}`} seccion="academico" descripcion={`${curso.area ? NOMBRE_AREA_NUDITO[curso.area] : "Sin área de Nudito"}. ${AVISO_FORMATIVO}`} />

      {p.temasDificiles.length > 0 && (
        <section aria-labelledby="temas-reforzar" className="flex flex-col gap-3">
          <TituloBloque id="temas-reforzar">Temas para reforzar en clase</TituloBloque>
          <ListaDividida>
            {p.temasDificiles.map((t) => (
              <li key={t.clave} className="flex items-center justify-between gap-3 px-4 py-2.5 text-cuerpo-sm sm:px-5">
                <span className="inline-flex items-center gap-2 font-medium"><RefreshCw className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden />{t.nombre}</span>
                <span className="tabular-nums text-muted-foreground">{t.alumnos} {t.alumnos === 1 ? "alumno" : "alumnos"}</span>
              </li>
            ))}
          </ListaDividida>
        </section>
      )}

      <div className="overflow-x-auto rounded-[14px] border border-borde-sutil bg-superficie">
        <Table className="min-w-[640px]" data-testid="tabla-progreso-curso">
          <TableHeader className="bg-sec-suave text-sec-tinta">
            <TableRow>
              <TableHead className="pl-4">Alumno</TableHead>
              <TableHead className="text-right"><span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden /> Dominados</span></TableHead>
              <TableHead className="text-right"><span className="inline-flex items-center gap-1"><Sprout className="size-4" strokeWidth={2} aria-hidden /> Practicando</span></TableHead>
              <TableHead className="text-right"><span className="inline-flex items-center gap-1"><RefreshCw className="size-4" strokeWidth={2} aria-hidden /> Para reforzar</span></TableHead>
              <TableHead className="pr-4">Última práctica</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {p.alumnos.map((a) => (
              <TableRow key={a.alumnoId}>
                <TableCell className="pl-4">
                  <Link href={`/nudito/seguimiento/alumno/${a.alumnoId}${curso.area ? `?area=${curso.area}` : ""}`} className="enlace font-semibold">{a.nombre}</Link>
                </TableCell>
                <TableCell className="text-right tabular-nums">{a.dominados}</TableCell>
                <TableCell className="text-right tabular-nums">{a.enProgreso}</TableCell>
                <TableCell className="text-right tabular-nums">{a.reforzar}</TableCell>
                <TableCell className="pr-4 text-cuerpo-sm text-muted-foreground">{a.ultimaActividad ? formatoDia(new Date(a.ultimaActividad), { day: "numeric", month: "long" }) : "Aún no practica"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

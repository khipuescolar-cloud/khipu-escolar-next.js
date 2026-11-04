import { ArrowLeft, CheckCircle2, RefreshCw, Sprout } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Tarjeta } from "@/components/ui/Tarjeta";
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
      <EncabezadoPagina titulo={`${curso.nombre} · ${curso.salon}`} descripcion={`${curso.area ? NOMBRE_AREA_NUDITO[curso.area] : "Sin área de Nudito"}. ${AVISO_FORMATIVO}`} />

      {p.temasDificiles.length > 0 && (
        <Tarjeta className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Temas para reforzar en clase</h2>
          <ul className="flex flex-wrap gap-2">
            {p.temasDificiles.map((t) => (
              <li key={t.clave} className="inline-flex items-center gap-1 rounded-pildora bg-superficie-2 px-3 py-1 text-cuerpo-sm">
                <RefreshCw className="size-3.5" strokeWidth={2} aria-hidden /> {t.nombre} · {t.alumnos} {t.alumnos === 1 ? "alumno" : "alumnos"}
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      <Tarjeta className="overflow-x-auto p-0">
        <Table className="min-w-[640px]" data-testid="tabla-progreso-curso">
          <TableHeader>
            <TableRow>
              <TableHead className="sobretitulo pl-4">Alumno</TableHead>
              <TableHead className="sobretitulo text-right"><span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4" strokeWidth={2} aria-hidden /> Dominados</span></TableHead>
              <TableHead className="sobretitulo text-right"><span className="inline-flex items-center gap-1"><Sprout className="size-4" strokeWidth={2} aria-hidden /> Practicando</span></TableHead>
              <TableHead className="sobretitulo text-right"><span className="inline-flex items-center gap-1"><RefreshCw className="size-4" strokeWidth={2} aria-hidden /> Para reforzar</span></TableHead>
              <TableHead className="sobretitulo pr-4">Última práctica</TableHead>
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
      </Tarjeta>
    </div>
  );
}

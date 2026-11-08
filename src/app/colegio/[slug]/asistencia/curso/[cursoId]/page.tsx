import { ArrowLeft, BookOpenCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EstadoAsistencia, ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { MigasSeccion } from "@/components/colegio/MigasSeccion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { TituloBloque } from "@/components/shell/TituloBloque";
import { buttonVariants } from "@/components/ui/button";
import { fechaLarga, hora12 } from "@/lib/fechas";
import { periodoElegido, rangoCorto } from "@/lib/periodos-asistencia";
import { textoPorcentaje } from "@/lib/reportes-asistencia";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { requireFeature } from "@/lib/server/plan";
import { historialCursoAlumno, opcionesDeReporte, periodosDelAlumno, type ClaseAlumno } from "@/lib/server/reportes-asistencia";
import { requireTenantContext } from "@/lib/server/tenant";
import { BarraAsistencia } from "../../_alumno/ListaCursos";
import { CalendarioMeses, type DiaCalendario } from "../../_alumno/CalendarioMeses";
import { SelectorPeriodo } from "../../_alumno/SelectorPeriodo";

export const metadata: Metadata = { title: "Asistencia del curso" };

const JUSTIFICACION: Record<string, string> = { aceptada: "Falta justificada", pendiente: "Justificación en revisión" };

/**
 * Historial de asistencia de un alumno en un curso (specs/27): cada clase con su estado y hora, agrupada por mes.
 * Alumno (el suyo) y familia (`?alumno=`, sus hijos). Sin periodo elegido, desde el inicio de clases.
 */
export default async function AsistenciaCursoPage({ params, searchParams }: PageProps<"/colegio/[slug]/asistencia/curso/[cursoId]">) {
  const { slug, cursoId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["alumno", "apoderado"]);
  requireFeature(ctx, "asistencia");
  const uno = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);
  const tu = ctx.rol === "alumno";
  const hoy = hoyDelColegio(ctx).isoFecha;
  const { alumnos } = await opcionesDeReporte(ctx);
  const alumno = alumnos.find((a) => a.id === uno("alumno")) ?? alumnos[0];
  if (!alumno) return <EstadoVacio icono={BookOpenCheck} titulo="No hay un alumno para mostrar" descripcion="Avisa a la dirección del colegio para que revise tu cuenta." />;

  const periodos = await periodosDelAlumno(ctx, alumno.id);
  const periodo = periodoElegido(periodos, uno("periodo"), hoy, "anio");
  const h = await historialCursoAlumno(ctx, { alumnoId: alumno.id, cursoId, desde: periodo.desde, hasta: periodo.hasta });

  const base = tu ? "/asistencia" : "/asistencia/reportes";
  const conAlumno = (q: URLSearchParams) => {
    if (!tu) q.set("alumno", alumno.id);
    return q;
  };
  const hrefCursos = `${base}?${conAlumno(new URLSearchParams({ tab: "cursos", ...(uno("periodo") ? { periodo: uno("periodo")! } : {}) })).toString()}`;
  const hrefPeriodo = (clave: string) => `/asistencia/curso/${cursoId}?${conAlumno(new URLSearchParams({ periodo: clave })).toString()}`;
  const nombre = alumno.nombres.split(" ")[0];
  const r = h.resumen;
  const presentes = r.clases - r.falta;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={h.curso.nombre}
        seccion="dia"
        migas={<MigasSeccion seccion="dia" ruta={[{ href: base, texto: tu ? "Mi asistencia" : "Reporte de asistencia" }, { href: hrefCursos, texto: "Cursos" }]} actual={h.curso.nombre} />}
        descripcion={[h.curso.profesor && `Profesor(a): ${h.curso.profesor}`, tu ? null : `${alumno.nombres} ${alumno.apellidos}`, h.alumno.salon].filter(Boolean).join(" · ")}
        acciones={
          <Link href={hrefCursos} className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Todos los cursos
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-borde-sutil pb-4">
        <SelectorPeriodo periodos={periodos} actual={periodo.clave} href={hrefPeriodo} />
        <p className="text-cuerpo-sm text-muted-foreground">
          {periodo.clave === "anio" ? "Desde el inicio de clases" : periodo.nombre} · <span className="tabular-nums">{rangoCorto(periodo.desde, h.hastaEfectivo)}</span>
        </p>
      </div>

      <section aria-labelledby="titulo-curso-resumen" className="flex max-w-2xl flex-col gap-4">
        <h2 id="titulo-curso-resumen" className="font-heading text-titulo-2 text-balance">
          {r.clases === 0
            ? "Aún no hay clases con lista en este periodo"
            : `${tu ? "Estuviste" : `${nombre} estuvo`} en ${presentes} de ${r.clases} ${r.clases === 1 ? "clase" : "clases"}`}
        </h2>
        {r.clases > 0 && (
          <>
            <div className="flex items-center gap-4">
              <BarraAsistencia porcentaje={r.porcentaje} />
              <strong className="shrink-0 font-semibold tabular-nums">{textoPorcentaje(r.porcentaje)}</strong>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Clases por estado">
              {(["llego", "tarde", "falta", "problema"] as const).map((e) => (
                <li key={e} className="flex items-center gap-1.5 text-sm"><EstadoAsistencia estado={e} /> <strong className="tabular-nums">{r[e]}</strong></li>
              ))}
            </ul>
          </>
        )}
      </section>

      {r.clases === 0 ? (
        <EstadoVacio icono={BookOpenCheck} titulo="Sin clases con lista" descripcion="Cuando el profesor pase lista en este curso, verás aquí cada clase." />
      ) : (
        <section aria-labelledby="titulo-calendario-curso" className="flex flex-col gap-3">
          <TituloBloque id="titulo-calendario-curso" descripcion="Cada clase con su estado y la hora de la lista. Pasa el cursor o toca un día para ver el detalle.">
            Clase por clase
          </TituloBloque>
          <CalendarioMeses dias={diasDeClases(h.clases)} desde={periodo.desde} hasta={h.hastaEfectivo} hoy={hoy} vacio="Sin clase" omitirMesesVacios className="md:grid-cols-2 2xl:grid-cols-3" />
          <p className="text-cuerpo-sm text-muted-foreground">«Tarde»: llegó después de empezada la clase. Los días en gris no hubo clase de este curso; los meses sin ninguna clase con lista no se muestran.</p>
        </section>
      )}
    </div>
  );
}

function observacion(c: ClaseAlumno): string {
  const partes = [c.estado === "falta" ? JUSTIFICACION[c.justificacion ?? ""] ?? "Sin justificar" : null, c.nota];
  return partes.filter(Boolean).join(" · ");
}

function diasDeClases(clases: ClaseAlumno[]): DiaCalendario[] {
  return clases.map((c) => {
    const obs = observacion(c);
    const hora = c.estado === "falta" ? null : hora12(c.hora);
    return {
      fecha: c.fecha,
      estado: c.estado,
      hora: hora ? hora.replace(/\s?[ap]\. m\./, "") : null,
      texto: `${fechaLarga(c.fecha)}: ${ESTADOS_ASISTENCIA[c.estado].palabra}${hora ? `, ${hora}` : ""}${obs ? ` (${obs})` : ""}`,
    };
  });
}

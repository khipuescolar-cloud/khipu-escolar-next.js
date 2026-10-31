import { ArrowLeft, BookOpen, Check, CircleAlert, Clock, FileSpreadsheet, FileText, Percent } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ZodError } from "zod";
import { GraficoAsistenciaDias } from "@/components/asistencia/GraficoAsistenciaDias";
import { ESTADOS_ASISTENCIA } from "@/components/EstadoAsistencia";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { fechaCorta, formatoDia, isoDeFechaDb, restarDias } from "@/lib/fechas";
import { rangoEsteMes, textoPorcentaje } from "@/lib/reportes-asistencia";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { requireFeature } from "@/lib/server/plan";
import { historialCurso, type ReporteCurso } from "@/lib/server/reportes-asistencia";
import { requireTenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";
import { Cifra } from "../../PanelProfesor";
import { atajosDeFecha } from "../../vistas";

export const metadata: Metadata = { title: "Asistencia del curso" };

const NUM = new Intl.NumberFormat("es-PE");

/** Historial de asistencia de un curso (specs/27): rango de fechas, resumen, gráfico por clase y matriz alumnos × clases. */
export default async function HistorialCursoPage({ params, searchParams }: PageProps<"/colegio/[slug]/asistencia/reportes/curso/[cursoId]">) {
  const { slug, cursoId } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion", "administrativo", "profesor"]);
  requireFeature(ctx, "asistencia");
  const hoy = hoyDelColegio(ctx).isoFecha;
  const uno = (k: string) => (typeof sp[k] === "string" && sp[k] !== "" ? (sp[k] as string) : undefined);
  const base = rangoEsteMes(hoy);
  const desde = uno("desde") ?? base.desde;
  const hasta = uno("hasta") ?? base.hasta;

  let r: ReporteCurso | null = null;
  let error: string | null = null;
  try {
    r = await historialCurso(ctx, { cursoId, desde, hasta });
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    error = e.issues[0]?.message ?? "Revisa las fechas.";
  }
  // El atajo del periodo en curso usa la organización del nivel del curso (bimestres, trimestres o semestres).
  const nivel = (await ctx.db.curso.findFirst({ where: { id: cursoId }, select: { salon: { select: { nivel: true } } } }))?.salon.nivel;
  const periodos = await ctx.db.periodo.findMany({ where: { anio: Number(hoy.slice(0, 4)), ...(nivel ? { niveles: { has: nivel } } : {}) }, select: { nombre: true, inicio: true, fin: true } });
  const periodo = periodos.map((p) => ({ nombre: p.nombre, inicio: isoDeFechaDb(p.inicio), fin: isoDeFechaDb(p.fin) })).find((p) => p.inicio <= hoy && hoy <= p.fin);
  const atajos = [{ texto: "Últimos 7 días", desde: restarDias(hoy, 6), hasta: hoy }, ...atajosDeFecha(hoy, periodo)];
  const ruta = `/asistencia/reportes/curso/${cursoId}`;
  const q = `curso=${cursoId}&desde=${desde}&hasta=${hasta}`;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={r ? `${r.curso.nombre} · ${r.salon.nombre}` : "Asistencia del curso"}
        descripcion={r ? `Asistencia a clase${r.profesor ? ` · ${r.profesor}` : ""}` : undefined}
        acciones={
          <Link href="/asistencia/reportes" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden /> Reportes
          </Link>
        }
      />

      <Tarjeta className="-mt-2 flex flex-col gap-3">
        {/* key: al tocar un atajo la página no se vuelve a montar; sin key, los campos (no controlados) mostraban las fechas anteriores. */}
        <form key={`${desde}|${hasta}`} method="get" className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Desde" name="desde" type="date" defaultValue={desde} max={hoy} />
          <Campo etiqueta="Hasta" name="hasta" type="date" defaultValue={hasta} max={hoy} />
          <Boton type="submit">Buscar</Boton>
        </form>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Atajos:</span>
          {atajos.map((a) => {
            const activo = a.desde === desde && a.hasta === hasta;
            return (
              <Link
                key={a.texto}
                href={`${ruta}?desde=${a.desde}&hasta=${a.hasta}`}
                aria-current={activo ? "true" : undefined}
                className={buttonVariants({ variant: activo ? "default" : "outline", size: "sm" })}
              >
                {a.texto}
              </Link>
            );
          })}
        </p>
      </Tarjeta>

      {error && <Alerta tipo="error">{error}</Alerta>}

      {r && (
        r.fechas.length === 0 ? (
          <EstadoVacio
            icono={BookOpen}
            titulo={`No se pasó lista de ${r.curso.nombre} en estas fechas`}
            descripcion="Prueba con un rango más amplio. Solo aparecen las clases en las que se pasó lista."
          />
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-cuerpo-sm text-muted-foreground">
                Del {fechaCorta(r.desde)} al {fechaCorta(r.hastaEfectivo)} · {NUM.format(r.fechas.length)} {r.fechas.length === 1 ? "clase" : "clases"} · {NUM.format(r.filas.length)} alumnos
              </p>
              <div className="flex flex-wrap gap-2">
                <a href={`/api/reportes-asistencia/excel?${q}`} className={buttonVariants({ variant: "outline", size: "sm" })} download>
                  <FileSpreadsheet className="size-4" strokeWidth={2} aria-hidden /> Descargar Excel
                </a>
                <a href={`/api/reportes-asistencia/pdf?${q}`} className={buttonVariants({ variant: "outline", size: "sm" })} download>
                  <FileText className="size-4" strokeWidth={2} aria-hidden /> Descargar PDF
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Cifra icono={Percent} titulo="Asistencia" valor={textoPorcentaje(r.total.porcentaje)} detalle={`en ${NUM.format(r.fechas.length)} ${r.fechas.length === 1 ? "clase" : "clases"}`} />
              <Cifra icono={Check} titulo="Asistieron" valor={NUM.format(r.total.llego + r.total.tarde)} detalle="veces que un alumno estuvo en clase" tono="llego" />
              <Cifra icono={Clock} titulo="Tardanzas" valor={NUM.format(r.total.tarde)} detalle={`${NUM.format(r.filas.filter((f) => f.resumen.tarde > 0).length)} alumnos llegaron tarde`} tono="tarde" />
              <Cifra icono={CircleAlert} titulo="Faltas" valor={NUM.format(r.total.falta)} detalle={`${NUM.format(r.filas.filter((f) => f.resumen.falta > 0).length)} alumnos faltaron`} tono="falta" />
            </div>

            <Tarjeta className="flex min-w-0 flex-col gap-2">
              <h2 className="font-heading text-cuerpo font-semibold">Asistencia por clase</h2>
              <GraficoAsistenciaDias datos={r.porFecha} titulo={`Asistencia por clase de ${r.curso.nombre}`} etiquetaFila="Clase" />
            </Tarjeta>

            <Matriz r={r} />
          </>
        )
      )}
    </div>
  );
}

/** Alumnos × clases: cada celda con el ícono del estado (forma distinta por estado, no solo color) y la palabra para lectores
 *  de pantalla y al pasar el mouse; la leyenda de arriba dice qué es cada ícono. Totales por alumno al final. */
function Matriz({ r }: { r: ReporteCurso }) {
  return (
    <section aria-labelledby="titulo-matriz" className="flex flex-col gap-2">
      <h2 id="titulo-matriz" className="text-titulo-2">Alumnos por clase</h2>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-cuerpo-sm text-muted-foreground" aria-label="Leyenda de la tabla">
        {(["llego", "tarde", "falta", "problema"] as const).map((e) => {
          const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[e];
          return (
            <span key={e} className="inline-flex items-center gap-1.5">
              <span className={cn("inline-flex size-7 items-center justify-center rounded-md", clase)}>
                <Icono className="size-4" strokeWidth={2} aria-hidden />
              </span>
              {palabra}
            </span>
          );
        })}
        <span className="inline-flex items-center gap-1.5"><span className="inline-flex size-7 items-center justify-center text-muted-foreground">—</span> Sin registro</span>
      </p>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Asistencia de cada alumno en cada clase de {r.curso.nombre}</caption>
          <thead>
            <tr className="border-b bg-muted/50">
              <th scope="col" className="sticky left-0 z-10 bg-muted px-3 py-2 text-left font-semibold">Alumno</th>
              {r.fechas.map((f) => (
                <th key={f} scope="col" className="px-1.5 py-2 text-center text-etiqueta font-medium whitespace-nowrap text-muted-foreground">
                  <span className="block first-letter:uppercase">{formatoDia(f, { weekday: "short" })}</span>
                  <span className="block text-foreground">{formatoDia(f, { day: "numeric", month: "numeric" })}</span>
                </th>
              ))}
              <th scope="col" className="px-2 py-2 text-right font-semibold whitespace-nowrap">Faltas</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold whitespace-nowrap">Tardanzas</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold whitespace-nowrap">% asistencia</th>
            </tr>
          </thead>
          <tbody>
            {r.filas.map((f) => (
              <tr key={f.alumnoId} className="border-b last:border-b-0 hover:bg-muted/30">
                <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-1.5 text-left font-medium whitespace-nowrap">{f.apellidos}, {f.nombres}</th>
                {f.estados.map((e, i) => {
                  if (!e) return <td key={i} className="px-1.5 py-1.5 text-center text-muted-foreground" aria-label="Sin registro">—</td>;
                  const { palabra, Icono, clase } = ESTADOS_ASISTENCIA[e];
                  return (
                    <td key={i} className="px-1.5 py-1.5 text-center">
                      <span className={cn("inline-flex size-7 items-center justify-center rounded-md", clase)} title={`${palabra} · ${formatoDia(r.fechas[i])}`}>
                        <Icono className="size-4" strokeWidth={2} aria-hidden />
                        <span className="sr-only">{palabra}</span>
                      </span>
                    </td>
                  );
                })}
                <td className={cn("px-2 py-1.5 text-right tabular-nums", f.resumen.falta > 0 && "font-semibold text-falta")}>{f.resumen.falta}</td>
                <td className={cn("px-2 py-1.5 text-right tabular-nums", f.resumen.tarde > 0 && "font-semibold text-tarde")}>{f.resumen.tarde}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{textoPorcentaje(f.resumen.porcentaje)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

import { Clock, FileText, History, Paperclip, Search, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ZodError } from "zod";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Campo } from "@/components/ui/Campo";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Selector } from "@/components/ui/Selector";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaCorta, fechaLarga, fechaLima } from "@/lib/fechas";
import {
  contarPendientes, historialJustificaciones, listarJustificaciones, POR_PAGINA_HISTORIAL, salonesDeJustificaciones,
  type HistorialJustificaciones, type JustificacionVista,
} from "@/lib/server/justificaciones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { revisarJustificacionAction } from "./actions";
import { DetalleJustificacion, type DetalleVista } from "./DetalleJustificacion";
import { EstadoPildora } from "./EstadoPildora";

export const metadata: Metadata = { title: "Justificaciones" };

const RUTA = "/justificaciones";
const PARAMS_FILTRO = ["estado", "salon", "q", "desde", "hasta"] as const;

export default async function JustificacionesPage({ params, searchParams }: PageProps<"/colegio/[slug]/justificaciones">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion", "apoderado"]);
  requireFeature(ctx, "justificaciones");

  // La familia ve una sola lista con sus justificaciones y su estado.
  if (ctx.rol === "apoderado") return <VistaFamilia lista={await listarJustificaciones(ctx)} />;

  const uno = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const pendientes = await contarPendientes(ctx);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Justificaciones"
        seccion="dia"
        descripcion="Las faltas que justificaron las familias. Las pendientes van primero; ábrelas para revisarlas."
        acciones={pendientes > 0 && uno("estado") !== "pendiente" ? (
          <Link href={`${RUTA}?estado=pendiente`} className={buttonVariants({ variant: "outline" })}>
            <Clock className="size-4 text-tarde" strokeWidth={2} aria-hidden />
            <span className="tabular-nums">{pendientes}</span> por revisar
          </Link>
        ) : undefined}
      />
      <Lista slug={slug} ctx={ctx} uno={uno} />
    </div>
  );
}

function Adjunto({ j }: { j: JustificacionVista }) {
  if (!j.adjuntoUrl) return null;
  const tipo = j.adjuntoMime === "application/pdf" ? "PDF" : "imagen";
  return (
    <a href={j.adjuntoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 w-fit items-center gap-1.5 text-cuerpo-sm enlace">
      <Paperclip className="size-4" strokeWidth={2} aria-hidden /> Ver adjunto ({tipo})
    </a>
  );
}

/** Fila de la lista de la familia: datos, motivo, adjunto y la revisión del colegio. */
function FilaFamilia({ j }: { j: JustificacionVista }) {
  return (
    <div className="flex flex-col gap-3 py-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-cuerpo font-semibold">
            {j.alumno} <span className="font-sans font-normal text-muted-foreground">· {j.salon}</span>
          </p>
          <p className="text-sm text-muted-foreground">Falta del {fechaLarga(j.fecha)}</p>
        </div>
        <EstadoPildora estado={j.estado} />
      </div>
      <p className="text-base whitespace-pre-line">{j.motivo}</p>
      <Adjunto j={j} />
      {j.revisadoPor && <p className="text-sm text-muted-foreground">Revisada por {j.revisadoPor}</p>}
      {j.comentarioRevision && (
        <p className="rounded-md bg-superficie-2 px-3 py-2 text-cuerpo-sm">
          <span className="font-medium">Comentario del colegio:</span> {j.comentarioRevision}
        </p>
      )}
    </div>
  );
}

function VistaFamilia({ lista }: { lista: JustificacionVista[] }) {
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Justificaciones" seccion="dia" descripcion="Las justificaciones que enviaste y su estado." />
      {lista.length === 0 ? (
        <EstadoVacio icono={FileText} titulo="Todavía no enviaste justificaciones" descripcion="Si tu hijo falta, podrás justificarlo desde el aviso o desde Asistencia." />
      ) : (
        <ul className="-mt-2 flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil">
          {lista.map((j) => <li key={j.id}><FilaFamilia j={j} /></li>)}
        </ul>
      )}
    </div>
  );
}

function aDetalle(j: JustificacionVista): DetalleVista {
  return {
    alumno: j.alumno, salon: j.salon, falta: fechaLarga(j.fecha), motivo: j.motivo, estado: j.estado,
    enviada: fechaCorta(fechaLima(j.creada)), apoderado: j.apoderado,
    adjuntoUrl: j.adjuntoUrl, adjuntoTipo: j.adjuntoUrl ? (j.adjuntoMime === "application/pdf" ? "PDF" : "imagen") : null,
    revisadoPor: j.revisadoPor, revisadaEl: j.revisadoAt ? fechaCorta(fechaLima(j.revisadoAt)) : null, comentarioRevision: j.comentarioRevision,
  };
}

/** Vista única de quien revisa: filtros + tabla (pendientes primero); «Revisar»/«Ver» abre el detalle en un panel. */
async function Lista({ slug, ctx, uno }: { slug: string; ctx: Parameters<typeof historialJustificaciones>[0]; uno: (k: string) => string | undefined }) {
  const filtros = { estado: uno("estado"), salonId: uno("salon"), q: uno("q"), desde: uno("desde"), hasta: uno("hasta"), pagina: uno("pagina") };
  const salones = await salonesDeJustificaciones(ctx);
  let resultado: HistorialJustificaciones | null = null;
  let error: string | null = null;
  try {
    resultado = await historialJustificaciones(ctx, filtros);
  } catch (e) {
    if (!(e instanceof ZodError)) throw e;
    error = e.issues[0]?.message ?? "Revisa los filtros.";
  }
  const conFiltro = PARAMS_FILTRO.some((k) => uno(k));
  const href = (pagina: number) => {
    const q = new URLSearchParams();
    for (const k of PARAMS_FILTRO) if (uno(k)) q.set(k, uno(k)!);
    if (pagina > 1) q.set("pagina", String(pagina));
    const texto = q.toString();
    return texto ? `${RUTA}?${texto}` : RUTA;
  };

  return (
    <section aria-label="Justificaciones" className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-borde-sutil bg-superficie p-4">
          <form method="get" action={RUTA} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <Campo etiqueta="Alumno" name="q" type="search" placeholder="Nombre o apellido" defaultValue={uno("q")} maxLength={80} />
            <Selector etiqueta="Estado" name="estado" defaultValue={uno("estado") ?? ""}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">No aceptada</option>
            </Selector>
            <Selector etiqueta="Salón" name="salon" defaultValue={uno("salon") ?? ""}>
              <option value="">{salones.length === 1 ? salones[0].nombre : "Todos los salones"}</option>
              {salones.length > 1 && salones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Selector>
            <Campo etiqueta="Falta desde" name="desde" type="date" defaultValue={uno("desde")} />
            <Campo etiqueta="Falta hasta" name="hasta" type="date" defaultValue={uno("hasta")} />
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <Boton type="submit" variante="secundario"><Search className="size-4" strokeWidth={2} aria-hidden /> Filtrar</Boton>
              {conFiltro && (
                <Link href={RUTA} className={buttonVariants({ variant: "ghost" })}>
                  <X className="size-4" strokeWidth={2} aria-hidden /> Limpiar
                </Link>
              )}
            </div>
          </form>
      </div>

      {error && <Alerta tipo="error">{error}</Alerta>}
      {resultado && resultado.total === 0 && (
        <EstadoVacio
          icono={History}
          titulo={conFiltro ? "Ninguna justificación coincide" : "Aún no hay justificaciones"}
          descripcion={conFiltro ? "Prueba con otro estado, salón o rango de fechas." : "Cuando las familias justifiquen faltas, aparecerán aquí."}
        />
      )}
      {resultado && resultado.total > 0 && (
        <>
          <p className="text-cuerpo-sm text-muted-foreground tabular-nums" role="status">
            {resultado.total} {resultado.total === 1 ? "justificación" : "justificaciones"}
            {resultado.paginas > 1 ? ` · página ${resultado.pagina} de ${resultado.paginas} (${POR_PAGINA_HISTORIAL} por página)` : ""}
          </p>
          <div className="overflow-x-auto rounded-[14px] border border-borde-sutil bg-superficie">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Falta</TableHead>
                    <TableHead>Alumno</TableHead>
                    <TableHead className="min-w-48">Motivo</TableHead>
                    <TableHead>Enviada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Revisión</TableHead>
                    <TableHead className="w-0"><span className="sr-only">Acción</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.filas.map((j) => (
                    <TableRow key={j.id} className={j.estado === "pendiente" ? "bg-tarde-fondo/40" : undefined}>
                      <TableCell className="whitespace-nowrap tabular-nums">{fechaCorta(j.fecha)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{j.alumno}</span>
                        <span className="block text-sm text-muted-foreground">{j.salon}</span>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="line-clamp-2 max-w-md" title={j.motivo}>{j.motivo}</p>
                        {j.adjuntoUrl && <span className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted-foreground"><Paperclip className="size-3.5" strokeWidth={2} aria-hidden /> Con adjunto</span>}
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">{fechaCorta(fechaLima(j.creada))}</span>
                        <span className="block text-sm text-muted-foreground">{j.apoderado}</span>
                      </TableCell>
                      <TableCell><EstadoPildora estado={j.estado} /></TableCell>
                      <TableCell>
                        {j.revisadoPor ? (
                          <>
                            <span>{j.revisadoPor}</span>
                            {j.revisadoAt && <span className="block text-sm text-muted-foreground tabular-nums">{fechaCorta(fechaLima(j.revisadoAt))}</span>}
                          </>
                        ) : (
                          <span className="text-muted-foreground" aria-label="Sin revisar">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <DetalleJustificacion
                          j={aDetalle(j)}
                          revisar={j.estado === "pendiente" ? revisarJustificacionAction.bind(null, slug, j.id) : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
          {resultado.paginas > 1 && <Paginas pagina={resultado.pagina} paginas={resultado.paginas} href={href} />}
        </>
      )}
    </section>
  );
}

function Paginas({ pagina, paginas, href }: { pagina: number; paginas: number; href: (n: number) => string }) {
  const numeros = Array.from({ length: paginas }, (_, i) => i + 1).filter((n) => n === 1 || n === paginas || Math.abs(n - pagina) <= 1);
  return (
    <Pagination aria-label="Paginación de justificaciones">
      <PaginationContent>
        {pagina > 1 && <PaginationItem><PaginationPrevious href={href(pagina - 1)} text="Anterior" /></PaginationItem>}
        {numeros.map((n) => <PaginationItem key={n}><PaginationLink href={href(n)} isActive={n === pagina}>{n}</PaginationLink></PaginationItem>)}
        {pagina < paginas && <PaginationItem><PaginationNext href={href(pagina + 1)} text="Siguiente" /></PaginationItem>}
      </PaginationContent>
    </Pagination>
  );
}

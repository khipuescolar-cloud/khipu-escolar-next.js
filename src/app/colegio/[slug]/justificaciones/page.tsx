import { Check, CircleAlert, Clock, FileText, History, Inbox, Paperclip, Search, X } from "lucide-react";
import { PestanasSegmento } from "@/components/shell/PestanasPagina";
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
import type { EstadoJustificacion } from "@/generated/prisma/enums";
import { fechaCorta, fechaLarga, fechaLima } from "@/lib/fechas";
import {
  contarPendientes, historialJustificaciones, listarJustificaciones, pendientesPorRevisar, POR_PAGINA_HISTORIAL, salonesDeJustificaciones,
  type HistorialJustificaciones, type JustificacionVista,
} from "@/lib/server/justificaciones";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";
import { cn } from "@/lib/utils";
import { revisarJustificacionAction } from "./actions";
import { RevisionJustificacion } from "./RevisionJustificacion";

export const metadata: Metadata = { title: "Justificaciones" };

const ESTADO: Record<EstadoJustificacion, { palabra: string; Icono: typeof Clock; clase: string }> = {
  pendiente: { palabra: "Pendiente", Icono: Clock, clase: "bg-tarde-fondo text-tarde" },
  aceptada: { palabra: "Aceptada", Icono: Check, clase: "bg-llego-fondo text-llego" },
  rechazada: { palabra: "No aceptada", Icono: CircleAlert, clase: "bg-falta-fondo text-falta" },
};

const RUTA = "/justificaciones";
const PARAMS_HISTORIAL = ["estado", "salon", "q", "desde", "hasta"] as const;

export default async function JustificacionesPage({ params, searchParams }: PageProps<"/colegio/[slug]/justificaciones">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug, ["profesor", "direccion", "apoderado"]);
  requireFeature(ctx, "justificaciones");

  // La familia ve una sola lista con sus justificaciones y su estado.
  if (ctx.rol === "apoderado") return <VistaFamilia lista={await listarJustificaciones(ctx)} />;

  const uno = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const vista = uno("vista") === "historial" ? "historial" : "revisar";
  const pendientes = await contarPendientes(ctx);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Justificaciones"
        seccion="dia"
        descripcion={vista === "revisar" ? "Faltas que las familias justificaron y esperan tu respuesta." : "Todas las justificaciones, con su estado y quién las revisó."}
      />
      <Pestanas vista={vista} pendientes={pendientes} />
      {vista === "revisar" ? <PorRevisar slug={slug} lista={await pendientesPorRevisar(ctx)} /> : <Historial ctx={ctx} uno={uno} />}
    </div>
  );
}

/** «Por revisar» | «Historial»: dos enlaces con la vista en la URL (`?vista=historial`). */
function Pestanas({ vista, pendientes }: { vista: "revisar" | "historial"; pendientes: number }) {
  const opciones = [
    { valor: "revisar" as const, texto: "Por revisar", Icono: Inbox, href: RUTA },
    { valor: "historial" as const, texto: "Historial", Icono: History, href: `${RUTA}?vista=historial` },
  ];
  return (
    <PestanasSegmento
      etiqueta="Vistas de justificaciones"
      className="-mt-2"
      items={opciones.map(({ valor, texto, Icono, href }) => ({
        href, texto, activo: vista === valor,
        icono: <Icono className={cn("size-4", vista === valor && "text-sec-trazo")} strokeWidth={2} aria-hidden />,
        insignia: valor === "revisar" && pendientes > 0 ? <span className="ml-0.5 rounded-pildora bg-tarde-fondo px-2 text-etiqueta text-tarde tabular-nums" aria-label={`${pendientes} pendientes`}>{pendientes}</span> : undefined,
      }))}
    />
  );
}

function EstadoPildora({ estado }: { estado: EstadoJustificacion }) {
  const { palabra, Icono, clase } = ESTADO[estado];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-etiqueta whitespace-nowrap ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden /> {palabra}
    </span>
  );
}

function Adjunto({ j, corto = false }: { j: JustificacionVista; corto?: boolean }) {
  if (!j.adjuntoUrl) return null;
  const tipo = j.adjuntoMime === "application/pdf" ? "PDF" : "imagen";
  return (
    <a href={j.adjuntoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 w-fit items-center gap-1.5 text-cuerpo-sm enlace">
      <Paperclip className="size-4" strokeWidth={2} aria-hidden /> {corto ? tipo : `Ver adjunto (${tipo})`}
    </a>
  );
}

/** Fila de una justificación: datos, motivo, adjunto, revisión y, si está pendiente y la ve quien revisa, Aceptar/Rechazar. */
function FilaJustificacion({ j, slug, revisa }: { j: JustificacionVista; slug?: string; revisa: boolean }) {
  return (
    <div className="flex flex-col gap-3 py-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-cuerpo font-semibold">
              {j.alumno} <span className="font-sans font-normal text-muted-foreground">· {j.salon}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Falta del <span>{fechaLarga(j.fecha)}</span>
              {revisa && ` · enviada por ${j.apoderado} el ${fechaCorta(fechaLima(j.creada))}`}
            </p>
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
        {revisa && slug && j.estado === "pendiente" && (
          <RevisionJustificacion revisar={revisarJustificacionAction.bind(null, slug, j.id)} alumno={j.alumno} />
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
          {lista.map((j) => <li key={j.id}><FilaJustificacion j={j} revisa={false} /></li>)}
        </ul>
      )}
    </div>
  );
}

/** Bandeja de pendientes: la más antigua primero, cada una con Aceptar/Rechazar. */
function PorRevisar({ slug, lista }: { slug: string; lista: JustificacionVista[] }) {
  if (lista.length === 0) {
    return (
      <EstadoVacio
        icono={Inbox}
        titulo="No hay justificaciones por revisar"
        descripcion="Cuando una familia justifique una falta, la verás aquí. Las ya revisadas están en el historial."
        accion={<Link href={`${RUTA}?vista=historial`} className={buttonVariants({ variant: "outline" })}><History className="size-4" strokeWidth={2} aria-hidden /> Ver historial</Link>}
      />
    );
  }
  return (
    <section aria-label="Por revisar" className="flex flex-col gap-3">
      <p className="text-cuerpo-sm text-muted-foreground">
        {lista.length} {lista.length === 1 ? "justificación espera" : "justificaciones esperan"} tu respuesta, de la más antigua a la más reciente.
      </p>
      <ul className="flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil">
        {lista.map((j) => <li key={j.id}><FilaJustificacion j={j} slug={slug} revisa /></li>)}
      </ul>
    </section>
  );
}

async function Historial({ ctx, uno }: { ctx: Parameters<typeof historialJustificaciones>[0]; uno: (k: string) => string | undefined }) {
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
  const conFiltro = PARAMS_HISTORIAL.some((k) => uno(k));
  const href = (pagina: number) => {
    const q = new URLSearchParams({ vista: "historial" });
    for (const k of PARAMS_HISTORIAL) if (uno(k)) q.set(k, uno(k)!);
    if (pagina > 1) q.set("pagina", String(pagina));
    return `${RUTA}?${q.toString()}`;
  };

  return (
    <section aria-label="Historial" className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-borde-sutil bg-superficie p-4">
          <form method="get" action={RUTA} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            <input type="hidden" name="vista" value="historial" />
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
                <Link href={`${RUTA}?vista=historial`} className={buttonVariants({ variant: "ghost" })}>
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
          <div className="overflow-hidden rounded-[14px] border border-borde-sutil bg-superficie">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Falta</TableHead>
                    <TableHead>Alumno</TableHead>
                    <TableHead className="min-w-64">Motivo</TableHead>
                    <TableHead>Enviada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Revisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultado.filas.map((j) => (
                    <TableRow key={j.id} className="align-top">
                      <TableCell className="whitespace-nowrap tabular-nums">{fechaCorta(j.fecha)}</TableCell>
                      <TableCell>
                        <span className="font-medium">{j.alumno}</span>
                        <span className="block text-sm text-muted-foreground">{j.salon}</span>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="line-clamp-3 max-w-md" title={j.motivo}>{j.motivo}</p>
                        <Adjunto j={j} corto />
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums">{fechaCorta(fechaLima(j.creada))}</span>
                        <span className="block text-sm text-muted-foreground">{j.apoderado}</span>
                      </TableCell>
                      <TableCell><EstadoPildora estado={j.estado} /></TableCell>
                      <TableCell className="whitespace-normal">
                        {j.revisadoPor ? (
                          <>
                            <span>{j.revisadoPor}</span>
                            {j.revisadoAt && <span className="block text-sm text-muted-foreground tabular-nums">{fechaCorta(fechaLima(j.revisadoAt))}</span>}
                            {j.comentarioRevision && <p className="mt-1 line-clamp-2 max-w-xs text-sm text-muted-foreground" title={j.comentarioRevision}>«{j.comentarioRevision}»</p>}
                          </>
                        ) : j.estado === "pendiente" ? (
                          <Link href={RUTA} className="enlace text-sm">Revisar</Link>
                        ) : null}
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
    <Pagination aria-label="Paginación del historial">
      <PaginationContent>
        {pagina > 1 && <PaginationItem><PaginationPrevious href={href(pagina - 1)} text="Anterior" /></PaginationItem>}
        {numeros.map((n) => <PaginationItem key={n}><PaginationLink href={href(n)} isActive={n === pagina}>{n}</PaginationLink></PaginationItem>)}
        {pagina < paginas && <PaginationItem><PaginationNext href={href(pagina + 1)} text="Siguiente" /></PaginationItem>}
      </PaginationContent>
    </Pagination>
  );
}

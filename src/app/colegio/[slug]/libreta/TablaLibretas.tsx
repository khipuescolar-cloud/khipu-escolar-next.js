"use client";

import { CheckCircle2, Clock, Download, FileText, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Calificacion } from "@/components/Calificacion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Boton } from "@/components/ui/Boton";
import { buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fechaLima } from "@/lib/fechas";
import { ETIQUETA_LITERAL, LITERALES } from "@/lib/calificaciones";
import type { ResumenLibretasSalon } from "@/lib/server/libreta";
import { abrirDocumentoLibretaAction, resolverRectificacionAction } from "./actions";
import { DocumentoLibreta } from "./DocumentoLibreta";

type DocumentoAbierto = Awaited<ReturnType<typeof abrirDocumentoLibretaAction>>;

export function TablaLibretas({ resumen, slug, alumnoInicial }: { resumen: ResumenLibretasSalon; slug: string; alumnoInicial?: string }) {
  const [abierto, setAbierto] = useState(Boolean(alumnoInicial));
  const [alumnoId, setAlumnoId] = useState<string | null>(alumnoInicial ?? null);
  const [documento, setDocumento] = useState<DocumentoAbierto | null>(null);
  const [cargando, setCargando] = useState(Boolean(alumnoInicial));
  const [error, setError] = useState(false);
  const cargar = useCallback(async (id: string) => {
    setAlumnoId(id);
    setAbierto(true);
    setDocumento(null);
    setCargando(true);
    setError(false);
    try { setDocumento(await abrirDocumentoLibretaAction(slug, id, resumen.periodo.id)); }
    catch { setError(true); }
    finally { setCargando(false); }
  }, [slug, resumen.periodo.id]);
  const pedidoInicial = useRef<string | null>(null);
  const inicialValido = Boolean(alumnoInicial && resumen.alumnos.some((a) => a.id === alumnoInicial));
  useEffect(() => {
    if (!alumnoInicial || !inicialValido || pedidoInicial.current === alumnoInicial + resumen.periodo.id) return;
    pedidoInicial.current = alumnoInicial + resumen.periodo.id;
    void abrirDocumentoLibretaAction(slug, alumnoInicial, resumen.periodo.id).then((datos) => {
      setAlumnoId(alumnoInicial); setDocumento(datos); setAbierto(true); setCargando(false);
    }).catch(() => { setError(true); setCargando(false); });
  }, [alumnoInicial, inicialValido, slug, resumen.periodo.id]);
  const cursos = resumen.cursos.filter((c) => c.competencias.length > 0);
  const indice = resumen.alumnos.findIndex((a) => a.id === alumnoId);
  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-borde-sutil" role="region" aria-label="Libretas del salón por curso y competencia" tabIndex={0}>
        <table className="w-max min-w-full border-collapse text-sm tabular-nums">
          <caption className="sr-only">Calificaciones del periodo de cada alumno y acceso a su libreta</caption>
          <thead>
            <tr className="bg-superficie-2">
              <th rowSpan={2} scope="col" className="sticky left-0 z-20 w-32 min-w-32 border-r border-b border-borde-sutil bg-superficie-2 px-3 text-left sm:w-auto sm:min-w-56">Alumno</th>
              {cursos.map((c) => <th key={c.id} colSpan={c.competencias.length} scope="colgroup" className="border-r border-b border-borde-sutil px-3 py-2 text-left font-semibold">{c.nombre}</th>)}
              <th rowSpan={2} scope="col" className="sticky right-0 z-20 min-w-40 border-l border-b border-borde-sutil bg-superficie-2 px-3 text-left">Documento</th>
            </tr>
            <tr className="bg-superficie-2">{cursos.flatMap((c) => c.competencias.map((k) => <th key={k.id} scope="col" className="w-32 min-w-32 max-w-40 border-r border-b border-borde-sutil px-3 py-1.5 text-left text-xs font-medium text-muted-foreground"><span className="line-clamp-3 text-pretty" title={k.nombre}>{k.nombre}</span></th>))}</tr>
          </thead>
          <tbody>{resumen.alumnos.map((a) => (
            <tr key={a.id} className="hover:bg-accent/40">
              <th scope="row" className="sticky left-0 z-10 w-32 min-w-32 border-r border-b border-borde-sutil bg-superficie px-3 py-2 text-left text-pretty font-medium sm:w-auto sm:min-w-56">{a.nombre}</th>
              {cursos.flatMap((c) => c.competencias.map((k) => <td key={k.id} className="border-r border-b border-borde-sutil px-2 py-2 text-center">{a.calificaciones[k.id] ? <Calificacion valor={a.calificaciones[k.id]} compacta /> : <span className="text-muted-foreground">Sin calificar</span>}</td>))}
              <td className="sticky right-0 z-10 border-l border-b border-borde-sutil bg-superficie px-3 py-2">
                <div className="flex flex-col items-start gap-1">
                  <Boton type="button" variante="secundario" tamano="sm" onClick={() => void cargar(a.id)} aria-label={"Ver documento de " + a.nombre}><FileText className="size-4" strokeWidth={2} aria-hidden />Ver documento</Boton>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">{a.version ? <><CheckCircle2 className="size-3.5" strokeWidth={2} aria-hidden />Emitida v{a.version}</> : <><Clock className="size-3.5" strokeWidth={2} aria-hidden />Borrador en curso</>}</span>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {resumen.escala === "literal" && <p className="text-cuerpo-sm text-muted-foreground" aria-label="Escala literal de calificación"><span className="font-medium">Escala:</span> {LITERALES.map((l) => l + " · " + ETIQUETA_LITERAL[l]).join("  |  ")}</p>}
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent showCloseButton={false} className="z-[60] inset-0 top-0 left-0 h-dvh max-h-dvh w-full max-w-none translate-x-0 translate-y-0 rounded-none p-0 sm:top-1/2 sm:left-1/2 sm:h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
          <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-borde-sutil bg-popover px-4 py-3 sm:px-6">
            <DialogHeader className="min-w-0">
              <DialogTitle>Libreta de {resumen.alumnos[indice]?.nombre ?? "alumno"}</DialogTitle>
              <DialogDescription>{resumen.periodo.nombre} {resumen.periodo.anio}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {alumnoId && <a href={"/api/libreta/" + alumnoId + "?periodo=" + resumen.periodo.id} className={buttonVariants({ variant: "outline", size: "sm" })}><Download className="size-4" strokeWidth={2} aria-hidden />Descargar PDF</a>}
              <DialogClose render={<Boton type="button" variante="secundario" tamano="sm" />}>Cerrar</DialogClose>
            </div>
          </div>
          <div className="space-y-6 px-3 pb-6 sm:px-6">
            {cargando && <p className="flex items-center gap-2 py-12 text-muted-foreground" role="status"><Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />Cargando libreta…</p>}
            {error && <p role="alert" className="py-12 text-falta">No se pudo abrir la libreta. Vuelve a intentarlo.</p>}
            {documento && <><DocumentoLibreta datos={documento.datos} slug={slug} /><RectificacionesDocumento documento={documento} slug={slug} refrescar={() => alumnoId && cargar(alumnoId)} /></>}
            {resumen.alumnos.length > 1 && <nav aria-label="Navegar entre alumnos" className="flex justify-between gap-3"><Boton type="button" variante="secundario" disabled={indice <= 0 || cargando} onClick={() => void cargar(resumen.alumnos[indice - 1].id)}>Anterior alumno</Boton><Boton type="button" variante="secundario" disabled={indice < 0 || indice >= resumen.alumnos.length - 1 || cargando} onClick={() => void cargar(resumen.alumnos[indice + 1].id)}>Siguiente alumno</Boton></nav>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RectificacionesDocumento({ documento, slug, refrescar }: { documento: DocumentoAbierto; slug: string; refrescar: () => void }) {
  const datos = documento.datos;
  if (!datos.emision || !documento.esDireccion) return null;
  return <section aria-labelledby="rectificaciones" className="space-y-3">
    <h3 id="rectificaciones" className="font-heading text-base font-semibold">Rectificaciones</h3>
    <p className="text-cuerpo-sm text-muted-foreground">La libreta emitida no se edita. El profesor del curso pide la rectificación desde «Calificación del periodo»; al aprobarla se crea una versión nueva y se conserva la anterior.</p>
    <div className="rounded-[14px] border border-borde-sutil bg-superficie px-4">
      {documento.rectificaciones.length ? <ul className="divide-y divide-borde-sutil">{documento.rectificaciones.map((r) => {
        const estado = { pendiente: { Icono: Clock, texto: "Pendiente" }, aprobada: { Icono: CheckCircle2, texto: "Aprobada" }, rechazada: { Icono: XCircle, texto: "Rechazada" } }[r.estado];
        return <li key={r.id} className="space-y-1 py-4 text-sm">
          <p className="font-medium">{r.curso} · {r.competencia} · {r.anterior ?? "sin calificar"} → {r.nuevo}</p>
          <p className="flex items-center gap-1 text-muted-foreground"><estado.Icono className="size-4" strokeWidth={2} aria-hidden />{estado.texto}{r.version && " · versión " + r.version}</p>
          <p>Motivo: {r.motivo}{r.evidencia ? " · Evidencia: " + r.evidencia : ""}</p>
          <p className="text-cuerpo-sm text-muted-foreground">Pidió {r.solicitadaPor} el {fechaLima(r.solicitadaAt)}{r.resueltaPor && r.resueltaAt && " · resolvió " + r.resueltaPor + " el " + fechaLima(r.resueltaAt)}</p>
          {r.estado === "pendiente" && <div className="flex flex-wrap gap-2 pt-2">
            <BotonConfirmar etiqueta="Aprobar" variante="default" titulo="¿Aprobar la rectificación?" descripcion="Se emite una versión nueva y se avisa a la familia. La anterior se conserva." confirmar="Aprobar y emitir" accion={async () => { const resultado = await resolverRectificacionAction(slug, r.id, "aprobada"); if (resultado.ok) refrescar(); return resultado; }} />
            <BotonConfirmar etiqueta="Rechazar" variante="outline" titulo="¿Rechazar la rectificación?" descripcion="La libreta emitida no cambia." confirmar="Rechazar" accion={async () => { const resultado = await resolverRectificacionAction(slug, r.id, "rechazada"); if (resultado.ok) refrescar(); return resultado; }} />
          </div>}
        </li>;
      })}</ul> : <p className="py-4 text-cuerpo-sm text-muted-foreground">Todavía no hay rectificaciones de esta libreta.</p>}
    </div>
  </section>;
}

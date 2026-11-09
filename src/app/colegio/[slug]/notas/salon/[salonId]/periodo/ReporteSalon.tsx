"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, MessageSquareText, Send, Undo2 } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { solicitarReportesPeriodoAction } from "./actions";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatearNumero } from "@/lib/calificaciones";
import type { ReporteSalonPeriodo } from "@/lib/server/calificacion-periodo";

const fechaCorta = (iso: string) => new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", timeZone: "America/Lima" }).format(new Date(iso));

/** Reporte del periodo de un salón para su tutor (y dirección): alumnos en filas, curso y competencia en columnas. */
export function ReporteSalon({ reporte, slug, puedeSolicitar, destinatarios }: { reporte: ReporteSalonPeriodo; slug: string; puedeSolicitar: boolean; destinatarios: { profesor: string; cursos: string[] }[] }) {
  const [abierto, setAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState("");
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();
  const { salon, periodo, cursos, alumnos } = reporte;
  const conCompetencias = cursos.filter((c) => c.competencias.length > 0);
  const enviados = cursos.filter((c) => c.enviado).length;
  const valores = new Map(reporte.calificaciones.map((g) => [`${g.alumnoId}:${g.competenciaId}`, g]));
  function enviar() {
    if (!periodo) return;
    setError("");
    iniciar(async () => {
      const r = await solicitarReportesPeriodoAction(slug, { salonId: salon.id, periodoId: periodo.id, titulo, descripcion });
      if (!r.ok) { setError(r.error); return; }
      setAbierto(false);
      toast.success(`Solicitud enviada a ${r.enviados} ${r.enviados === 1 ? "profesor" : "profesores"}`);
      router.refresh();
    });
  }
  return (
    <div className="space-y-5">
      <EncabezadoPagina
        seccion="academico"
        titulo={`Reporte del periodo · ${salon.nombre}`}
        descripcion={`${periodo ? periodo.nombre : "Sin periodo"}${salon.tutor ? ` · Tutor: ${salon.tutor}` : ""}. Solo se muestran las calificaciones de los cursos que su profesor ya envió.`}
        acciones={<Link href="/notas" className={buttonVariants({ variant: "outline" })}><Undo2 aria-hidden />Volver a Registro de notas</Link>}
      />
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Solicitar reportes periódicos</DialogTitle><DialogDescription>Se avisará a los profesores con cursos pendientes de este salón.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><label htmlFor="titulo-solicitud" className="text-sm font-medium">Título</label><Input id="titulo-solicitud" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={150} required /></div>
            <div className="space-y-1.5"><label htmlFor="descripcion-solicitud" className="text-sm font-medium">Descripción <span className="text-muted-foreground">(Opcional)</span></label><Textarea id="descripcion-solicitud" value={descripcion} onChange={e => setDescripcion(e.target.value)} maxLength={1000} /></div>
            <div><p className="text-sm font-medium">Destinatarios</p><ul className="mt-1 max-h-36 space-y-1 overflow-y-auto text-sm text-muted-foreground">{destinatarios.map((d, i) => <li key={i} className="break-words">{d.profesor} · {d.cursos.join(", ")}</li>)}</ul>{destinatarios.length === 0 && <p className="text-sm text-muted-foreground">No hay profesores con cursos pendientes.</p>}</div>
            {error && <Alerta tipo="error">{error}</Alerta>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAbierto(false)} disabled={pendiente}>Cancelar</Button><Button onClick={enviar} disabled={pendiente || !titulo.trim() || destinatarios.length === 0}><Send aria-hidden />{pendiente ? "Enviando…" : "Enviar solicitud"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {!periodo ? (
        <Alerta tipo="info">Todavía no hay periodos para el nivel de este salón.</Alerta>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <span className="text-sm font-medium" id="periodo-etiqueta">Periodo</span>
              <Select value={periodo.id} onValueChange={(v) => router.push(`/notas/salon/${salon.id}/periodo?periodo=${v}`)} items={Object.fromEntries(reporte.periodos.map((p) => [p.id, p.nombre]))}>
                <SelectTrigger aria-labelledby="periodo-etiqueta" className="w-72"><SelectValue /></SelectTrigger>
                <SelectContent>{reporte.periodos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm tabular-nums"><strong>{enviados}</strong> de {cursos.length} cursos enviados</p>
              {puedeSolicitar && enviados < cursos.length && <Button variant="outline" onClick={() => { setTitulo("Solicitud de reportes periódicos · " + periodo.nombre); setDescripcion(""); setError(""); setAbierto(true); }}><Send aria-hidden />Solicitar reportes</Button>}
            </div>
          </div>
          {cursos.length === 0 ? (
            <Alerta tipo="info">Este salón todavía no tiene cursos.</Alerta>
          ) : (
            <>
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Estado por curso">
                {cursos.map((c) => (
                  <li key={c.id} className="flex items-start gap-2.5 rounded-md border border-borde-sutil bg-superficie p-3 text-sm">
                    {c.enviado ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-llego" strokeWidth={2} aria-hidden /> : <Clock className="mt-0.5 size-4 shrink-0 text-tarde" strokeWidth={2} aria-hidden />}
                    <div className="min-w-0">
                      <p className="font-medium">{c.nombre}</p>
                      <p className={c.enviado ? "text-llego" : "text-tarde"}>
                        {c.enviado ? `Enviado por ${c.enviado.por} el ${fechaCorta(c.enviado.en)}` : `Pendiente${c.profesor ? ` · ${c.profesor}` : ""}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="overflow-x-auto rounded-lg border border-borde-sutil" role="region" aria-label="Calificaciones del periodo por curso y competencia" tabIndex={0}>
                <table className="w-max min-w-full border-collapse text-sm tabular-nums">
                  <thead>
                    <tr className="bg-superficie-2">
                      <th rowSpan={2} scope="col" className="sticky left-0 z-20 w-32 min-w-32 border-r border-b bg-superficie-2 px-3 text-left sm:w-auto sm:min-w-56">Alumno</th>
                      {conCompetencias.map((c) => (
                        <th key={c.id} colSpan={c.competencias.length} scope="colgroup" className="border-r border-b px-3 py-2 text-left align-top">
                          <span className="font-semibold">{c.nombre}</span>
                          <span className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${c.enviado ? "text-llego" : "text-tarde"}`}>
                            {c.enviado ? <CheckCircle2 className="size-3.5" strokeWidth={2} aria-hidden /> : <Clock className="size-3.5" strokeWidth={2} aria-hidden />}
                            {c.enviado ? `Enviado el ${fechaCorta(c.enviado.en)}` : "Pendiente"}
                          </span>
                        </th>
                      ))}
                    </tr>
                    <tr className="bg-superficie-2">
                      {conCompetencias.flatMap((c) => c.competencias.map((k) => (
                        <th key={k.id} scope="col" className="w-32 min-w-32 max-w-40 border-r border-b px-3 py-1.5 text-left text-xs font-medium text-muted-foreground"><span className="line-clamp-3 text-pretty" title={k.nombre}>{k.nombre}</span></th>
                      )))}
                    </tr>
                  </thead>
                  <tbody>
                    {alumnos.map((a) => (
                      <tr key={a.id} className="hover:bg-accent/40">
                        <th scope="row" className="sticky left-0 z-10 w-32 min-w-32 border-r border-b bg-superficie px-3 py-1 text-left text-pretty font-medium sm:w-auto sm:min-w-56">{a.nombre}</th>
                        {conCompetencias.flatMap((c) => c.competencias.map((k) => {
                          const g = c.enviado ? valores.get(`${a.id}:${k.id}`) : undefined;
                          const valor = g ? (g.valorLiteral ?? (g.valorNumerico === null ? "" : formatearNumero(g.valorNumerico))) : "";
                          return (
                            <td key={k.id} className="border-r border-b px-2 py-1 text-center">
                              {!c.enviado ? (
                                <span className="inline-flex min-h-11 items-center gap-1 text-xs text-tarde"><Clock className="size-3.5" strokeWidth={2} aria-hidden />Pendiente</span>
                              ) : valor ? (
                                <span className="inline-flex min-h-11 items-center gap-1 font-semibold">
                                  {valor}
                                  {g?.conclusion && (
                                    <Popover>
                                      <PopoverTrigger aria-label={`Conclusión de ${a.nombre} en ${k.nombre}`} className="inline-flex size-9 items-center justify-center rounded-md text-primary outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30">
                                        <MessageSquareText className="size-4" strokeWidth={2} aria-hidden />
                                      </PopoverTrigger>
                                      <PopoverContent className="w-80">
                                        <PopoverTitle>Conclusión descriptiva</PopoverTitle>
                                        <PopoverDescription>{a.nombre} · {k.nombre}</PopoverDescription>
                                        <p className="text-sm text-foreground">{g.conclusion}</p>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex min-h-11 items-center text-muted-foreground" aria-label="Sin calificar">—</span>
                              )}
                            </td>
                          );
                        }))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

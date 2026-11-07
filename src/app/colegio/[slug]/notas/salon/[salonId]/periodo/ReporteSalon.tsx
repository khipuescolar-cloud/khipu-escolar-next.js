"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, MessageSquareText, Undo2 } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatearNumero } from "@/lib/calificaciones";
import type { ReporteSalonPeriodo } from "@/lib/server/calificacion-periodo";

const fechaCorta = (iso: string) => new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", timeZone: "America/Lima" }).format(new Date(iso));

/** Reporte del periodo de un salón para su tutor (y dirección): alumnos en filas, curso y competencia en columnas. */
export function ReporteSalon({ reporte }: { reporte: ReporteSalonPeriodo }) {
  const router = useRouter();
  const { salon, periodo, cursos, alumnos } = reporte;
  const conCompetencias = cursos.filter((c) => c.competencias.length > 0);
  const enviados = cursos.filter((c) => c.enviado).length;
  const valores = new Map(reporte.calificaciones.map((g) => [`${g.alumnoId}:${g.competenciaId}`, g]));
  return (
    <div className="space-y-5">
      <EncabezadoPagina
        seccion="academico"
        titulo={`Reporte del periodo · ${salon.nombre}`}
        descripcion={`${periodo ? periodo.nombre : "Sin periodo"}${salon.tutor ? ` · Tutor: ${salon.tutor}` : ""}. Solo se muestran las calificaciones de los cursos que su profesor ya envió.`}
        acciones={<Link href="/notas" className={buttonVariants({ variant: "outline" })}><Undo2 aria-hidden />Volver a Registro de notas</Link>}
      />
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
            <p className="text-sm tabular-nums"><strong>{enviados}</strong> de {cursos.length} cursos enviados</p>
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

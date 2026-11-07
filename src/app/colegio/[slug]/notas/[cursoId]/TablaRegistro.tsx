"use client";
import { useMemo } from "react";
import { ClipboardList, MessageSquareText, PenLine } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CeldaObservacion } from "./DialogoObservacion";
import { describirNsp, type CeldaNsp } from "./DialogoNsp";
import { Elegir, fechaCorta, origenDe, opcionesDeNota, valorDe, type Datos, type Evaluacion } from "./comun";

type Bloque = { id: string; nombre: string; evaluaciones: Evaluacion[] };

export function agruparPorCompetencia(datos: Datos): Bloque[] {
  const mapa = new Map<string, Omit<Bloque, "id">>();
  for (const c of datos.competencias) mapa.set(c.id, { nombre: c.nombre, evaluaciones: [] });
  for (const e of datos.evaluaciones) {
    const k = e.competenciaId ?? "sin";
    if (!mapa.has(k)) mapa.set(k, { nombre: e.competencia?.nombre ?? "Sin competencia", evaluaciones: [] });
    mapa.get(k)!.evaluaciones.push(e);
  }
  return [...mapa.entries()].map(([id, b]) => ({ id, ...b }));
}

export function TablaRegistro({ datos, valores, editando, ocupado, resaltar, onDetalle, onEditar, onCambio, onObservacion, onNsp }: {
  datos: Datos;
  valores: Record<string, string>;
  editando: string | null;
  ocupado: boolean;
  resaltar: string | null;
  onDetalle: (e: Evaluacion) => void;
  onEditar: (clave: string | null) => void;
  onCambio: (e: Evaluacion, alumnoId: string, previo: string, nuevo: string) => void;
  onObservacion: (c: CeldaObservacion) => void;
  onNsp: (c: CeldaNsp) => void;
}) {
  const bloques = useMemo(() => agruparPorCompetencia(datos), [datos]);
  const conNotas = bloques.filter((b) => b.evaluaciones.length);
  const vacios = bloques.filter((b) => !b.evaluaciones.length);
  const columnas = conNotas.flatMap((b) => b.evaluaciones);
  const opciones = opcionesDeNota(datos.escala);

  const moverFoco = (ev: React.KeyboardEvent<HTMLTableElement>) => {
    const target = ev.target;
    if (!(target instanceof HTMLButtonElement) || !target.dataset.celda) return;
    const delta = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[ev.key];
    if (!delta) return;
    ev.preventDefault();
    const fila = Number(target.dataset.row) + delta[0];
    const columna = Number(target.dataset.col) + delta[1];
    ev.currentTarget.querySelector<HTMLButtonElement>(`[data-celda][data-row="${fila}"][data-col="${columna}"]`)?.focus();
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-borde-sutil" role="region" aria-label="Calificaciones por competencia" tabIndex={0}>
        <table className="w-max min-w-full border-collapse text-sm tabular-nums" onKeyDown={moverFoco}>
          <thead>
            <tr className="bg-superficie-2">
              <th rowSpan={2} scope="col" className="sticky left-0 z-20 min-w-40 sm:min-w-56 border-r border-b bg-superficie-2 px-3 text-left">Alumno</th>
              {conNotas.map((b) => (
                <th key={b.id} colSpan={b.evaluaciones.length} scope="colgroup" className="min-w-40 border-r border-b px-3 py-2 text-left align-top font-semibold">
                  <span className="line-clamp-2 text-pretty" title={b.nombre}>{b.nombre}</span>
                </th>
              ))}
            </tr>
            <tr className="bg-superficie-2">
              {columnas.map((e) => (
                <th key={e.id} scope="col" className={`w-32 min-w-32 max-w-32 border-r border-b p-0 text-left font-medium ${resaltar === e.id ? "bg-accent" : ""}`}>
                  <button className="flex min-h-16 w-full flex-col justify-center px-3 text-left focus-visible:outline-2 focus-visible:outline-ring" onClick={() => onDetalle(e)} title={e.titulo}>
                    <span className="block w-full truncate">{e.titulo}</span>
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      {e.tareaId ? <ClipboardList className="size-3 shrink-0" aria-hidden /> : <PenLine className="size-3 shrink-0" aria-hidden />}
                      {origenDe(e)}
                    </span>
                    <span className="text-xs whitespace-nowrap text-muted-foreground">{fechaCorta(e.fecha)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datos.alumnos.map((a, fila) => (
              <tr key={a.id} className="hover:bg-accent/40">
                <th scope="row" className="sticky left-0 z-10 border-r border-b bg-superficie px-3 text-left font-medium">{a.apellidos}, {a.nombres}</th>
                {columnas.map((e, columna) => {
                  const n = e.notas.find((x) => x.alumnoId === a.id);
                  const clave = `${e.id}:${a.id}`;
                  const actual = valores[clave] ?? valorDe(n);
                  const abrirObservacion = () => onObservacion({ evaluacionId: e.id, alumnoId: a.id, alumno: `${a.apellidos}, ${a.nombres}`, actividad: e.titulo, observacion: n?.comentario ?? "", visible: !!n?.comentario && !n.comentarioPrivado });
                  const esNsp = n?.marca === "nsp";
                  const estadoNsp = datos.estadosNsp[clave];
                  const infoNsp = esNsp || n?.fechaRecuperacion ? describirNsp(estadoNsp, valorDe(n)) : null;
                  const abrirNsp = () => onNsp({ evaluacionId: e.id, alumnoId: a.id });
                  return (
                    <td key={e.id} className={`border-r border-b text-center ${resaltar === e.id ? "bg-accent/50" : ""}`}>
                      {esNsp && infoNsp ? (
                        <Tooltip>
                          <TooltipTrigger render={<button type="button" data-celda data-row={fila} data-col={columna} onClick={abrirNsp} aria-label={`${a.nombres}, ${e.titulo}: NSP, ${infoNsp.corto}`} className="flex min-h-11 w-full flex-col items-center justify-center px-1 py-1 focus-visible:outline-2 focus-visible:outline-ring" />}>
                            <span className="font-semibold text-falta">NSP</span>
                            <span className={`flex items-center justify-center gap-1 text-center text-xs leading-tight ${infoNsp.tono}`}><infoNsp.icono className="size-3 shrink-0" aria-hidden />{infoNsp.corto}</span>
                          </TooltipTrigger>
                          <TooltipContent>No se presentó · {infoNsp.largo}</TooltipContent>
                        </Tooltip>
                      ) : editando === clave ? (
                        <div className="flex flex-col items-center gap-1 py-1">
                          <Elegir value={actual || "pendiente"} onChange={(v) => onCambio(e, a.id, valorDe(n), v === "pendiente" ? "" : v)} opciones={opciones} etiqueta={`Nota de ${a.nombres} en ${e.titulo}`} className="w-28" />
                          {n && <button type="button" onClick={abrirObservacion} className="flex min-h-11 items-center gap-1 rounded-md px-2 text-xs underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"><MessageSquareText className="size-3.5" aria-hidden />{n.comentario ? "Editar observación" : "Agregar observación"}<span className="sr-only"> de {a.nombres} en {e.titulo}</span></button>}
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <button
                            data-celda data-row={fila} data-col={columna}
                            disabled={!datos.puedeEditar || ocupado}
                            onClick={() => onEditar(clave)}
                            className="min-h-11 flex-1 px-2 font-semibold focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-default"
                            aria-label={`${a.nombres}, ${e.titulo}: ${actual || "pendiente"}`}
                          >
                            {actual || <span className="font-normal text-muted-foreground/60" aria-hidden>—</span>}
                          </button>
                          {infoNsp && !esNsp && (
                            <Tooltip>
                              <TooltipTrigger render={<button type="button" onClick={abrirNsp} aria-label={`Recuperación de ${a.nombres} en ${e.titulo}`} className="grid min-h-11 min-w-9 place-items-center text-llego focus-visible:outline-2 focus-visible:outline-ring" />}>
                                <infoNsp.icono className="size-4" aria-hidden />
                              </TooltipTrigger>
                              <TooltipContent>{infoNsp.corto} · {infoNsp.largo}</TooltipContent>
                            </Tooltip>
                          )}
                          {n?.comentario && (
                            <Tooltip>
                              <TooltipTrigger render={<button type="button" onClick={abrirObservacion} aria-label={`Observación de ${a.nombres} en ${e.titulo}${n.comentarioPrivado ? " (privada)" : ""}`} className="grid min-h-11 min-w-9 place-items-center text-primary focus-visible:outline-2 focus-visible:outline-ring" />}>
                                <MessageSquareText className="size-4" aria-hidden />
                              </TooltipTrigger>
                              <TooltipContent>{n.comentarioPrivado ? "Privada · " : "Visible para la familia · "}{n.comentario.length > 140 ? `${n.comentario.slice(0, 140)}…` : n.comentario}</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {vacios.length > 0 && <p className="text-sm text-muted-foreground">Sin calificaciones: {vacios.map((b) => b.nombre).join(" · ")}</p>}
    </>
  );
}

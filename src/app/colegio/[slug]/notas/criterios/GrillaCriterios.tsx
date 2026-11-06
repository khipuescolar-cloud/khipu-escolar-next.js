"use client";

import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { formatearNumero } from "@/lib/calificaciones";
import { cn } from "@/lib/utils";
import { guardarResultadoCriterioAction } from "../actions";

type Estado = { fase: "guardando" } | { fase: "guardado" } | { fase: "error"; mensaje: string };
type Criterio = { id: string; descripcion: string; escala: "puntaje" | "cumple"; puntajeMaximo: number | null };
type ResultadoAlumno = { criterioId: string; alumnoId: string; puntaje: number | null; cumple: boolean | null };

const texto = (r: ResultadoAlumno) => (r.cumple !== null ? (r.cumple ? "si" : "no") : r.puntaje !== null ? formatearNumero(r.puntaje).replace(",", ".") : "");

/**
 * Resultados por criterio (alumnos × criterios). Cada celda se guarda sola. Al final, los totales tal cual (puntos
 * obtenidos de los posibles y criterios cumplidos): son referencia, no una nota.
 */
export function GrillaCriterios({ slug, editable, alumnos, criterios, resultados }: {
  slug: string; editable: boolean;
  alumnos: { id: string; nombres: string; apellidos: string }[];
  criterios: Criterio[];
  resultados: ResultadoAlumno[];
}) {
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(resultados.map((r) => [`${r.criterioId}:${r.alumnoId}`, texto(r)])));
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const puntaje = criterios.filter((c) => c.escala === "puntaje");
  const cotejo = criterios.filter((c) => c.escala === "cumple");
  const posibles = puntaje.reduce((s, c) => s + (c.puntajeMaximo ?? 0), 0);

  async function guardar(criterioId: string, alumnoId: string, valor: string) {
    const clave = `${criterioId}:${alumnoId}`;
    setEstados((e) => ({ ...e, [clave]: { fase: "guardando" } }));
    const r = await guardarResultadoCriterioAction(slug, criterioId, alumnoId, valor);
    setEstados((e) => ({ ...e, [clave]: r.ok ? { fase: "guardado" } : { fase: "error", mensaje: r.error } }));
  }

  function totales(alumnoId: string) {
    let puntos = 0;
    let conPuntaje = 0;
    for (const c of puntaje) {
      const v = valores[`${c.id}:${alumnoId}`];
      if (v) { puntos += Number(v.replace(",", ".")) || 0; conPuntaje++; }
    }
    const cumple = cotejo.filter((c) => valores[`${c.id}:${alumnoId}`] === "si").length;
    return { puntos, conPuntaje, cumple };
  }

  return (
    <div className="overflow-x-auto rounded-[14px] border border-borde-sutil bg-card">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="bg-sec-suave text-left text-sec-tinta">
          <tr>
            <th scope="col" className="sticky left-0 z-10 min-w-44 border-r bg-sec-suave px-3 py-2.5 font-semibold">Alumno</th>
            {criterios.map((c, i) => (
              <th key={c.id} scope="col" className="max-w-56 min-w-36 px-3 py-2.5 align-bottom font-semibold">
                <span className="line-clamp-3">{i + 1}. {c.descripcion}</span>
                <span className="block text-cuerpo-sm font-normal text-muted-foreground">{c.escala === "puntaje" ? `0 a ${c.puntajeMaximo}` : "Cumple / no"}</span>
              </th>
            ))}
            <th scope="col" className="min-w-32 bg-secondary/60 px-3 py-2.5 align-bottom font-semibold">
              Totales<span className="block text-cuerpo-sm font-normal text-muted-foreground">referencia</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {alumnos.map((a) => {
            const t = totales(a.id);
            return (
              <tr key={a.id} className="border-t">
                <th scope="row" className="sticky left-0 z-10 border-r bg-card px-3 py-2 text-left font-medium">{a.apellidos}, {a.nombres}</th>
                {criterios.map((c) => {
                  const clave = `${c.id}:${a.id}`;
                  const valor = valores[clave] ?? "";
                  const estado = estados[clave];
                  const etiqueta = `${a.nombres}: ${c.descripcion}`;
                  return (
                    <td key={c.id} className="px-3 py-2 align-top">
                      {!editable ? (
                        <span className="inline-flex h-10 items-center tabular-nums">{valor === "" ? "—" : valor === "si" ? "Cumple" : valor === "no" ? "No cumple" : valor}</span>
                      ) : c.escala === "cumple" ? (
                        <select
                          aria-label={etiqueta} value={valor}
                          onChange={(ev) => { setValores((v) => ({ ...v, [clave]: ev.target.value })); void guardar(c.id, a.id, ev.target.value); }}
                          className={cn(CLASE_CAMPO, "h-10 w-32 cursor-pointer px-2 py-1.5")}
                        >
                          <option value="">—</option>
                          <option value="si">Cumple</option>
                          <option value="no">No cumple</option>
                        </select>
                      ) : (
                        <input
                          aria-label={etiqueta} type="number" min={0} max={c.puntajeMaximo ?? undefined} step={0.5} inputMode="decimal" value={valor}
                          onChange={(ev) => setValores((v) => ({ ...v, [clave]: ev.target.value }))}
                          onBlur={(ev) => void guardar(c.id, a.id, ev.target.value)}
                          className={cn(CLASE_CAMPO, "h-10 w-20 px-2 py-1.5 text-center tabular-nums")}
                        />
                      )}
                      {estado && (
                        <span role="status" className={`mt-1 flex items-center gap-1 text-cuerpo-sm ${estado.fase === "error" ? "text-falta" : estado.fase === "guardado" ? "text-llego" : "text-muted-foreground"}`}>
                          {estado.fase === "guardando" && <><Loader2 className="size-3 animate-spin" strokeWidth={2} aria-hidden />Guardando</>}
                          {estado.fase === "guardado" && <><CheckCircle2 className="size-3" strokeWidth={2} aria-hidden />Guardado</>}
                          {estado.fase === "error" && <><AlertTriangle className="size-3" strokeWidth={2} aria-hidden />{estado.mensaje}</>}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="bg-secondary/40 px-3 py-2 align-top text-cuerpo-sm tabular-nums">
                  {puntaje.length > 0 && <span className="block">{t.conPuntaje === 0 ? "—" : `${formatearNumero(t.puntos)} de ${posibles} puntos`}</span>}
                  {cotejo.length > 0 && <span className="block">Cumple {t.cumple} de {cotejo.length}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

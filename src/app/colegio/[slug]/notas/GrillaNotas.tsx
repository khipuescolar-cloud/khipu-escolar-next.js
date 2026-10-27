"use client";

import { AlertTriangle, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { useState } from "react";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { LITERALES, ETIQUETA_LITERAL, formatearNumero, type Escala, type Literal } from "@/lib/calificaciones";
import { cn } from "@/lib/utils";
import { guardarNotaAction } from "./actions";

type Estado = { fase: "guardando" } | { fase: "guardado" } | { fase: "error"; mensaje: string };

type Props = {
  slug: string;
  escala: Escala;
  editable: boolean;
  alumnos: { id: string; nombres: string; apellidos: string }[];
  evaluaciones: { id: string; titulo: string; fecha: string; peso: number }[];
  notas: { evaluacionId: string; alumnoId: string; valorLiteral: Literal | null; valorNumerico: number | null }[];
};

const valorInicial = (n: Props["notas"][number] | undefined): string => (n?.valorLiteral ?? (n?.valorNumerico != null ? formatearNumero(n.valorNumerico) : ""));

/** Rejilla alumnos × evaluaciones. Cada celda se guarda sola al cambiar (literal) o al salir del campo (0–20).
 *  Se desplaza dentro de su tarjeta y la columna del alumno queda fija. Celdas de 40 px (specs/18 §8). */
export function GrillaNotas({ slug, escala, editable, alumnos, evaluaciones, notas }: Props) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(notas.map((n) => [`${n.evaluacionId}:${n.alumnoId}`, valorInicial(n)])),
  );
  const [estados, setEstados] = useState<Record<string, Estado>>({});

  async function guardar(evaluacionId: string, alumnoId: string, valor: string) {
    const clave = `${evaluacionId}:${alumnoId}`;
    setEstados((e) => ({ ...e, [clave]: { fase: "guardando" } }));
    const r = await guardarNotaAction(slug, evaluacionId, alumnoId, valor);
    setEstados((e) => ({ ...e, [clave]: r.ok ? { fase: "guardado" } : { fase: "error", mensaje: r.error } }));
  }

  if (evaluaciones.length === 0) {
    return (
      <EstadoVacio
        icono={ClipboardList}
        titulo="Aún no hay evaluaciones en este periodo"
        descripcion="Crea la primera para empezar a poner notas."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th scope="col" className="sticky left-0 z-10 min-w-44 border-r bg-muted px-3 py-2.5 font-semibold">Alumno</th>
            {evaluaciones.map((e) => (
              <th key={e.id} scope="col" className="min-w-32 px-3 py-2.5 font-semibold">
                <span className="block">{e.titulo}</span>
                <span className="block text-xs font-normal text-muted-foreground">{e.fecha} · peso {formatearNumero(e.peso)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {alumnos.map((a) => (
            <tr key={a.id} className="border-t">
              <th scope="row" className="sticky left-0 z-10 border-r bg-card px-3 py-2 text-left font-medium">
                {a.apellidos}, {a.nombres}
              </th>
              {evaluaciones.map((e) => {
                const clave = `${e.id}:${a.id}`;
                const valor = valores[clave] ?? "";
                const estado = estados[clave];
                const etiqueta = `Nota de ${a.nombres} en ${e.titulo}`;
                return (
                  <td key={e.id} className="px-3 py-2 align-top">
                    {editable ? (
                      escala === "literal" ? (
                        <select
                          aria-label={etiqueta}
                          value={valor}
                          onChange={(ev) => {
                            setValores((v) => ({ ...v, [clave]: ev.target.value }));
                            void guardar(e.id, a.id, ev.target.value);
                          }}
                          className={cn(CLASE_CAMPO, "h-10 w-28 cursor-pointer px-2 py-1.5")}
                        >
                          <option value="">—</option>
                          {LITERALES.map((l) => (
                            <option key={l} value={l}>{l} · {ETIQUETA_LITERAL[l]}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          aria-label={etiqueta}
                          type="number" min={0} max={20} step={0.5} inputMode="decimal"
                          value={valor}
                          onChange={(ev) => setValores((v) => ({ ...v, [clave]: ev.target.value }))}
                          onBlur={(ev) => void guardar(e.id, a.id, ev.target.value)}
                          className={cn(CLASE_CAMPO, "h-10 w-20 px-2 py-1.5 text-center tabular-nums")}
                        />
                      )
                    ) : (
                      <span className="inline-flex h-10 items-center font-medium tabular-nums">{valor === "" ? "—" : valor}</span>
                    )}
                    {estado && (
                      <span role="status" className={`mt-1 flex items-center gap-1 text-xs ${estado.fase === "error" ? "text-falta" : estado.fase === "guardado" ? "text-llego" : "text-muted-foreground"}`}>
                        {estado.fase === "guardando" && <><Loader2 className="size-3 animate-spin" strokeWidth={2} aria-hidden />Guardando</>}
                        {estado.fase === "guardado" && <><CheckCircle2 className="size-3" strokeWidth={2} aria-hidden />Guardado</>}
                        {estado.fase === "error" && <><AlertTriangle className="size-3" strokeWidth={2} aria-hidden />{estado.mensaje}</>}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

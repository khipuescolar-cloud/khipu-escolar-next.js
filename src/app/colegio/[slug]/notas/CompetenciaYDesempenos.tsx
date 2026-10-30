"use client";

import { useState } from "react";
import { Selector } from "@/components/ui/Selector";

type Desempeno = { id: string; descripcion: string; codigo: string | null };

/**
 * Competencia de la evaluación y, debajo, los desempeños del CNEB de esa competencia para el grado del salón
 * (specs/30). Al cambiar de competencia se desmarcan los desempeños de la anterior.
 */
export function CompetenciaYDesempenos({
  competencias, porCompetencia, defecto, marcados = [], textoGrado,
}: {
  competencias: { id: string; nombre: string }[];
  porCompetencia: Record<string, Desempeno[]>;
  defecto?: string | null;
  marcados?: string[];
  /** «3.° de primaria»; null si el salón no tiene grado. */
  textoGrado: string | null;
}) {
  const [competenciaId, setCompetenciaId] = useState(defecto ?? "");
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set(marcados));
  const lista = competenciaId ? (porCompetencia[competenciaId] ?? []) : [];

  const alternar = (id: string) =>
    setSeleccion((prev) => {
      const nuevo = new Set(prev);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });

  return (
    <>
      <Selector
        etiqueta="Competencia"
        name="competenciaId"
        value={competenciaId}
        onChange={(e) => {
          setCompetenciaId(e.target.value);
          setSeleccion(new Set());
        }}
      >
        <option value="">Sin competencia</option>
        {competencias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </Selector>
      <input type="hidden" name="desempenosEnviados" value="1" />
      <fieldset className="flex flex-col gap-2 text-sm sm:col-span-2 sm:order-last">
        <legend className="mb-1.5 font-medium text-foreground">
          Desempeños que evalúa <span className="font-normal text-muted-foreground">(opcional{seleccion.size > 0 ? ` · ${seleccion.size} marcados` : ""})</span>
        </legend>
        {!competenciaId ? (
          <p className="text-muted-foreground">Elige una competencia para ver sus desempeños.</p>
        ) : textoGrado === null ? (
          <p className="text-muted-foreground">El salón aún no tiene grado. Dirección puede indicarlo en «Capacidades y desempeños».</p>
        ) : lista.length === 0 ? (
          <p className="text-muted-foreground">Esta competencia no tiene desempeños de {textoGrado}. Dirección puede importarlos del CNEB.</p>
        ) : (
          <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto rounded-md border p-2">
            {lista.map((d) => (
              <li key={d.id}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 hover:bg-accent">
                  <input
                    type="checkbox"
                    name="desempenoIds"
                    value={d.id}
                    checked={seleccion.has(d.id)}
                    onChange={() => alternar(d.id)}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span>
                    {d.codigo && <span className="mr-1 font-mono text-xs text-muted-foreground">{d.codigo}</span>}
                    {d.descripcion}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>
    </>
  );
}

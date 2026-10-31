"use client";

import { useState } from "react";

type Desempeno = { id: string; descripcion: string; codigo: string | null };

/**
 * Competencias que mide una evaluación nueva y, bajo cada una, sus desempeños del CNEB para el grado del salón
 * (specs/11 y 30). Una prueba puede medir varias competencias: se crea una columna por competencia con el mismo título,
 * y cada alumno recibe una nota por competencia. Al desmarcar una competencia se desmarcan sus desempeños.
 */
export function CompetenciasYDesempenos({
  competencias, porCompetencia, textoGrado,
}: {
  competencias: { id: string; nombre: string }[];
  porCompetencia: Record<string, Desempeno[]>;
  /** «3.° de primaria»; null si el salón no tiene grado. */
  textoGrado: string | null;
}) {
  const [elegidas, setElegidas] = useState<Set<string>>(new Set(competencias.length === 1 ? [competencias[0].id] : []));
  const [desempenos, setDesempenos] = useState<Set<string>>(new Set());

  const alternar = (conjunto: Set<string>, id: string) => {
    const nuevo = new Set(conjunto);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    return nuevo;
  };
  const alternarCompetencia = (id: string) => {
    setElegidas((prev) => alternar(prev, id));
    if (elegidas.has(id)) setDesempenos((prev) => new Set([...prev].filter((d) => !(porCompetencia[id] ?? []).some((x) => x.id === d))));
  };

  if (competencias.length === 0) {
    return (
      <p className="text-sm text-muted-foreground sm:col-span-2">
        Este curso aún no tiene competencias. La evaluación quedará sin competencia; agrégalas en la pestaña «Competencias».
      </p>
    );
  }

  return (
    <fieldset className="flex flex-col gap-2 text-sm sm:col-span-2 sm:order-last">
      <input type="hidden" name="desempenosEnviados" value="1" />
      <legend className="mb-1.5 font-medium text-foreground">
        Competencias que evalúa{" "}
        <span className="font-normal text-muted-foreground">
          {elegidas.size > 1 ? `· ${elegidas.size} columnas, una nota por competencia` : "(marca varias si es una prueba de varias competencias)"}
        </span>
      </legend>
      <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border p-2">
        {competencias.map((c) => {
          const marcada = elegidas.has(c.id);
          const lista = porCompetencia[c.id] ?? [];
          return (
            <li key={c.id}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 font-medium hover:bg-accent">
                <input
                  type="checkbox" name="competenciaIds" value={c.id} checked={marcada} onChange={() => alternarCompetencia(c.id)}
                  className="mt-0.5 size-4 shrink-0 accent-primary"
                />
                {c.nombre}
              </label>
              {marcada && (
                <div className="mb-1 ml-7 flex flex-col gap-1">
                  {textoGrado === null ? (
                    <p className="text-muted-foreground">El salón aún no tiene grado: dirección puede indicarlo en «Capacidades y desempeños».</p>
                  ) : lista.length === 0 ? (
                    <p className="text-muted-foreground">Sin desempeños de {textoGrado} para marcar.</p>
                  ) : (
                    <>
                      <p className="text-cuerpo-sm text-muted-foreground">Desempeños que evalúa (opcional)</p>
                      {lista.map((d) => (
                        <label key={d.id} className="flex cursor-pointer items-start gap-2.5 rounded-md p-1 hover:bg-accent">
                          <input
                            type="checkbox" name="desempenoIds" value={d.id} checked={desempenos.has(d.id)}
                            onChange={() => setDesempenos((prev) => alternar(prev, d.id))}
                            className="mt-0.5 size-4 shrink-0 accent-primary"
                          />
                          <span>
                            {d.codigo && <span className="mr-1 font-mono text-xs text-muted-foreground">{d.codigo}</span>}
                            {d.descripcion}
                          </span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

"use client";
import { Clock3 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Tema } from "@/lib/nudito/contratos";
import type { Resultado } from "@/lib/resultado";
import { FormAccion } from "@/components/FormAccion";

type Accion = (previo: Resultado | null, datos: FormData) => Promise<Resultado>;
export function CatalogoTemario({ temas, competencias, elegidos, editar, borradores, sinPractica, accion }: { temas: Tema[]; competencias: Record<number, string>; elegidos: string[]; editar: boolean; borradores: string[]; sinPractica: string[]; accion: Accion }) {
  const [consulta, setConsulta] = useState("");
  const [pendientes, setPendientes] = useState<Set<string>>(new Set());
  const incluidos = useMemo(() => new Set(elegidos), [elegidos]);
  const sinRevisar = useMemo(() => new Set(borradores), [borradores]);
  const pendientesDePractica = useMemo(() => new Set(sinPractica), [sinPractica]);
  const grupos = useMemo(() => {
    const mapa = new Map<number, Map<string, Tema[]>>();
    for (const tema of temas) {
      const bloques = mapa.get(tema.competenciaCneb) ?? new Map<string, Tema[]>();
      const bloque = tema.subtema || tema.capacidad || "Otros temas";
      bloques.set(bloque, [...(bloques.get(bloque) ?? []), tema]);
      mapa.set(tema.competenciaCneb, bloques);
    }
    return mapa;
  }, [temas]);
  const coincidencia = (tema: Tema) => [tema.nombre, tema.descripcionCorta, tema.subtema, tema.capacidad, ...tema.palabrasClave]
    .filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .includes(consulta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim());
  const cambiar = (clave: string, activo: boolean) => setPendientes(actual => {
    const siguiente = new Set(actual);
    if (activo) siguiente.add(clave); else siguiente.delete(clave);
    return siguiente;
  });
  return <section aria-labelledby="titulo-catalogo" className="min-w-0 rounded-lg border border-borde-sutil p-4">
    <h2 id="titulo-catalogo" className="text-lg font-semibold">Catálogo de Nudito</h2>
    <p className="mt-1 text-sm text-muted-foreground">{temas.length} temas disponibles para este grado y curso</p>
    <label className="mt-4 grid gap-1 text-sm">
      Filtrar temas (opcional)
      <input value={consulta} onChange={e => setConsulta(e.target.value)} type="search" className="h-11 min-w-0 w-full rounded-md border border-borde-sutil bg-background px-3" />
    </label>
    <FormAccion accion={accion} etiqueta="Agregar seleccionados" disabled={!editar || pendientes.size === 0} className="mt-4 grid gap-4">
      {[...grupos].map(([competencia, bloques]) => {
        const visibles = [...bloques].map(([nombre, lista]) => [nombre, lista.filter(coincidencia)] as const).filter(([, lista]) => lista.length);
        if (!visibles.length) return null;
        const todos = [...bloques.values()].flat();
        return <details key={competencia + ":" + Boolean(consulta)} open className="min-w-0 rounded-md border border-borde-sutil">
          <summary className="min-h-11 cursor-pointer px-3 py-3 font-semibold">{competencias[competencia] ?? "Competencia " + competencia} <span className="font-normal text-muted-foreground">· {todos.filter(t => incluidos.has(t.clave)).length} de {todos.length} elegidos</span></summary>
          <div className="grid gap-2 px-2 pb-3">
            {visibles.map(([nombre, lista]) => {
              const bloqueCompleto = bloques.get(nombre)!;
              const disponibles = bloqueCompleto.filter(t => !incluidos.has(t.clave));
              const todosMarcados = disponibles.length > 0 && disponibles.every(t => pendientes.has(t.clave));
              return <details key={nombre + ":" + Boolean(consulta)} open className="min-w-0 rounded-md bg-superficie-2">
                <summary className="min-h-11 cursor-pointer px-3 py-3 font-medium">{nombre} <span className="font-normal text-muted-foreground">· {bloqueCompleto.filter(t => incluidos.has(t.clave)).length} de {bloqueCompleto.length}</span></summary>
                <div className="px-3 pb-3">
                  {editar && <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={todosMarcados} disabled={!disponibles.length} onChange={e => setPendientes(actual => {
                      const siguiente = new Set(actual); for (const t of disponibles) { if (e.target.checked) siguiente.add(t.clave); else siguiente.delete(t.clave); } return siguiente;
                    })} className="size-5 shrink-0" />
                    Elegir todo el bloque
                  </label>}
                  <ul className="divide-y divide-borde-sutil">
                    {lista.map(t => {
                      const incluido = incluidos.has(t.clave);
                      return <li key={t.clave} className="min-w-0 py-2">
                        <label className="flex min-h-11 min-w-0 items-center gap-2">
                          <input type="checkbox" name="claves" value={t.clave} checked={incluido || pendientes.has(t.clave)} disabled={!editar || incluido} onChange={e => cambiar(t.clave, e.target.checked)} className="size-5 shrink-0" />
                          <span className="min-w-0 break-words text-sm">{t.nombre}{pendientesDePractica.has(t.clave) && <span className="ml-2 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-900"><Clock3 className="size-3" strokeWidth={2} aria-hidden />Práctica en preparación</span>}{sinRevisar.has(t.clave) && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Borrador</span>}{incluido && <span className="block text-xs text-muted-foreground">Ya está en el temario</span>}</span>
                        </label>
                      </li>;
                    })}
                  </ul>
                </div>
              </details>;
            })}
          </div>
        </details>;
      })}
    </FormAccion>
  </section>;
}

"use client";

import { Eye, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";

// Campos de «Nueva tarea» que dependen del curso elegido (specs/39): secciones gemelas (mismo curso en otros salones),
// destinatarios por sección («Todos» o selección con búsqueda), contador, vista previa y publicación.
// Envía `cursoId` y `secciones` (JSON). El servidor vuelve a validar cada curso y cada alumno.

export type CursoOpcion = { id: string; nombre: string; salon: string };
export type AlumnoOpcion = { id: string; nombres: string; apellidos: string };

type EstadoSeccion = { incluida: boolean; todos: boolean; alumnoIds: string[] };

const clave = (n: string) => n.trim().toLocaleLowerCase("es");

export function CamposNuevaTarea({ cursos, alumnos }: { cursos: CursoOpcion[]; alumnos: Record<string, AlumnoOpcion[]> }) {
  const [origen, setOrigen] = useState(cursos[0]?.id ?? "");
  const [secciones, setSecciones] = useState<Record<string, EstadoSeccion>>({});
  const [busqueda, setBusqueda] = useState("");
  const [verPrevia, setVerPrevia] = useState(false);
  const [accion, setAccion] = useState("publicar");

  const cursoOrigen = cursos.find((c) => c.id === origen);
  const gemelos = useMemo(() => cursos.filter((c) => cursoOrigen && c.id !== origen && clave(c.nombre) === clave(cursoOrigen.nombre)), [cursos, cursoOrigen, origen]);
  const estado = (id: string): EstadoSeccion => secciones[id] ?? { incluida: id === origen, todos: true, alumnoIds: [] };
  const activas = [cursoOrigen, ...gemelos].filter((c): c is CursoOpcion => !!c && estado(c.id).incluida);
  const destinatarios = (id: string) => (estado(id).todos ? (alumnos[id] ?? []) : (alumnos[id] ?? []).filter((a) => estado(id).alumnoIds.includes(a.id)));
  const total = activas.reduce((n, c) => n + destinatarios(c.id).length, 0);
  const cambiar = (id: string, parcial: Partial<EstadoSeccion>) => setSecciones((s) => ({ ...s, [id]: { ...estado(id), ...parcial } }));
  const valor = JSON.stringify(activas.map((c) => ({ cursoId: c.id, todos: estado(c.id).todos, alumnoIds: estado(c.id).todos ? undefined : estado(c.id).alumnoIds })));

  return (
    <>
      <div className="sm:col-span-2">
        <Selector etiqueta="Curso" name="cursoId" required value={origen} onChange={(e) => { setOrigen(e.target.value); setSecciones({}); }}>
          {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.salon}</option>)}
        </Selector>
      </div>
      <input type="hidden" name="secciones" value={valor} />
      <fieldset className="flex flex-col gap-3 rounded-lg border p-3 sm:col-span-2">
        <legend className="px-1 text-sm font-medium">Para quién es</legend>
        {[cursoOrigen, ...gemelos].filter((c): c is CursoOpcion => !!c).map((c) => {
          const e = estado(c.id);
          const lista = (alumnos[c.id] ?? []).filter((a) => !busqueda || `${a.apellidos} ${a.nombres}`.toLocaleLowerCase("es").includes(busqueda.toLocaleLowerCase("es")));
          return (
            <div key={c.id} className="flex flex-col gap-2">
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" className="size-5 accent-primary" checked={e.incluida} disabled={c.id === origen} onChange={(ev) => cambiar(c.id, { incluida: ev.target.checked })} />
                <span className="font-medium">{c.salon}</span>
                <span className="text-muted-foreground">{c.id === origen ? "(curso elegido)" : "(mismo curso en otro salón)"}</span>
              </label>
              {e.incluida && (
                <div className="ml-8 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex min-h-11 items-center gap-2"><input type="radio" className="size-4 accent-primary" checked={e.todos} onChange={() => cambiar(c.id, { todos: true })} />Todos ({alumnos[c.id]?.length ?? 0})</label>
                    <label className="flex min-h-11 items-center gap-2"><input type="radio" className="size-4 accent-primary" checked={!e.todos} onChange={() => cambiar(c.id, { todos: false })} />Elegir estudiantes</label>
                  </div>
                  {!e.todos && (
                    <div className="flex flex-col gap-2">
                      <label className="relative text-sm">
                        <span className="sr-only">Buscar estudiante</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} aria-hidden />
                        <input type="search" value={busqueda} onChange={(ev) => setBusqueda(ev.target.value)} placeholder="Buscar estudiante" className="h-11 w-full rounded-md border bg-background pl-9 pr-3" />
                      </label>
                      <ul className="max-h-48 overflow-y-auto rounded-md border" aria-label={`Estudiantes de ${c.salon}`}>
                        {lista.map((a) => (
                          <li key={a.id}>
                            <label className="flex min-h-11 items-center gap-3 px-3 text-sm hover:bg-accent">
                              <input
                                type="checkbox" className="size-5 accent-primary" checked={e.alumnoIds.includes(a.id)}
                                onChange={(ev) => cambiar(c.id, { alumnoIds: ev.target.checked ? [...e.alumnoIds, a.id] : e.alumnoIds.filter((x) => x !== a.id) })}
                              />
                              {a.apellidos}, {a.nombres}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium" aria-live="polite"><Users className="size-4" strokeWidth={2} aria-hidden />{total} {total === 1 ? "estudiante" : "estudiantes"}</span>
          <button type="button" className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 hover:bg-accent" onClick={() => setVerPrevia((v) => !v)} aria-expanded={verPrevia}>
            <Eye className="size-4" strokeWidth={2} aria-hidden />{verPrevia ? "Ocultar vista previa" : "Ver destinatarios"}
          </button>
        </div>
        {verPrevia && (
          <ul className="max-h-48 overflow-y-auto text-cuerpo-sm text-muted-foreground" aria-label="Vista previa de destinatarios">
            {activas.flatMap((c) => destinatarios(c.id).map((a) => <li key={`${c.id}-${a.id}`}>{a.apellidos}, {a.nombres} · {c.salon}</li>))}
          </ul>
        )}
      </fieldset>
      <fieldset className="flex flex-col gap-2 sm:col-span-2">
        <legend className="mb-1 text-sm font-medium">Publicación</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {[["publicar", "Publicar ahora"], ["programar", "Programar"], ["borrador", "Guardar borrador"]].map(([v, t]) => (
            <label key={v} className="flex min-h-11 items-center gap-2"><input type="radio" name="accion" value={v} checked={accion === v} onChange={() => setAccion(v)} className="size-4 accent-primary" />{t}</label>
          ))}
        </div>
        {accion === "programar" && <Campo etiqueta="Publicar el" name="publicarEn" type="datetime-local" required />}
      </fieldset>
    </>
  );
}

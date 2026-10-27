import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarProfesores, listarSalones } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { crearCursoAction, crearSalonAction, editarCursoAction, editarSalonAction, eliminarCursoAction, eliminarSalonAction } from "../actions";

export const metadata: Metadata = { title: "Grados y salones" };

const NIVELES = [["inicial", "Inicial"], ["primaria", "Primaria"], ["secundaria", "Secundaria"], ["academia", "Academia"]] as const;

type SalonLista = Awaited<ReturnType<typeof listarSalones>>[number];

/** nivel → grado → secciones. Sin grado numérico, el grupo es «Sin grado». */
function agrupar(salones: SalonLista[]) {
  return NIVELES.map(([nivel, titulo]) => {
    const delNivel = salones.filter((s) => s.nivel === nivel);
    const grados = new Map<number | null, SalonLista[]>();
    for (const s of delNivel) grados.set(s.grado, [...(grados.get(s.grado) ?? []), s]);
    const ordenados = [...grados.entries()].sort(([a], [b]) => (a ?? 99) - (b ?? 99));
    return { nivel, titulo, grados: ordenados.map(([grado, lista]) => ({ grado, lista: lista.sort((x, y) => (x.seccion ?? x.nombre).localeCompare(y.seccion ?? y.nombre)) })) };
  }).filter((n) => n.grados.length > 0);
}

export default async function SalonesPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/salones">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const [salones, todos] = await Promise.all([listarSalones(ctx), listarProfesores(ctx)]);
  const profesores = todos.filter((p) => p.estado !== "inactiva");
  const anio = new Date().getFullYear();

  const opcionesProfesor = (
    <>
      <option value="">Sin asignar</option>
      {profesores.map((p) => (
        <option key={p.id} value={p.id}>{p.user.nombres} {p.user.apellidos}</option>
      ))}
    </>
  );

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Grados y salones</h1>
      <Flash ok={ok} error={error} />

      <Tarjeta>
        <h2 className="mb-3 text-lg font-semibold">Crear un salón</h2>
        <form action={crearSalonAction} className="grid gap-3 sm:grid-cols-3">
          <Campo etiqueta="Nombre" name="nombre" placeholder="3.° B" required />
          <Selector etiqueta="Nivel" name="nivel" defaultValue="primaria">
            {NIVELES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </Selector>
          <Campo etiqueta="Año" name="anio" type="number" defaultValue={anio} required />
          <Campo etiqueta="Grado" name="grado" type="number" min={0} max={12} />
          <Campo etiqueta="Sección" name="seccion" />
          <Selector etiqueta="Tutor(a)" name="tutorId">{opcionesProfesor}</Selector>
          <Boton type="submit" className="self-end sm:col-span-3 sm:justify-self-start">Crear salón</Boton>
        </form>
      </Tarjeta>

      {agrupar(salones).map((n) => (
        <section key={n.nivel} className="flex flex-col gap-4" aria-labelledby={`nivel-${n.nivel}`}>
          <h2 id={`nivel-${n.nivel}`} className="border-b border-arena pb-1 text-xl font-bold">{n.titulo}</h2>
          {n.grados.map(({ grado, lista }) => (
            <div key={grado ?? "sin"} className="flex flex-col gap-3">
              <h3 className="font-semibold text-pizarra">{grado === null ? "Sin grado" : `${grado}.° grado`}</h3>
              {lista.map((s) => (
                <Tarjeta key={s.id} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-titulo text-lg font-semibold">{s.nombre} <span className="text-sm font-normal text-pizarra">· sección {s.seccion ?? "—"} · {s.anio}</span></p>
                    <p className="text-sm">
                      <span className="font-semibold">Tutor(a):</span> {s.tutor ? `${s.tutor.user.nombres} ${s.tutor.user.apellidos}` : "Sin asignar"} · {s._count.alumnos} alumnos · {s.cursos.length} cursos
                    </p>
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-acento">Editar salón y cursos</summary>
                    <div className="mt-3 flex flex-col gap-4">
                      <form action={editarSalonAction} className="grid gap-3 sm:grid-cols-3">
                        <input type="hidden" name="id" value={s.id} />
                        <Campo etiqueta="Nombre" name="nombre" defaultValue={s.nombre} required />
                        <Selector etiqueta="Nivel" name="nivel" defaultValue={s.nivel}>
                          {NIVELES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                        </Selector>
                        <Campo etiqueta="Año" name="anio" type="number" defaultValue={s.anio} required />
                        <Campo etiqueta="Grado" name="grado" type="number" min={0} max={12} defaultValue={s.grado ?? ""} />
                        <Campo etiqueta="Sección" name="seccion" defaultValue={s.seccion ?? ""} />
                        <Selector etiqueta="Tutor(a)" name="tutorId" defaultValue={s.tutorId ?? ""}>{opcionesProfesor}</Selector>
                        <Boton type="submit" variante="secundario" className="self-end justify-self-start">Guardar salón</Boton>
                      </form>
                      <form action={eliminarSalonAction} className="flex flex-wrap items-center gap-3">
                        <input type="hidden" name="id" value={s.id} />
                        <Boton type="submit" variante="fantasma">Quitar salón vacío</Boton>
                        <span className="text-xs text-pizarra">Aún no hay archivado: solo se puede quitar un salón sin alumnos ni cursos.</span>
                      </form>

                      <div>
                        <h4 className="mb-2 font-semibold">Cursos</h4>
                        <ul className="flex flex-col gap-2">
                          {s.cursos.map((c) => (
                            <li key={c.id} className="flex flex-wrap items-end gap-2">
                              <form action={editarCursoAction} className="flex flex-wrap items-end gap-2">
                                <input type="hidden" name="id" value={c.id} />
                                <Campo etiqueta="Curso" name="nombre" defaultValue={c.nombre} required />
                                <Selector etiqueta="Profesor(a)" name="profesorId" defaultValue={c.profesorId ?? ""}>{opcionesProfesor}</Selector>
                                <Boton type="submit" variante="secundario">Guardar</Boton>
                              </form>
                              <form action={eliminarCursoAction}>
                                <input type="hidden" name="id" value={c.id} />
                                <Boton type="submit" variante="fantasma">Borrar</Boton>
                              </form>
                            </li>
                          ))}
                        </ul>
                        <form action={crearCursoAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-arena pt-3">
                          <input type="hidden" name="salonId" value={s.id} />
                          <Campo etiqueta="Nuevo curso" name="nombre" placeholder="Matemática" required />
                          <Selector etiqueta="Profesor(a)" name="profesorId">{opcionesProfesor}</Selector>
                          <Boton type="submit">Agregar curso</Boton>
                        </form>
                      </div>
                    </div>
                  </details>
                </Tarjeta>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

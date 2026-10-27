import { Plus, School } from "lucide-react";
import type { Metadata } from "next";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarProfesores, listarSalones } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { AccionesFila } from "../_componentes/AccionesFila";
import { PanelFormulario } from "../_componentes/PanelFormulario";
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

  const grupos = agrupar(salones);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <EncabezadoPagina
          titulo="Grados y salones"
          descripcion="Salones por nivel y grado, con su tutor(a) y sus cursos."
          acciones={
            <PanelFormulario boton={<><Plus strokeWidth={2} aria-hidden /> Crear salón</>} titulo="Crear un salón" descripcion="Después podrás agregarle cursos y asignar a cada profesor.">
              <form action={crearSalonAction} className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre" name="nombre" placeholder="3.° B" required />
                <Selector etiqueta="Nivel" name="nivel" defaultValue="primaria">
                  {NIVELES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </Selector>
                <Campo etiqueta="Año" name="anio" type="number" defaultValue={anio} required />
                <Campo etiqueta="Grado" name="grado" type="number" min={0} max={12} />
                <Campo etiqueta="Sección" name="seccion" />
                <Selector etiqueta="Tutor(a)" name="tutorId">{opcionesProfesor}</Selector>
                <Boton type="submit" className="justify-self-start sm:col-span-2">Crear salón</Boton>
              </form>
            </PanelFormulario>
          }
        />
        <Flash ok={ok} error={error} />
      </div>

      {grupos.length === 0 && <EstadoVacio icono={School} titulo="Aún no hay salones" descripcion="Crea el primer salón con el botón «Crear salón»." />}

      {grupos.map((n) => (
        <section key={n.nivel} className="flex flex-col gap-4" aria-labelledby={`nivel-${n.nivel}`}>
          <h2 id={`nivel-${n.nivel}`} className="border-b pb-2 text-xl font-bold">{n.titulo}</h2>
          {n.grados.map(({ grado, lista }) => (
            <div key={grado ?? "sin"} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{grado === null ? "Sin grado" : `${grado}.° grado`}</h3>
              <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {lista.map((s) => (
                  <li key={s.id}>
                    <Tarjeta className="flex h-full flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-heading text-lg font-semibold">{s.nombre}</p>
                          <p className="text-sm text-muted-foreground">Sección {s.seccion ?? "—"} · {s.anio}</p>
                        </div>
                        <AccionesFila
                          etiqueta={`Acciones para ${s.nombre}`}
                          items={[
                            {
                              tipo: "panel", panel: "sheet", texto: "Editar salón y cursos", icono: "editar", titulo: `Editar ${s.nombre}`,
                              descripcion: "Datos del salón y cursos con su profesor.",
                              contenido: (
                                <div className="flex flex-col gap-6">
                                  <form action={editarSalonAction} className="grid gap-4 sm:grid-cols-2">
                                    <input type="hidden" name="id" value={s.id} />
                                    <Campo etiqueta="Nombre" name="nombre" defaultValue={s.nombre} required />
                                    <Selector etiqueta="Nivel" name="nivel" defaultValue={s.nivel}>
                                      {NIVELES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                                    </Selector>
                                    <Campo etiqueta="Año" name="anio" type="number" defaultValue={s.anio} required />
                                    <Campo etiqueta="Grado" name="grado" type="number" min={0} max={12} defaultValue={s.grado ?? ""} />
                                    <Campo etiqueta="Sección" name="seccion" defaultValue={s.seccion ?? ""} />
                                    <Selector etiqueta="Tutor(a)" name="tutorId" defaultValue={s.tutorId ?? ""}>{opcionesProfesor}</Selector>
                                    <Boton type="submit" variante="secundario" className="justify-self-start sm:col-span-2">Guardar salón</Boton>
                                  </form>

                                  <div className="border-t pt-5">
                                    <h4 className="mb-3 font-semibold">Cursos</h4>
                                    <ul className="flex flex-col gap-3">
                                      {s.cursos.length === 0 && <li className="text-sm text-muted-foreground">Este salón aún no tiene cursos.</li>}
                                      {s.cursos.map((c) => (
                                        <li key={c.id} className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
                                          <form action={editarCursoAction} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                                            <input type="hidden" name="id" value={c.id} />
                                            <Campo etiqueta="Curso" name="nombre" defaultValue={c.nombre} required />
                                            <Selector etiqueta="Profesor(a)" name="profesorId" defaultValue={c.profesorId ?? ""}>{opcionesProfesor}</Selector>
                                            <Boton type="submit" variante="secundario">Guardar</Boton>
                                          </form>
                                          <BotonConfirmar
                                            etiqueta="Borrar" titulo={`¿Borrar el curso ${c.nombre}?`} descripcion="Se quita el curso del salón. Esta acción no se deshace."
                                            confirmar="Borrar curso" accion={eliminarCursoAction} campos={{ id: c.id }} peligro variante="ghost"
                                          />
                                        </li>
                                      ))}
                                    </ul>
                                    <form action={crearCursoAction} className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
                                      <input type="hidden" name="salonId" value={s.id} />
                                      <Campo etiqueta="Nuevo curso" name="nombre" placeholder="Matemática" required />
                                      <Selector etiqueta="Profesor(a)" name="profesorId">{opcionesProfesor}</Selector>
                                      <Boton type="submit">Agregar curso</Boton>
                                    </form>
                                  </div>
                                </div>
                              ),
                            },
                            {
                              tipo: "confirmar", texto: "Quitar salón vacío", icono: "borrar", peligro: true, titulo: `¿Quitar ${s.nombre}?`,
                              descripcion: "Aún no hay archivado: solo se puede quitar un salón sin alumnos ni cursos.", confirmar: "Quitar salón",
                              accion: eliminarSalonAction, campos: { id: s.id },
                            },
                          ]}
                        />
                      </div>
                      <p className="text-sm"><span className="font-semibold">Tutor(a):</span> {s.tutor ? `${s.tutor.user.nombres} ${s.tutor.user.apellidos}` : <span className="text-muted-foreground">Sin asignar</span>}</p>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <Badge variant="secondary" className="h-6 px-2.5">{s._count.alumnos} alumnos</Badge>
                        <Badge variant="secondary" className="h-6 px-2.5">{s.cursos.length} cursos</Badge>
                      </div>
                    </Tarjeta>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

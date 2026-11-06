import { Archive, FileUp, Plus, School } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Badge } from "@/components/ui/badge";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { TituloBloque } from "@/app/colegio/[slug]/inicio/TituloBloque";
import { buttonVariants } from "@/components/ui/button";
import { CATALOGO_CNEB, areaPorClave } from "@/lib/cneb/catalogo";
import { listarProfesores, listarSalones } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { AccionesFila } from "../_componentes/AccionesFila";
import { SUPERFICIE_LISTA } from "../_componentes/BarraFiltros";
import { PanelFormulario } from "../_componentes/PanelFormulario";
import { archivarSalonAction, crearCursoAction, crearSalonAction, editarCursoAction, editarSalonAction, eliminarCursoAction, eliminarSalonAction, reactivarSalonAction } from "../actions";

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
  const { ok, error, archivados } = await searchParams;
  const verArchivados = archivados === "1";
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const [salones, todos] = await Promise.all([listarSalones(ctx, { archivados: verArchivados }), listarProfesores(ctx)]);
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

  // Área CNEB del curso (specs/42): la usa Nudito para saber qué cursos son de Matemática, Comunicación o Ciencia.
  const opcionesArea = CATALOGO_CNEB.map((a) => (
    <option key={a.area} value={a.area}>{a.nombre}</option>
  ));

  const grupos = agrupar(salones);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <EncabezadoPagina
          seccion="colegio"
          titulo="Grados y salones"
          descripcion="Salones por nivel y grado, con su tutor(a) y sus cursos."
          acciones={
            <>
            <Link href="/gestion/carga-masiva?tipo=salones" className={buttonVariants({ variant: "outline" })}><FileUp strokeWidth={2} aria-hidden /> Cargar desde archivo</Link>
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
            </>
          }
        />
        <Flash ok={ok} error={error} />
        <p className="text-sm">
          {verArchivados ? (
            <Link href="/gestion/salones" className="inline-flex items-center gap-1.5 enlace"><School className="size-4" strokeWidth={2} aria-hidden /> Volver a los salones activos</Link>
          ) : (
            <Link href="/gestion/salones?archivados=1" className="inline-flex items-center gap-1.5 enlace"><Archive className="size-4" strokeWidth={2} aria-hidden /> Ver archivados</Link>
          )}
        </p>
      </div>

      {verArchivados && <p className="-mt-2 rounded-[14px] bg-superficie-2/60 px-4 py-3 text-cuerpo-sm text-muted-foreground">Estos salones están archivados: no salen al pasar lista ni en los selectores, pero conservan su asistencia, notas y alumnos.</p>}
      {grupos.length === 0 && (
        verArchivados
          ? <EstadoVacio icono={Archive} titulo="No hay salones archivados" descripcion="Cuando archives un salón, aparecerá aquí y podrás reactivarlo." />
          : <EstadoVacio icono={School} titulo="Aún no hay salones" descripcion="Crea el primer salón con el botón «Crear salón»." />
      )}

      {grupos.map((n) => (
        <section key={n.nivel} className="flex flex-col gap-3" aria-labelledby={`nivel-${n.nivel}`}>
          <TituloBloque id={`nivel-${n.nivel}`}>{n.titulo}</TituloBloque>
          <div className={SUPERFICIE_LISTA}>
          {n.grados.map(({ grado, lista }) => (
            <div key={grado ?? "sin"} className="border-b border-borde-sutil last:border-b-0">
              <h3 className="bg-superficie-2/60 px-4 py-2 text-cuerpo-sm font-semibold text-muted-foreground">{grado === null ? "Sin grado" : `${grado}.° grado`}</h3>
              <ul className="divide-y divide-borde-sutil">
                {lista.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-x-6 gap-y-1 sm:flex-row sm:items-center">
                      <div className="min-w-0 sm:w-48 sm:shrink-0">
                        <p className="font-heading font-semibold">{s.nombre}</p>
                        <p className="text-cuerpo-sm text-muted-foreground tabular-nums">Sección {s.seccion ?? "—"} · {s.anio}</p>
                      </div>
                      <p className="min-w-0 flex-1 text-cuerpo-sm">
                        <span className="text-muted-foreground">Tutor(a): </span>
                        {s.tutor ? <span className="font-medium">{s.tutor.user.nombres} {s.tutor.user.apellidos}</span> : <span className="text-muted-foreground">Sin asignar</span>}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-cuerpo-sm text-muted-foreground tabular-nums">
                        <span><strong className="font-semibold text-foreground">{s._count.alumnos}</strong> alumnos</span>
                        <span><strong className="font-semibold text-foreground">{s.cursos.length}</strong> cursos</span>
                        {s.archivadoAt && <Badge variant="outline" className="h-6 px-2.5"><Archive strokeWidth={2} aria-hidden /> Archivado</Badge>}
                      </p>
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

                                  <div className="border-t border-borde-sutil pt-5">
                                    <h4 className="mb-3 font-heading text-[18px] leading-6 font-semibold">Cursos</h4>
                                    <ul className="flex flex-col divide-y divide-borde-sutil rounded-[10px] border border-borde-sutil">
                                      {s.cursos.length === 0 && <li className="px-3 py-3 text-cuerpo-sm text-muted-foreground">Este salón aún no tiene cursos. Agrega el primero abajo.</li>}
                                      {s.cursos.map((c) => (
                                        <li key={c.id} className="flex flex-wrap items-end gap-2 p-3">
                                          <form action={editarCursoAction} className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 sm:items-end">
                                            <input type="hidden" name="id" value={c.id} />
                                            <Campo etiqueta="Curso" name="nombre" defaultValue={c.nombre} required />
                                            <Selector etiqueta="Profesor(a)" name="profesorId" defaultValue={c.profesorId ?? ""}>{opcionesProfesor}</Selector>
                                            <Selector etiqueta="Área CNEB" name="areaCneb" defaultValue={c.areaCnebManual ? (c.areaCneb ?? "") : ""}>
                                              <option value="">Automática{!c.areaCnebManual && c.areaCneb ? ` (${areaPorClave(c.areaCneb)?.nombre ?? c.areaCneb})` : " (según el nombre)"}</option>
                                              {opcionesArea}
                                            </Selector>
                                            <Boton type="submit" variante="secundario">Guardar</Boton>
                                          </form>
                                          <BotonConfirmar
                                            etiqueta="Borrar" titulo={`¿Borrar el curso ${c.nombre}?`} descripcion="Se quita el curso del salón. Esta acción no se deshace."
                                            confirmar="Borrar curso" accion={eliminarCursoAction} campos={{ id: c.id }} peligro variante="ghost"
                                          />
                                        </li>
                                      ))}
                                    </ul>
                                    <form action={crearCursoAction} className="mt-4 flex flex-wrap items-end gap-2 pt-1">
                                      <input type="hidden" name="salonId" value={s.id} />
                                      <Campo etiqueta="Nuevo curso" name="nombre" placeholder="Matemática" required />
                                      <Selector etiqueta="Profesor(a)" name="profesorId">{opcionesProfesor}</Selector>
                                      <Boton type="submit">Agregar curso</Boton>
                                    </form>
                                  </div>
                                </div>
                              ),
                            },
                            s.archivadoAt
                              ? {
                                  tipo: "confirmar" as const, texto: "Reactivar salón", icono: "reactivar" as const, titulo: `¿Reactivar ${s.nombre}?`,
                                  descripcion: "Volverá a salir al pasar lista y en los selectores (comunicados, tareas, agenda, notas, carnets y alumnos nuevos).", confirmar: "Reactivar salón",
                                  accion: reactivarSalonAction, campos: { id: s.id },
                                }
                              : {
                                  tipo: "confirmar" as const, texto: "Archivar salón", icono: "retirar" as const, titulo: `¿Archivar ${s.nombre}?`,
                                  descripcion: "Dejará de aparecer para pasar lista y en los selectores (comunicados, tareas, agenda, notas, carnets y alumnos nuevos), y no se podrán agregar alumnos nuevos. Se conservan sus alumnos, asistencia y notas, y las familias siguen viendo el historial. Puedes reactivarlo cuando quieras.",
                                  confirmar: "Archivar salón", accion: archivarSalonAction, campos: { id: s.id },
                                },
                            ...(s._count.alumnos === 0 && s.cursos.length === 0
                              ? [{
                                  tipo: "confirmar" as const, texto: "Quitar salón vacío", icono: "borrar" as const, peligro: true, titulo: `¿Quitar ${s.nombre}?`,
                                  descripcion: "Se borra del todo. Solo se puede quitar un salón sin alumnos ni cursos; si ya se usó, archívalo.", confirmar: "Quitar salón",
                                  accion: eliminarSalonAction, campos: { id: s.id },
                                }]
                              : []),
                          ]}
                        />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          </div>
        </section>
      ))}
    </div>
  );
}

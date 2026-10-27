import { CalendarDays, CheckCircle2, Clock, ListTodo, Pencil, Plus, Users, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { fechaLima, formatoDia, NOMBRE_GRUPO, sumarDias } from "@/lib/fechas";
import { requireFeature } from "@/lib/server/plan";
import { cursosParaTareas, tareasDeFamilia, tareasDelDocente } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";
import { actualizarTareaAction, crearTareaAction, eliminarTareaAction } from "./actions";

export const metadata: Metadata = { title: "Tareas" };

/** Insignia de fecha de entrega: siempre ícono + palabra, nunca solo color. */
function FechaEntrega({ fecha, vencida = false }: { fecha: Date; vencida?: boolean }) {
  const hoy = fechaLima(new Date());
  const dia = fechaLima(fecha);
  let Icono = CalendarDays;
  let clase = "bg-muted text-muted-foreground";
  let texto = `Entrega ${formatoDia(fecha)}`;
  if (vencida || dia < hoy) {
    Icono = XCircle; clase = "bg-falta-fondo text-falta"; texto = `Venció ${formatoDia(fecha)}`;
  } else if (dia === hoy) {
    Icono = Clock; clase = "bg-tarde-fondo text-tarde"; texto = "Entrega hoy";
  } else if (dia === sumarDias(hoy, 1)) {
    Icono = Clock; clase = "bg-tarde-fondo text-tarde"; texto = "Entrega mañana";
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pildora px-2.5 py-1 text-xs font-semibold ${clase}`}>
      <Icono className="size-3.5" strokeWidth={2} aria-hidden />{texto}
    </span>
  );
}

export default async function TareasPage({ params }: PageProps<"/colegio/[slug]/tareas">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");

  if (ctx.rol === "apoderado") {
    const hijos = await tareasDeFamilia(ctx);
    return (
      <div>
        <EncabezadoPagina titulo="Tareas" descripcion="Lo que tus hijos tienen que entregar." />
        {hijos.length === 0 ? (
          <EstadoVacio icono={Users} titulo="No encontramos hijos vinculados a tu cuenta" descripcion="Si crees que es un error, avisa al colegio." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {hijos.map(({ alumno, grupos }) => {
              const total = grupos.manana.length + grupos.semana.length + grupos.despues.length;
              return (
                <Card key={alumno.id}>
                  <CardHeader><h2 className="font-heading font-medium leading-snug text-base">{alumno.nombres} {alumno.apellidos}</h2></CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    {total === 0 && (
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="size-4 text-llego" strokeWidth={2} aria-hidden />No tiene tareas pendientes.
                      </p>
                    )}
                    {(Object.keys(NOMBRE_GRUPO) as (keyof typeof NOMBRE_GRUPO)[]).map((g) =>
                      grupos[g].length === 0 ? null : (
                        <section key={g}>
                          <h3 className="mb-2 text-sm font-semibold text-primary">{NOMBRE_GRUPO[g]}</h3>
                          <ul className="flex flex-col gap-2">
                            {grupos[g].map((t) => (
                              <li key={t.id} className="flex items-start gap-3 rounded-lg border bg-background p-3 text-sm">
                                <ListTodo className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
                                <div className="flex min-w-0 flex-col gap-1">
                                  <p className="font-medium">{t.titulo}</p>
                                  <p className="text-muted-foreground">{t.curso}</p>
                                  {t.descripcion && <p className="text-muted-foreground">{t.descripcion}</p>}
                                  <div><FechaEntrega fecha={t.fechaEntrega} /></div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ),
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  const [cursos, tareas] = await Promise.all([cursosParaTareas(ctx), tareasDelDocente(ctx)]);

  return (
    <div>
      <EncabezadoPagina
        titulo="Tareas"
        descripcion="Las familias las ven por hijo, agrupadas por fecha de entrega."
        acciones={
          ctx.rol === "profesor" && cursos.length > 0 ? (
            <DialogoAccion
              disparador={<><Plus strokeWidth={2} aria-hidden />Nueva tarea</>}
              titulo="Nueva tarea"
              descripcion="Las familias verán esta tarea en su lista, agrupada por fecha de entrega."
              etiqueta="Crear tarea"
              accion={crearTareaAction.bind(null, slug)}
            >
              <Selector etiqueta="Curso" name="cursoId" required>
                {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.salon.nombre}</option>)}
              </Selector>
              <Campo etiqueta="Fecha de entrega" name="fechaEntrega" type="date" required min={fechaLima(new Date())} />
              <div className="sm:col-span-2"><Campo etiqueta="Título" name="titulo" required maxLength={150} placeholder="Fichas de fracciones (pág. 42)" /></div>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Descripción (opcional)</span>
                <Textarea name="descripcion" rows={3} maxLength={1000} />
              </label>
              <label className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3 text-sm sm:col-span-2">
                <input type="checkbox" name="avisarFamilias" className="mt-0.5 size-4 accent-primary" />
                <span>
                  <span className="font-medium">Avisar a las familias</span>
                  <span className="block text-muted-foreground">Las familias reciben un aviso por correo o en el celular con esta tarea.</span>
                </span>
              </label>
            </DialogoAccion>
          ) : undefined
        }
      />

      {ctx.rol === "profesor" && cursos.length === 0 && (
        <div className="mb-4"><EstadoVacio icono={ListTodo} titulo="Todavía no tienes cursos asignados" descripcion="Cuando dirección te asigne un curso, podrás crear tareas." /></div>
      )}

      {tareas.length === 0 ? (
        <EstadoVacio icono={CheckCircle2} titulo="No hay tareas próximas" descripcion={ctx.rol === "profesor" ? "Crea una con «Nueva tarea» y las familias la verán al instante." : undefined} />
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold">Tareas de tus cursos</h2>
          <ul className="grid gap-3 lg:grid-cols-2">
            {tareas.map((t) => (
              <li key={t.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs">
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium">{t.titulo}</p>
                    <FechaEntrega fecha={t.fechaEntrega} vencida={t.vencida} />
                  </div>
                  <p className="text-sm text-muted-foreground">{t.curso} · {t.salon}</p>
                  {t.descripcion && <p className="text-sm text-muted-foreground">{t.descripcion}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                  {ctx.rol === "profesor" && (
                    <DialogoAccion
                      disparador={<><Pencil strokeWidth={2} aria-hidden />Editar tarea</>}
                      variante="outline" tamano="sm"
                      titulo="Editar tarea"
                      etiqueta="Guardar cambios"
                      accion={actualizarTareaAction.bind(null, slug, t.id)}
                    >
                      <div className="sm:col-span-2"><Campo etiqueta="Nombre de la tarea" id={`titulo-${t.id}`} name="titulo" required maxLength={150} defaultValue={t.titulo} /></div>
                      <Campo etiqueta="Día de entrega" id={`fecha-${t.id}`} name="fechaEntrega" type="date" required defaultValue={fechaLima(t.fechaEntrega)} />
                      <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                        <span className="font-medium">Descripción (opcional)</span>
                        <Textarea name="descripcion" rows={3} maxLength={1000} defaultValue={t.descripcion ?? ""} />
                      </label>
                    </DialogoAccion>
                  )}
                  <BotonConfirmar
                    etiqueta="Eliminar" variante="ghost" tamano="sm" peligro
                    titulo="¿Eliminar esta tarea?"
                    descripcion="Las familias dejarán de verla en su lista. No se puede deshacer."
                    confirmar="Eliminar tarea"
                    accion={eliminarTareaAction.bind(null, slug, t.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

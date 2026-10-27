import { ListTodo, Plus } from "lucide-react";
import type { Metadata } from "next";
import { forbidden } from "next/navigation";
import { FormAccion } from "@/components/FormAccion";
import { Alerta } from "@/components/ui/Alerta";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { fechaLima, formatoDia, NOMBRE_GRUPO } from "@/lib/fechas";
import { requireFeature } from "@/lib/server/plan";
import { cursosParaTareas, tareasDeFamilia, tareasDelDocente } from "@/lib/server/tareas";
import { requireTenantContext } from "@/lib/server/tenant";
import { crearTareaAction, eliminarTareaAction } from "./actions";

export const metadata: Metadata = { title: "Tareas" };

export default async function TareasPage({ params }: PageProps<"/colegio/[slug]/tareas">) {
  const { slug } = await params;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "tareas");

  if (ctx.rol === "apoderado") {
    const hijos = await tareasDeFamilia(ctx);
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-bold">Tareas</h1>
          <p className="text-sm text-pizarra">Lo que tus hijos tienen que entregar.</p>
        </div>
        {hijos.length === 0 && <Alerta tipo="info">No encontramos hijos vinculados a tu cuenta.</Alerta>}
        {hijos.map(({ alumno, grupos }) => {
          const total = grupos.manana.length + grupos.semana.length + grupos.despues.length;
          return (
            <Tarjeta key={alumno.id} className="flex flex-col gap-4">
              <h2 className="text-lg font-semibold">{alumno.nombres} {alumno.apellidos}</h2>
              {total === 0 && <p className="text-sm text-pizarra">No tiene tareas pendientes.</p>}
              {(Object.keys(NOMBRE_GRUPO) as (keyof typeof NOMBRE_GRUPO)[]).map((g) =>
                grupos[g].length === 0 ? null : (
                  <section key={g}>
                    <h3 className="mb-2 text-sm font-semibold text-acento">{NOMBRE_GRUPO[g]}</h3>
                    <ul className="flex flex-col gap-2">
                      {grupos[g].map((t) => (
                        <li key={t.id} className="flex items-start gap-2 text-sm">
                          <ListTodo className="mt-0.5 h-4 w-4 shrink-0 text-pizarra" strokeWidth={2} aria-hidden />
                          <div>
                            <p className="font-medium">{t.titulo}</p>
                            <p className="text-pizarra">{t.curso} · Entrega {fechaLima(t.fechaEntrega) === fechaLima(new Date()) ? "hoy" : formatoDia(t.fechaEntrega)}</p>
                            {t.descripcion && <p className="text-pizarra">{t.descripcion}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ),
              )}
            </Tarjeta>
          );
        })}
      </div>
    );
  }

  if (ctx.rol !== "profesor" && ctx.rol !== "direccion") forbidden();
  const [cursos, tareas] = await Promise.all([cursosParaTareas(ctx), tareasDelDocente(ctx)]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Tareas</h1>
        <p className="text-sm text-pizarra">Las familias las ven por hijo, agrupadas por fecha de entrega.</p>
      </div>

      {ctx.rol === "profesor" && (
        <Tarjeta>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5" strokeWidth={2} aria-hidden />Nueva tarea</h2>
          {cursos.length === 0 ? (
            <p className="text-sm text-pizarra">Todavía no tienes cursos asignados.</p>
          ) : (
            <FormAccion accion={crearTareaAction.bind(null, slug)} etiqueta="Crear tarea" className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">Curso</span>
                <select name="cursoId" required className="rounded-md border border-arena bg-superficie px-3 py-2.5">
                  {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.salon.nombre}</option>)}
                </select>
              </label>
              <Campo etiqueta="Fecha de entrega" name="fechaEntrega" type="date" required min={fechaLima(new Date())} />
              <div className="sm:col-span-2"><Campo etiqueta="Título" name="titulo" required maxLength={150} placeholder="Fichas de fracciones (pág. 42)" /></div>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                <span className="font-medium">Descripción (opcional)</span>
                <textarea name="descripcion" rows={2} maxLength={1000} className="rounded-md border border-arena bg-superficie px-3 py-2.5 text-base" />
              </label>
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="avisarFamilias" className="mt-0.5 h-4 w-4 accent-acento" />
                <span>
                  <span className="font-medium">Avisar a las familias</span>
                  <span className="block text-pizarra">Las familias reciben un aviso por correo o en el celular con esta tarea.</span>
                </span>
              </label>
            </FormAccion>
          )}
        </Tarjeta>
      )}

      <Tarjeta>
        <h2 className="mb-3 text-lg font-semibold">Tareas de tus cursos</h2>
        {tareas.length === 0 && <p className="text-sm text-pizarra">No hay tareas próximas.</p>}
        <ul className="flex flex-col gap-3">
          {tareas.map((t) => (
            <li key={t.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-arena pb-3 last:border-0 last:pb-0">
              <div className="text-sm">
                <p className="font-medium">{t.titulo}</p>
                <p className="text-pizarra">{t.curso} · {t.salon} · Entrega {formatoDia(t.fechaEntrega)}{t.vencida ? " (ya venció)" : ""}</p>
                {t.descripcion && <p className="text-pizarra">{t.descripcion}</p>}
              </div>
              <FormAccion accion={eliminarTareaAction.bind(null, slug, t.id)} etiqueta="Eliminar" variante="fantasma" className="contents" />
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}

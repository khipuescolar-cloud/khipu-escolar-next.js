import type { Metadata } from "next";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Flash } from "@/components/ui/Flash";
import { Selector } from "@/components/ui/Selector";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { listarProfesores, listarSalones } from "@/lib/server/gestion";
import { requireTenantContext } from "@/lib/server/tenant";
import { crearCursoAction, crearSalonAction, editarCursoAction, editarSalonAction, eliminarCursoAction, eliminarSalonAction } from "../actions";

export const metadata: Metadata = { title: "Salones y cursos" };

const NIVELES = [["inicial", "Inicial"], ["primaria", "Primaria"], ["secundaria", "Secundaria"], ["academia", "Academia"]] as const;

export default async function SalonesPage({ params, searchParams }: PageProps<"/colegio/[slug]/gestion/salones">) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const ctx = await requireTenantContext(slug, ["direccion"]);
  const [salones, todos] = await Promise.all([listarSalones(ctx), listarProfesores(ctx)]);
  const profesores = todos.filter((p) => p.estado === "activa");
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
      <h1 className="text-2xl font-bold">Salones y cursos</h1>
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

      {salones.map((s) => (
        <Tarjeta key={s.id} className="flex flex-col gap-4">
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
            <div className="flex items-center gap-2 sm:col-span-3">
              <Boton type="submit" variante="secundario">Guardar salón</Boton>
              <span className="text-sm text-pizarra">{s._count.alumnos} alumnos</span>
            </div>
          </form>
          <form action={eliminarSalonAction}>
            <input type="hidden" name="id" value={s.id} />
            <Boton type="submit" variante="fantasma">Borrar salón (solo si está vacío)</Boton>
          </form>

          <div>
            <h3 className="mb-2 font-semibold">Cursos</h3>
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
        </Tarjeta>
      ))}
    </div>
  );
}

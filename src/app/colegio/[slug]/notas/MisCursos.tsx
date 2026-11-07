import Link from "next/link";
import { BookOpen, CalendarDays, GraduationCap } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { cursosDelRegistro } from "@/lib/server/registro-notas";
import type { TenantContext } from "@/lib/server/tenant";

type Curso = Awaited<ReturnType<typeof cursosDelRegistro>>["propios"][number];

const mayuscula = (t: string) => t[0].toUpperCase() + t.slice(1);

function FilaCurso({ curso, discreta }: { curso: Curso; discreta?: boolean }) {
  const s = curso.salon;
  return (
    <article className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="flex items-start gap-3">
        <BookOpen className={`mt-1 size-5 ${discreta ? "text-muted-foreground" : "text-primary"}`} aria-hidden />
        <div>
          <h3 className="font-heading text-base font-semibold">{curso.nombre} · {s.nombre}</h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {mayuscula(s.nivel)} · {s.grado ? `${s.grado}.° grado` : "Sin grado"} · Sección {s.seccion ?? s.nombre} · {s.alumnos.length} alumnos
          </p>
        </div>
      </div>
      <Link href={`/notas/${curso.id}`} className={buttonVariants({ variant: "outline" })}>Abrir registro<span className="sr-only"> de {curso.nombre}, {s.nombre}</span></Link>
    </article>
  );
}

function ListaCursos({ cursos, discreta }: { cursos: Curso[]; discreta?: boolean }) {
  return <div className="divide-y divide-borde-sutil border-y border-borde-sutil">{cursos.map((c) => <FilaCurso key={c.id} curso={c} discreta={discreta} />)}</div>;
}

export async function MisCursos({ ctx }: { ctx: TenantContext }) {
  const { anio, propios, tutoria } = await cursosDelRegistro(ctx);
  const esDireccion = ctx.rol === "direccion";
  const grupos = esDireccion ? Object.entries(Object.groupBy(propios, (c) => `${c.salon.grado ?? "Otro"}.° ${c.salon.nivel}`)) : [];
  return (
    <div className="space-y-8">
      <EncabezadoPagina
        seccion="academico"
        titulo="Registro de notas"
        descripcion={`${esDireccion ? "Cursos del colegio" : "Mis cursos"} · Año académico ${anio}`}
        acciones={esDireccion ? <Link href="/notas/periodos" className={buttonVariants({ variant: "outline" })}><CalendarDays aria-hidden />Gestionar periodos</Link> : undefined}
      />
      {propios.length === 0 && tutoria.length === 0 ? (
        <EstadoVacio icono={GraduationCap} titulo="No hay cursos asignados" descripcion="Cuando dirección asigne cursos, aparecerán aquí." />
      ) : esDireccion ? (
        grupos.map(([grupo, lista]) => (
          <section key={grupo} aria-label={grupo}>
            <h2 className="mb-2 font-heading text-lg font-semibold">{grupo}</h2>
            <ListaCursos cursos={lista ?? []} />
          </section>
        ))
      ) : (
        <>
          <section aria-labelledby="mis-cursos">
            <h2 id="mis-cursos" className="mb-2 font-heading text-lg font-semibold">Mis cursos</h2>
            {propios.length ? <ListaCursos cursos={propios} /> : <p className="border-y border-borde-sutil py-4 text-sm text-muted-foreground">No dictas cursos este año.</p>}
          </section>
          {tutoria.length > 0 && (
            <section aria-labelledby="tutoria" className="space-y-1">
              <h2 id="tutoria" className="text-sm font-semibold text-muted-foreground">Salón que tutoras · solo lectura</h2>
              <ListaCursos cursos={tutoria} discreta />
            </section>
          )}
        </>
      )}
    </div>
  );
}

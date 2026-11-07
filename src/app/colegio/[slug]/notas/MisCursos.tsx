import Link from "next/link";
import { BookOpen, CalendarDays, GraduationCap } from "lucide-react";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { cursosDelRegistro } from "@/lib/server/registro-notas";
import type { TenantContext } from "@/lib/server/tenant";

export async function MisCursos({ ctx }: { ctx: TenantContext }) {
  const cursos = await cursosDelRegistro(ctx);
  const anio = Math.max(new Date().getFullYear(), ...cursos.map((c) => c.salon.anio));
  const grupos = ctx.rol === "direccion"
    ? Object.entries(Object.groupBy(cursos, (c) => `${c.salon.grado ?? "Otro"}.° ${c.salon.nivel}`))
    : [["Mis cursos", cursos] as const];
  return <div className="space-y-6">
    <EncabezadoPagina seccion="academico" titulo="Registro de notas" descripcion={`${ctx.rol === "profesor" ? "Mis cursos" : "Cursos del colegio"} · Año académico ${anio}`} acciones={ctx.rol === "direccion" ? <Link href="/notas/periodos" className={buttonVariants({ variant: "outline" })}><CalendarDays aria-hidden />Gestionar periodos</Link> : undefined} />
    {cursos.length === 0 ? <EstadoVacio icono={GraduationCap} titulo="No hay cursos asignados" descripcion="Cuando dirección asigne cursos, aparecerán aquí." /> : grupos.map(([grupo, lista]) => <section key={grupo} aria-label={grupo}>
      {ctx.rol === "direccion" && <h2 className="mb-2 font-heading text-lg font-semibold">{grupo}</h2>}
      <div className="divide-y divide-borde-sutil border-y border-borde-sutil">
      {(lista ?? []).map((c) => <article key={c.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="flex items-start gap-3"><BookOpen className="mt-1 size-5 text-primary" aria-hidden /><div><h2 className="font-heading text-base font-semibold">{c.nombre} — {c.salon.nombre} {c.salon.nivel[0].toUpperCase() + c.salon.nivel.slice(1)}</h2><p className="text-sm text-muted-foreground tabular-nums">{c.salon.alumnos.length} alumnos · {c.salon.anio}</p></div></div>
        <Link href={`/notas/${c.id}`} className={buttonVariants({ variant: "outline" })}>Abrir registro</Link>
      </article>)}
    </div></section>)}
  </div>;
}

import { BookOpenCheck, ClipboardList, GraduationCap } from "lucide-react";
import Link from "next/link";
import { NavegacionPildoras } from "@/components/academico/NavegacionPildoras";
import { Calificacion } from "@/components/Calificacion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { alumnosVisibles, listarPeriodos, notasDeAlumno, periodoEnCurso } from "@/lib/server/notas";
import type { TenantContext } from "@/lib/server/tenant";

type SP = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Notas de los hijos por curso y competencia. Sin promedios del salón, rankings ni comparaciones. */
export async function VistaFamilia({ ctx, sp }: { ctx: TenantContext; sp: SP }) {
  const [hijos, periodos] = await Promise.all([alumnosVisibles(ctx), listarPeriodos(ctx)]);
  const hijo = hijos.find((h) => h.id === uno(sp.alumno)) ?? hijos[0];
  const periodo = periodos.find((p) => p.id === uno(sp.periodo)) ?? periodoEnCurso(periodos);

  if (!hijo || !periodo) {
    return (
      <div>
        <EncabezadoPagina titulo="Notas" />
        <EstadoVacio icono={ClipboardList} titulo="Aún no hay notas para mostrar" descripcion="Cuando el colegio registre las primeras notas, las verás aquí." />
      </div>
    );
  }
  const datos = await notasDeAlumno(ctx, hijo.id, periodo.id);
  const sinNotas = datos.cursos.every((c) => c.competencias.every((x) => !x.calificacion) && c.evaluaciones.length === 0);

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Notas"
        descripcion="Así va el avance de tu hijo o hija en cada competencia."
        acciones={
          <Link href={`/libreta?alumno=${hijo.id}&periodo=${periodo.id}`} className={buttonVariants({ variant: "outline" })}>
            <BookOpenCheck strokeWidth={2} aria-hidden />Ver libreta
          </Link>
        }
      />

      {hijos.length > 1 && (
        <NavegacionPildoras
          etiqueta="Hijos"
          items={hijos.map((h) => ({ href: `/notas?alumno=${h.id}&periodo=${periodo.id}`, texto: h.nombres, activo: h.id === hijo.id }))}
        />
      )}
      <NavegacionPildoras
        etiqueta="Periodos"
        items={periodos.map((p) => ({ href: `/notas?alumno=${hijo.id}&periodo=${p.id}`, texto: p.nombre, activo: p.id === periodo.id }))}
      />

      <p className="text-sm text-muted-foreground">
        {datos.alumno.nombres} {datos.alumno.apellidos} · {datos.alumno.salon} · {datos.periodo.nombre}
      </p>

      {sinNotas && <EstadoVacio icono={ClipboardList} titulo="En este periodo todavía no hay notas registradas" descripcion="Apenas el profesor las registre, aparecerán aquí." />}

      <div className="grid gap-4 md:grid-cols-2">
        {datos.cursos.map((curso) => (
          <Card key={curso.id}>
            <CardHeader>
              <h2 className="font-heading font-medium leading-snug flex items-center gap-2 text-base"><GraduationCap className="size-5 text-primary" strokeWidth={2} aria-hidden />{curso.nombre}</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {curso.competencias.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {curso.competencias.map((c) => (
                    <li key={c.id} className="flex flex-col gap-1.5 border-b pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium">{c.nombre}</p>
                      <div>{c.calificacion ? <Calificacion valor={c.calificacion} /> : <span className="text-xs text-muted-foreground">Sin calificar todavía</span>}</div>
                      {c.conclusion && <p className="text-sm text-muted-foreground">{c.conclusion}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {curso.evaluaciones.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Evaluaciones</h3>
                  <ul className="flex flex-col gap-2">
                    {curso.evaluaciones.map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span>{e.titulo}<span className="text-muted-foreground"> · {e.fecha}{e.competencia ? ` · ${e.competencia}` : ""}</span></span>
                        <Calificacion valor={e.valor} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

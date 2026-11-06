import { BookOpenCheck, ClipboardList, GraduationCap, MessageSquareText, Sprout } from "lucide-react";
import Link from "next/link";
import { NavegacionPildoras } from "@/components/academico/NavegacionPildoras";
import { NOMBRE_INSTRUMENTO } from "@/lib/calificaciones";
import { Calificacion } from "@/components/Calificacion";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { buttonVariants } from "@/components/ui/button";
import { libretaVisibleParaFamilia } from "@/lib/libreta-publicacion";
import { alumnosVisibles, listarPeriodos, notasDeAlumno, periodoEnCurso } from "@/lib/server/notas";
import type { TenantContext } from "@/lib/server/tenant";

type SP = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Notas de los hijos por curso y competencia. Sin promedios del salón, rankings ni comparaciones. */
export async function VistaFamilia({ ctx, sp }: { ctx: TenantContext; sp: SP }) {
  const [hijos, todos] = await Promise.all([alumnosVisibles(ctx), listarPeriodos(ctx)]);
  const hijo = hijos.find((h) => h.id === uno(sp.alumno)) ?? hijos[0];
  const periodos = hijo ? todos.filter((p) => p.niveles.includes(hijo.salon.nivel)) : todos;
  const periodo = periodos.find((p) => p.id === uno(sp.periodo)) ?? periodoEnCurso(periodos);

  if (!hijo || !periodo) {
    return (
      <div>
        <EncabezadoPagina titulo="Notas" seccion="academico" />
        <EstadoVacio icono={ClipboardList} titulo="Aún no hay notas para mostrar" descripcion="Cuando el colegio registre las primeras notas, las verás aquí." />
      </div>
    );
  }
  const datos = await notasDeAlumno(ctx, hijo.id, periodo.id);
  const sinNotas = datos.cursos.every((c) => c.competencias.every((x) => !x.calificacion && !x.informe) && c.evaluaciones.length === 0);

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Notas"
        seccion="academico"
        descripcion={ctx.rol === "alumno" ? "Así va tu avance en cada competencia." : "Así va el avance de tu hijo o hija en cada competencia."}
        acciones={
          !libretaVisibleParaFamilia(periodo) ? undefined : <Link href={`/libreta?alumno=${hijo.id}&periodo=${periodo.id}`} className={buttonVariants({ variant: "outline" })}>
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

      <p className="text-cuerpo-sm text-muted-foreground">
        {datos.alumno.nombres} {datos.alumno.apellidos} · {datos.alumno.salon} · {datos.periodo.nombre}
      </p>

      {sinNotas && <EstadoVacio icono={ClipboardList} titulo="En este periodo todavía no hay notas registradas" descripcion="Apenas el profesor las registre, aparecerán aquí." />}

      <div className="flex max-w-3xl flex-col divide-y divide-borde-sutil rounded-[14px] border border-borde-sutil bg-superficie">
        {datos.cursos.map((curso) => (
          <section key={curso.id} aria-label={curso.nombre} className="flex flex-col gap-4 p-5 sm:p-6">
            <div>
              <h2 className="flex items-center gap-2.5 font-heading text-[18px] leading-6 font-semibold"><GraduationCap className="size-5 text-sec-trazo" strokeWidth={2} aria-hidden />{curso.nombre}</h2>
              {curso.profesor && <p className="mt-1 text-cuerpo-sm text-muted-foreground">Profesor(a): {curso.profesor}</p>}
            </div>
            <div className="flex flex-col gap-4">
              {curso.competencias.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {curso.competencias.map((c) => (
                    <li key={c.id} className="flex flex-col gap-1.5 border-b border-borde-sutil pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium">{c.nombre}</p>
                      <div>{c.calificacion ? <Calificacion valor={c.calificacion} /> : <span className="text-cuerpo-sm text-muted-foreground">Sin calificar todavía</span>}</div>
                      {c.conclusion && <p className="text-cuerpo-sm text-muted-foreground">{c.conclusion}</p>}
                      {c.informe && (
                        <div className="mt-1 rounded-md bg-sec-suave p-3 text-cuerpo-sm text-foreground">
                          <p className="mb-1.5 flex items-center gap-1.5 font-medium"><Sprout className="size-4 text-sec-trazo" strokeWidth={2} aria-hidden />Informe de progreso</p>
                          <dl className="flex flex-col gap-1.5">
                            {c.informe.logros && <div><dt className="font-medium">Ha logrado</dt><dd className="text-muted-foreground">{c.informe.logros}</dd></div>}
                            {c.informe.mejorar && <div><dt className="font-medium">Necesita mejorar</dt><dd className="text-muted-foreground">{c.informe.mejorar}</dd></div>}
                            {c.informe.recomendaciones && <div><dt className="font-medium">Te recomendamos reforzar</dt><dd className="text-muted-foreground">{c.informe.recomendaciones}</dd></div>}
                          </dl>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {curso.evaluaciones.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Registro auxiliar publicado</h3>
                  <p className="mb-2 text-cuerpo-sm text-muted-foreground">Actividades que el profesor ya publicó. No son la calificación oficial de la libreta.</p>
                  {curso.evaluaciones.some((e) => e.valor.marca) && <p className="mb-2 text-cuerpo-sm text-muted-foreground">NSP: No se presentó · NE: No entregó.</p>}
                  <ul className="flex flex-col gap-2">
                    {curso.evaluaciones.map((e) => (
                      <li key={e.id} id={`ev-${e.grupoId}`} className="flex scroll-mt-24 flex-col gap-1 text-sm target:rounded-md target:bg-sec-suave target:p-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            {e.titulo}
                            <span className="text-muted-foreground"> · {e.fecha.slice(8, 10)}/{e.fecha.slice(5, 7)}{e.instrumento ? ` · ${NOMBRE_INSTRUMENTO[e.instrumento]}` : ""}{e.competencia ? ` · ${e.competencia}` : ""}</span>
                          </span>
                          <Calificacion valor={e.valor} />
                        </div>
                        {e.fechaRecuperacion && <p className="text-cuerpo-sm text-muted-foreground">Recuperación rendida el {e.fechaRecuperacion.slice(8, 10)}/{e.fechaRecuperacion.slice(5, 7)}.</p>}
                        {e.vencida && <p className="text-cuerpo-sm text-muted-foreground">Venció el plazo para justificar la falta: se aplicó la regla del colegio.</p>}
                        {e.comentario && <p className="flex items-start gap-1.5 text-muted-foreground"><MessageSquareText className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden /><span><span className="font-medium">Observación:</span> {e.comentario}</span></p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { Alerta } from "@/components/ui/Alerta";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Calificacion } from "@/components/Calificacion";
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
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Notas</h1>
        <Alerta tipo="info">Aún no hay notas para mostrar.</Alerta>
      </div>
    );
  }
  const datos = await notasDeAlumno(ctx, hijo.id, periodo.id);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Notas</h1>
        <p className="text-sm text-pizarra">Así va el avance de tu hijo o hija en cada competencia.</p>
      </div>

      {hijos.length > 1 && (
        <nav aria-label="Hijos" className="flex flex-wrap gap-2">
          {hijos.map((h) => (
            <Link key={h.id} href={`/notas?alumno=${h.id}&periodo=${periodo.id}`} aria-current={h.id === hijo.id ? "page" : undefined}
              className={`rounded-pildora px-4 py-2 text-sm font-semibold ${h.id === hijo.id ? "bg-acento text-sobre-acento" : "border border-arena bg-superficie hover:bg-superficie-2"}`}>
              {h.nombres}
            </Link>
          ))}
        </nav>
      )}
      <nav aria-label="Periodos" className="flex flex-wrap gap-2">
        {periodos.map((p) => (
          <Link key={p.id} href={`/notas?alumno=${hijo.id}&periodo=${p.id}`} aria-current={p.id === periodo.id ? "page" : undefined}
            className={`rounded-pildora px-3 py-1.5 text-sm ${p.id === periodo.id ? "bg-acento font-semibold text-sobre-acento" : "border border-arena bg-superficie hover:bg-superficie-2"}`}>
            {p.nombre}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-pizarra">
        {datos.alumno.nombres} {datos.alumno.apellidos} · {datos.alumno.salon} · {datos.periodo.nombre}
        {" · "}<Link href={`/libreta?alumno=${hijo.id}&periodo=${periodo.id}`} className="font-semibold text-acento underline-offset-4 hover:underline">Ver libreta</Link>
      </p>

      {datos.cursos.every((c) => c.competencias.every((x) => !x.calificacion) && c.evaluaciones.length === 0) && (
        <Alerta tipo="info">En este periodo todavía no hay notas registradas.</Alerta>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {datos.cursos.map((curso) => (
          <Tarjeta key={curso.id} className="flex flex-col gap-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><GraduationCap className="h-5 w-5 text-acento" strokeWidth={2} aria-hidden />{curso.nombre}</h2>
            {curso.competencias.length > 0 && (
              <ul className="flex flex-col gap-3">
                {curso.competencias.map((c) => (
                  <li key={c.id} className="flex flex-col gap-1.5 border-b border-arena pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium">{c.nombre}</p>
                    {c.calificacion ? <Calificacion valor={c.calificacion} /> : <span className="text-xs text-pizarra">Sin calificar todavía</span>}
                    {c.conclusion && <p className="text-sm text-pizarra">{c.conclusion}</p>}
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
                      <span>{e.titulo}<span className="text-pizarra"> · {e.fecha}{e.competencia ? ` · ${e.competencia}` : ""}</span></span>
                      <Calificacion valor={e.valor} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}

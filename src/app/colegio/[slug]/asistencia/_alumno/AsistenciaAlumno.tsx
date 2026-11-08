import { BookOpenCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { PestanasLinea, PestanasSegmento } from "@/components/shell/PestanasPagina";
import { periodoElegido, rangoCorto } from "@/lib/periodos-asistencia";
import { hoyDelColegio } from "@/lib/server/asistencia";
import { opcionesDeReporte, periodosDelAlumno, reporteAlumno, reporteCursos } from "@/lib/server/reportes-asistencia";
import type { TenantContext } from "@/lib/server/tenant";
import { ListaCursos } from "./ListaCursos";
import { ResumenAsistencia } from "./ResumenAsistencia";
import { SelectorPeriodo } from "./SelectorPeriodo";

export type PestanaAsistencia = "resumen" | "llegadas" | "cursos";

/**
 * «Mi asistencia» del alumno y «Reporte de asistencia» de la familia (specs/27): pestañas Resumen · Llegadas (solo el
 * alumno; la familia tiene su calendario aparte) · Cursos, con el periodo (bimestre o «Año») en la URL.
 * `llegadas`: el calendario del mes, que arma la página.
 */
export async function AsistenciaAlumno({ ctx, modo, parametro, llegadas }: {
  ctx: TenantContext;
  modo: "alumno" | "familia";
  parametro: (clave: string) => string | null;
  llegadas?: ReactNode;
}) {
  const tu = modo === "alumno";
  const ruta = tu ? "/asistencia" : "/asistencia/reportes";
  const hoy = hoyDelColegio(ctx).isoFecha;
  const { alumnos } = await opcionesDeReporte(ctx);
  const pedido = parametro("alumno");
  const alumno = alumnos.find((a) => a.id === pedido) ?? alumnos[0];
  if (!alumno) {
    return <EstadoVacio icono={Users} titulo={tu ? "Tu cuenta aún no está vinculada a tu ficha" : "Aún no hay alumnos vinculados a tu cuenta"} descripcion={tu ? "Avisa a la dirección del colegio para que la revise." : "Cuando el colegio vincule a tus hijos, verás aquí su asistencia."} />;
  }
  const pedida = parametro("tab");
  const pestana: PestanaAsistencia = pedida === "cursos" ? "cursos" : pedida === "llegadas" && tu ? "llegadas" : "resumen";
  const periodos = await periodosDelAlumno(ctx, alumno.id);
  const periodoPedido = parametro("periodo");
  const periodo = periodoElegido(periodos, periodoPedido, hoy);

  const href = (cambios: { tab?: PestanaAsistencia; periodo?: string | null; alumno?: string }) => {
    const q = new URLSearchParams();
    const tab = cambios.tab ?? pestana;
    if (tab !== "resumen") q.set("tab", tab);
    const clave = cambios.periodo === undefined ? periodoPedido : cambios.periodo;
    if (clave && tab !== "llegadas") q.set("periodo", clave);
    const a = cambios.alumno ?? (tu ? null : alumno.id);
    if (a && !tu) q.set("alumno", a);
    return q.size ? `${ruta}?${q.toString()}` : ruta;
  };
  const hrefCurso = (cursoId: string) => {
    const q = new URLSearchParams();
    if (!tu) q.set("alumno", alumno.id);
    if (periodoPedido) q.set("periodo", periodoPedido);
    return `/asistencia/curso/${cursoId}${q.size ? `?${q.toString()}` : ""}`;
  };

  const rango = { alumnoId: alumno.id, desde: periodo.desde, hasta: periodo.hasta };
  const [reporte, cursos] = await Promise.all([
    pestana === "resumen" ? reporteAlumno(ctx, rango) : Promise.resolve(null),
    pestana === "llegadas" ? Promise.resolve(null) : reporteCursos(ctx, rango),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {!tu && alumnos.length > 1 && (
        <PestanasSegmento
          etiqueta="Hijo o hija"
          scroll={false}
          items={alumnos.map((a) => ({ href: href({ alumno: a.id }), texto: a.nombres.split(" ")[0], activo: a.id === alumno.id }))}
        />
      )}
      <PestanasLinea
        etiqueta="Vistas de asistencia"
        items={[
          { href: href({ tab: "resumen" }), texto: "Resumen", activo: pestana === "resumen" },
          ...(tu ? [{ href: href({ tab: "llegadas" }), texto: "Llegadas", activo: pestana === "llegadas" }] : []),
          { href: href({ tab: "cursos" }), texto: "Cursos", activo: pestana === "cursos" },
        ]}
      />

      {pestana !== "llegadas" && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <SelectorPeriodo periodos={periodos} actual={periodo.clave} href={(clave) => href({ periodo: clave })} />
          <p className="text-cuerpo-sm text-muted-foreground">
            {periodo.clave === "anio" ? "Desde el inicio de clases" : periodo.nombre} · <span className="tabular-nums">{rangoCorto(periodo.desde, periodo.hasta)}</span>
          </p>
        </div>
      )}

      {pestana === "llegadas" && llegadas}

      {pestana === "resumen" && reporte && cursos && (
        <ResumenAsistencia
          reporte={reporte}
          cursos={cursos}
          periodo={periodo}
          hoy={hoy}
          tu={tu}
          hrefCurso={hrefCurso}
          hrefCursos={href({ tab: "cursos" })}
          hrefPdf={`/api/reportes-asistencia/pdf?${new URLSearchParams({ alumno: alumno.id, desde: periodo.desde, hasta: periodo.hasta }).toString()}`}
        />
      )}

      {pestana === "cursos" && cursos && (
        <section aria-labelledby="titulo-cursos" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="titulo-cursos" className="font-heading text-titulo-2">{tu ? "Tu asistencia en cada curso" : `Asistencia de ${alumno.nombres.split(" ")[0]} en cada curso`}</h2>
            <p className="text-muted-foreground">Toca un curso para ver cada clase: si llegó, a qué hora o si llegó tarde.</p>
          </div>
          {cursos.filas.length === 0 ? (
            <EstadoVacio icono={BookOpenCheck} titulo="Aún no hay asistencia por curso" descripcion="En este nivel el colegio solo registra la asistencia al colegio." />
          ) : (
            <ListaCursos cursos={cursos.filas} hrefCurso={hrefCurso} />
          )}
          <p className="text-cuerpo-sm text-muted-foreground">
            % de asistencia = clases sin falta ÷ clases con lista. Las listas de cada curso no cambian el porcentaje de asistencia al colegio.
          </p>
        </section>
      )}
    </div>
  );
}

import { BookOpen, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { Alerta } from "@/components/ui/Alerta";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { Calificacion } from "@/components/Calificacion";
import { APROBADO_VIGESIMAL, ETIQUETA_LITERAL, LITERALES } from "@/lib/calificaciones";
import { datosLibreta } from "@/lib/server/libreta";
import { alumnosVisibles, listarPeriodos, periodoParaLibreta } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { requireTenantContext } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Libreta" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LibretaPage({ params, searchParams }: PageProps<"/colegio/[slug]/libreta">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "libreta");
  if (!["apoderado", "profesor", "direccion"].includes(ctx.rol)) forbidden();

  const [alumnos, periodos] = await Promise.all([alumnosVisibles(ctx), listarPeriodos(ctx)]);
  const alumno = alumnos.find((a) => a.id === uno(sp.alumno)) ?? alumnos[0];
  const periodo = periodos.find((p) => p.id === uno(sp.periodo)) ?? periodoParaLibreta(periodos);

  const cabecera = (
    <div>
      <h1 className="text-2xl font-bold">Libreta</h1>
      <p className="text-sm text-pizarra">Calificaciones por competencia y conclusiones de cada periodo.</p>
    </div>
  );
  if (!alumno || !periodo) {
    return <div className="flex flex-col gap-4">{cabecera}<Alerta tipo="info">Todavía no hay una libreta para mostrar.</Alerta></div>;
  }

  const datos = await datosLibreta(ctx, alumno.id, periodo.id, "ver");
  const a = datos.asistencia;

  return (
    <div className="flex flex-col gap-5">
      {cabecera}
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-arena bg-superficie p-4">
        {alumnos.length > 1 && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Alumno</span>
            <select name="alumno" defaultValue={alumno.id} className="rounded-md border border-arena bg-superficie px-3 py-2.5">
              {alumnos.map((x) => <option key={x.id} value={x.id}>{x.apellidos}, {x.nombres} · {x.salon.nombre}</option>)}
            </select>
          </label>
        )}
        {alumnos.length === 1 && <input type="hidden" name="alumno" value={alumno.id} />}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Periodo</span>
          <select name="periodo" defaultValue={periodo.id} className="rounded-md border border-arena bg-superficie px-3 py-2.5">
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.anio}{p.cerrado ? "" : " (en curso)"}</option>)}
          </select>
        </label>
        <button className="rounded-md bg-acento px-4 py-2.5 text-sm font-semibold text-sobre-acento hover:opacity-90">Ver</button>
      </form>

      <Tarjeta className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-arena pb-4">
          <div>
            <p className="flex items-center gap-2 font-titulo text-lg font-semibold"><BookOpen className="h-5 w-5 text-acento" strokeWidth={2} aria-hidden />{datos.colegio.nombre}</p>
            <p className="mt-1 font-medium">{datos.alumno.apellidos}, {datos.alumno.nombres}</p>
            <p className="text-sm text-pizarra">{datos.alumno.salon} · {datos.periodo.nombre} {datos.periodo.anio}{datos.alumno.tutor ? ` · Tutor(a): ${datos.alumno.tutor}` : ""}</p>
          </div>
          <a
            href={`/api/libreta/${alumno.id}?periodo=${periodo.id}`}
            className="inline-flex items-center gap-2 rounded-md bg-acento px-4 py-2.5 text-sm font-semibold text-sobre-acento hover:opacity-90"
          >
            <Download className="h-4 w-4" strokeWidth={2} aria-hidden /> Descargar PDF
          </a>
        </div>

        {!datos.periodo.cerrado && <Alerta tipo="aviso">Este periodo sigue en curso: la libreta puede cambiar hasta que el colegio lo cierre.</Alerta>}

        {datos.cursos.map((curso) => (
          <section key={curso.nombre} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{curso.nombre}</h2>
            {curso.competencias.length === 0 && <p className="text-sm text-pizarra">Sin competencias registradas.</p>}
            <ul className="flex flex-col gap-3">
              {curso.competencias.map((c) => (
                <li key={c.nombre} className="flex flex-col gap-1.5 border-b border-arena pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium">{c.nombre}</p>
                  {c.calificacion ? <Calificacion valor={c.calificacion} /> : <span className="text-xs text-pizarra">Sin calificar todavía</span>}
                  {c.conclusion && <p className="text-sm text-pizarra">{c.conclusion}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="flex flex-col gap-1 border-t border-arena pt-4">
          <h2 className="text-lg font-semibold">Asistencia del periodo</h2>
          <p className="text-sm">
            {a.total === 0 ? "No hay asistencia registrada en este periodo." : `Días registrados: ${a.total} · Llegó: ${a.llego} · Tarde: ${a.tarde} · Falta: ${a.falta}${a.problema ? ` · Con problema: ${a.problema}` : ""}`}
          </p>
        </section>

        <section className="flex flex-col gap-1 text-sm text-pizarra">
          <h2 className="text-base font-semibold text-tinta">Escala de calificación</h2>
          {datos.escala === "literal"
            ? <p>{LITERALES.map((l) => `${l}: ${ETIQUETA_LITERAL[l]}`).join(" · ")}</p>
            : <p>Escala vigesimal de 0 a 20. Aprobado desde {APROBADO_VIGESIMAL}.</p>}
        </section>
        <p className="text-xs text-pizarra">Firmada por la dirección de {datos.colegio.nombre}.</p>
      </Tarjeta>
      {ctx.rol === "apoderado" && <p className="text-sm"><Link href={`/notas?alumno=${alumno.id}&periodo=${periodo.id}`} className="font-semibold text-acento underline-offset-4 hover:underline">Ver el detalle de notas</Link></p>}
    </div>
  );
}

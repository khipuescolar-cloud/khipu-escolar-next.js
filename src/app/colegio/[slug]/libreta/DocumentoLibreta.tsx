"use client";

import { BookOpen, Stamp } from "lucide-react";
import { Calificacion } from "@/components/Calificacion";
import { Alerta } from "@/components/ui/Alerta";
import { APROBADO_VIGESIMAL, ETIQUETA_LITERAL, LITERALES } from "@/lib/calificaciones";
import { fechaLima } from "@/lib/fechas";
import type { DatosLibreta } from "@/lib/server/libreta";
import { ComentarioTutor } from "./ComentarioTutor";

/** Documento compartido por la vista de familia y el diálogo de personal. */
export function DocumentoLibreta({ datos, slug }: { datos: DatosLibreta; slug: string }) {
  const a = datos.asistencia;
  const columnas = datos.cursos.flatMap((curso) => curso.competencias.map((competencia) => ({ curso, competencia })));
  return (
    <article aria-label={"Libreta de " + datos.alumno.nombres + " " + datos.alumno.apellidos} className="mx-auto w-full max-w-5xl space-y-7 rounded-[14px] border border-borde-sutil bg-superficie p-4 text-foreground shadow-sombra-1 sm:p-8">
      <header className="space-y-2 border-b border-borde-sutil pb-5 text-center">
        <p className="flex items-center justify-center gap-2 font-heading text-cuerpo font-semibold"><BookOpen className="size-5 text-sec-trazo" strokeWidth={2} aria-hidden />{datos.colegio.nombre}</p>
        <h2 className="font-heading text-xl font-semibold">Informe de progreso del aprendizaje · Libreta</h2>
        {datos.colegio.ciudad && <p className="text-cuerpo-sm text-muted-foreground">{datos.colegio.ciudad}</p>}
      </header>
      <section aria-label="Datos de la libreta" className="overflow-x-auto">
        <table className="w-full min-w-[500px] border-collapse text-left text-cuerpo-sm">
          <caption className="sr-only">Datos del alumno y de la emisión</caption>
          <tbody>
            <tr><th scope="row" className="w-36 border border-borde-sutil bg-superficie-2 px-3 py-2">Alumno</th><td className="border border-borde-sutil px-3 py-2">{datos.alumno.apellidos}, {datos.alumno.nombres}</td><th scope="row" className="w-24 border border-borde-sutil bg-superficie-2 px-3 py-2">Año</th><td className="border border-borde-sutil px-3 py-2">{datos.periodo.anio}</td></tr>
            <tr><th scope="row" className="border border-borde-sutil bg-superficie-2 px-3 py-2">Grado y sección</th><td className="border border-borde-sutil px-3 py-2">{datos.alumno.salon}</td><th scope="row" className="border border-borde-sutil bg-superficie-2 px-3 py-2">Periodo</th><td className="border border-borde-sutil px-3 py-2">{datos.periodo.nombre}</td></tr>
            <tr><th scope="row" className="border border-borde-sutil bg-superficie-2 px-3 py-2">{datos.alumno.tutorTitulo}</th><td className="border border-borde-sutil px-3 py-2">{datos.alumno.tutor ?? "No asignado"}</td><th scope="row" className="border border-borde-sutil bg-superficie-2 px-3 py-2">Emisión</th><td className="border border-borde-sutil px-3 py-2">{datos.emision ? "Versión " + datos.emision.version : "Borrador en curso"}</td></tr>
          </tbody>
        </table>
      </section>
      {!datos.emision && !datos.periodo.cerrado && <Alerta tipo="aviso">Este periodo sigue en curso: la libreta puede cambiar hasta que el colegio lo cierre.</Alerta>}
      <section className="space-y-3">
        <h3 className="font-heading text-base font-semibold">Calificaciones por competencia</h3>
        <div className="overflow-x-auto rounded-lg border border-borde-sutil" role="region" aria-label="Cuadro de calificaciones" tabIndex={0}>
          <table className="w-full min-w-[720px] border-collapse text-cuerpo-sm">
            <caption className="sr-only">Cursos, competencias, calificaciones y conclusiones descriptivas</caption>
            <thead className="bg-superficie-2"><tr><th scope="col" className="w-36 border-r border-b border-borde-sutil px-3 py-2 text-left">Área / Curso</th><th scope="col" className="w-2/5 border-r border-b border-borde-sutil px-3 py-2 text-left">Competencia</th><th scope="col" className="w-32 border-r border-b border-borde-sutil px-3 py-2 text-center">Calificación</th><th scope="col" className="border-b border-borde-sutil px-3 py-2 text-left">Conclusión descriptiva</th></tr></thead>
            <tbody>
              {datos.cursos.map((curso) => curso.competencias.length ? curso.competencias.map((c, i) => (
                <tr key={c.id}>
                  {i === 0 && <th scope="rowgroup" rowSpan={curso.competencias.length} className="border-r border-b border-borde-sutil bg-superficie-2 px-3 py-3 text-left align-top font-semibold">{curso.nombre}</th>}
                  <th scope="row" className="border-r border-b border-borde-sutil px-3 py-3 text-left align-top font-medium">
                    {c.nombre}
                    {c.capacidades.length > 0 && <p className="mt-1 font-normal text-muted-foreground">Capacidades: {c.capacidades.join(" · ")}</p>}
                    {c.desempenosEvaluados.length > 0 && <details className="mt-2 font-normal"><summary className="cursor-pointer text-primary">Desempeños evaluados ({c.desempenosEvaluados.length})</summary><ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">{c.desempenosEvaluados.map((d) => <li key={d}>{d}</li>)}</ul></details>}
                  </th>
                  <td className="border-r border-b border-borde-sutil px-2 py-3 text-center align-top">{c.calificacion ? <Calificacion valor={c.calificacion} /> : <span className="text-muted-foreground">Sin calificar</span>}</td>
                  <td className="border-b border-borde-sutil px-3 py-3 align-top">{c.conclusion || <span className="text-muted-foreground">—</span>}</td>
                </tr>
              )) : <tr key={curso.id}><th scope="row" className="border-r border-b border-borde-sutil bg-superficie-2 px-3 py-3 text-left">{curso.nombre}</th><td colSpan={3} className="border-b border-borde-sutil px-3 py-3 text-muted-foreground">Sin competencias registradas.</td></tr>)}
              {columnas.length === 0 && datos.cursos.length === 0 && <tr><td colSpan={4} className="px-3 py-4 text-muted-foreground">Sin cursos registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section className="space-y-3">
        <h3 className="font-heading text-base font-semibold">Asistencia del periodo</h3>
        <div className="overflow-x-auto"><table className="w-full min-w-[420px] border-collapse text-center text-cuerpo-sm tabular-nums"><caption className="sr-only">Resumen de asistencia</caption><thead className="bg-superficie-2"><tr>{["Días registrados", "Llegó", "Tarde", "No llegó"].map((x) => <th key={x} scope="col" className="border border-borde-sutil px-3 py-2">{x}</th>)}</tr></thead><tbody><tr>{[a.total, a.llego, a.tarde, a.falta].map((x, i) => <td key={i} className="border border-borde-sutil px-3 py-2">{x}</td>)}</tr></tbody></table></div>
        {a.problema > 0 && <p className="text-cuerpo-sm text-muted-foreground">Avisos registrados: {a.problema}</p>}
      </section>
      {(datos.comentarioTutor || datos.puedeComentar) && <section className="space-y-3"><h3 className="font-heading text-base font-semibold">Comentario de tutoría</h3><div className="rounded-lg border border-borde-sutil bg-superficie-2 p-4">{datos.puedeComentar ? <ComentarioTutor slug={slug} alumnoId={datos.alumno.id} periodoId={datos.periodo.id} texto={datos.comentarioTutor ?? ""} /> : <p className="text-sm">{datos.comentarioTutor}</p>}</div></section>}
      <section className="space-y-3"><h3 className="font-heading text-base font-semibold">Escala de calificación</h3>{datos.escala === "literal" ? <div className="overflow-x-auto"><table className="w-full border-collapse text-cuerpo-sm"><caption className="sr-only">Escala literal de calificación</caption><tbody>{LITERALES.map((l) => <tr key={l}><th scope="row" className="w-16 border border-borde-sutil bg-superficie-2 px-3 py-1.5 text-left">{l}</th><td className="border border-borde-sutil px-3 py-1.5">{ETIQUETA_LITERAL[l]}</td></tr>)}</tbody></table></div> : <p className="text-cuerpo-sm text-muted-foreground">Escala vigesimal de 0 a 20. Aprobado desde {APROBADO_VIGESIMAL}.</p>}</section>
      <footer className="space-y-8 border-t border-borde-sutil pt-5">
        {datos.emision && <p className="flex items-start gap-2 text-cuerpo-sm text-muted-foreground"><Stamp className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />Versión {datos.emision.version} emitida el {fechaLima(datos.emision.emitidaAt)} por {datos.emision.por}. {datos.emision.version > 1 && "Reemplaza a la versión anterior."}</p>}
        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-cuerpo-sm"><p className="border-t border-borde-sutil pt-2">Tutor(a)</p><p className="border-t border-borde-sutil pt-2">Dirección</p></div>
      </footer>
    </article>
  );
}

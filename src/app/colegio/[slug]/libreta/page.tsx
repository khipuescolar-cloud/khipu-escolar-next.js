import { BookOpen, CheckCircle2, Clock, Download, NotebookText, Stamp, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { TituloBloque } from "@/components/academico/TituloBloque";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Calificacion } from "@/components/Calificacion";
import { APROBADO_VIGESIMAL, ETIQUETA_LITERAL, LITERALES, textoValor } from "@/lib/calificaciones";
import { fechaLima } from "@/lib/fechas";
import { listarRectificaciones } from "@/lib/server/libreta-emision";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { libretaVisibleParaFamilia } from "@/lib/libreta-publicacion";
import { datosLibreta } from "@/lib/server/libreta";
import { alumnosVisibles, listarPeriodos, periodoParaLibreta } from "@/lib/server/notas";
import { requireFeature } from "@/lib/server/plan";
import { esVistaFamilia } from "@/lib/roles";
import { requireAlumnoVisible, requireTenantContext } from "@/lib/server/tenant";
import { resolverRectificacionAction } from "./actions";
import { ComentarioTutor } from "./ComentarioTutor";
import { FormRectificacion } from "./Rectificacion";

export const metadata: Metadata = { title: "Libreta" };

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function LibretaPage({ params, searchParams }: PageProps<"/colegio/[slug]/libreta">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireTenantContext(slug);
  requireFeature(ctx, "libreta");
  if (!["apoderado", "alumno", "profesor", "direccion"].includes(ctx.rol)) forbidden();
  const familia = esVistaFamilia(ctx.rol);

  // `?alumno=` (enlaces de notas y avisos) abre la libreta de ese alumno, solo si está en el alcance del usuario.
  const pedido = uno(sp.alumno);
  if (pedido) await requireAlumnoVisible(ctx, pedido);
  const [alumnos, todos] = await Promise.all([alumnosVisibles(ctx), listarPeriodos(ctx)]);
  const alumno = alumnos.find((a) => a.id === pedido) ?? alumnos[0];
  // Solo los periodos del nivel del alumno; las familias (y el propio alumno), solo los que el colegio publicó.
  const delNivel = alumno ? todos.filter((p) => p.niveles.includes(alumno.salon.nivel)) : todos;
  const periodos = familia ? delNivel.filter(libretaVisibleParaFamilia) : delNivel;
  const periodo = periodos.find((p) => p.id === uno(sp.periodo)) ?? periodoParaLibreta(periodos);

  const titulo = "Libreta";
  const descripcion = "Calificaciones por competencia y conclusiones de cada periodo.";
  if (!alumno || !periodo) {
    return (
      <div>
        <EncabezadoPagina titulo={titulo} seccion="academico" descripcion={descripcion} />
        <EstadoVacio icono={NotebookText} titulo="Todavía no hay una libreta para mostrar" descripcion={familia ? "Cuando el colegio publique la libreta de un periodo, la verás aquí y te avisaremos." : "Cuando el colegio cree un periodo con notas, la verás aquí."} />
      </div>
    );
  }

  const datos = await datosLibreta(ctx, alumno.id, periodo.id, "ver");
  const a = datos.asistencia;
  // Rectificaciones (specs/37): solo con la libreta emitida; profesor en sus cursos, dirección en todos.
  const personal = ctx.rol === "profesor" || ctx.rol === "direccion";
  const rectificaciones = personal && datos.emision ? await listarRectificaciones(ctx, { alumnoId: alumno.id, periodoId: periodo.id }) : [];
  const cursosPropios = ctx.rol === "profesor" ? new Set((await ctx.db.curso.findMany({ where: { profesorId: ctx.membership.id }, select: { id: true } })).map((c) => c.id)) : null;
  const competenciasRectificables = datos.cursos
    .filter((c) => !cursosPropios || cursosPropios.has(c.id))
    .flatMap((c) => c.competencias.map((x) => ({ id: x.id, nombre: `${c.nombre} · ${x.nombre}`, actual: x.calificacion ? textoValor(x.calificacion) : "sin calificar" })));

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo={titulo}
        seccion="academico"
        descripcion={descripcion}
        acciones={
          // El PDF lo descarga la familia o el colegio (`/api/libreta` no admite al rol alumno).
          ctx.rol === "alumno" ? undefined : (
            <a href={`/api/libreta/${alumno.id}?periodo=${periodo.id}`} className={buttonVariants()}>
              <Download strokeWidth={2} aria-hidden /> Descargar PDF
            </a>
          )
        }
      />
      <section aria-label="Alumno y periodo" className="rounded-[14px] border border-borde-sutil bg-superficie p-4">
        <form method="get" className={`grid gap-3 ${alumnos.length > 1 ? "sm:grid-cols-[1fr_1fr_auto]" : "sm:grid-cols-[1fr_auto]"} sm:items-end`}>
          {alumnos.length > 1 && (
            <Selector etiqueta="Alumno" name="alumno" defaultValue={alumno.id}>
              {alumnos.map((x) => <option key={x.id} value={x.id}>{x.apellidos}, {x.nombres} · {x.salon.nombre}</option>)}
            </Selector>
          )}
          {alumnos.length === 1 && <input type="hidden" name="alumno" value={alumno.id} />}
          <Selector etiqueta="Periodo" name="periodo" defaultValue={periodo.id}>
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.anio}{p.cerrado ? "" : " (en curso)"}</option>)}
          </Selector>
          <Boton type="submit" variante="secundario">Ver</Boton>
        </form>
      </section>

      <article aria-label={`Libreta de ${datos.alumno.nombres} ${datos.alumno.apellidos}`} className="flex w-full flex-col gap-8 rounded-[14px] border border-borde-sutil bg-superficie p-5 sm:p-8">
        <header className="flex flex-col gap-1 border-b border-borde-sutil pb-5">
          <p className="flex items-center gap-2 font-heading text-cuerpo font-semibold"><BookOpen className="size-5 text-sec-trazo" strokeWidth={2} aria-hidden />{datos.colegio.nombre}</p>
          <p className="font-heading text-[22px] leading-7 font-semibold">{datos.alumno.apellidos}, {datos.alumno.nombres}</p>
          <p className="text-cuerpo-sm text-muted-foreground">{datos.alumno.salon} · {datos.periodo.nombre} {datos.periodo.anio}{datos.alumno.tutor ? ` · ${datos.alumno.tutorTitulo}: ${datos.alumno.tutor}` : ""}</p>
        </header>

        {datos.emision ? (
          <p className="-mt-3 flex items-start gap-2 text-cuerpo-sm text-muted-foreground">
            <Stamp className="mt-0.5 size-4 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden />
            Versión {datos.emision.version} emitida el {fechaLima(datos.emision.emitidaAt)} por {datos.emision.por}.{" "}
            {datos.emision.version > 1 ? "Reemplaza a la anterior por una rectificación aprobada." : "No cambia aunque cambien las notas después."}
          </p>
        ) : (
          !datos.periodo.cerrado && <Alerta tipo="aviso">Este periodo sigue en curso: la libreta puede cambiar hasta que el colegio lo cierre.</Alerta>
        )}

        {datos.cursos.map((curso) => (
          <section key={curso.nombre} className="flex flex-col gap-1">
            <TituloBloque>{curso.nombre}</TituloBloque>
            {curso.competencias.length === 0 && <p className="mt-2 text-cuerpo-sm text-muted-foreground">Sin competencias registradas.</p>}
            <ul className="mt-2 flex flex-col divide-y divide-borde-sutil border-y border-borde-sutil">
              {curso.competencias.map((c) => (
                <li key={c.nombre} className="flex flex-col gap-1.5 py-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <p className="text-sm font-medium">{c.nombre}</p>
                    {c.capacidades.length > 0 && (
                      <p className="text-cuerpo-sm text-muted-foreground"><span className="font-medium">Capacidades:</span> {c.capacidades.join(" · ")}</p>
                    )}
                    {c.conclusion && <p className="max-w-prose text-cuerpo-sm text-muted-foreground">{c.conclusion}</p>}
                    {c.desempenosEvaluados.length > 0 && (
                      <details className="text-cuerpo-sm">
                        <summary className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline">Desempeños evaluados ({c.desempenosEvaluados.length})</summary>
                        <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
                          {c.desempenosEvaluados.map((d) => <li key={d}>{d}</li>)}
                        </ul>
                      </details>
                    )}
                  </div>
                  <div className="sm:text-right">{c.calificacion ? <Calificacion valor={c.calificacion} /> : <span className="text-cuerpo-sm text-muted-foreground">Sin calificar todavía</span>}</div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {(datos.comentarioTutor || datos.puedeComentar) && (
          <section className="flex flex-col gap-3">
            <TituloBloque>Comentario de tutoría</TituloBloque>
            {datos.puedeComentar ? (
              <ComentarioTutor slug={slug} alumnoId={alumno.id} periodoId={periodo.id} texto={datos.comentarioTutor ?? ""} />
            ) : (
              <p className="max-w-prose text-sm">{datos.comentarioTutor}</p>
            )}
          </section>
        )}

        <section className="flex flex-col gap-2">
          <TituloBloque>Asistencia del periodo</TituloBloque>
          <p className="text-sm tabular-nums">
            {a.total === 0 ? "No hay asistencia registrada en este periodo." : `Días registrados: ${a.total} · Llegó: ${a.llego} · Tarde: ${a.tarde} · No llegó: ${a.falta}${a.problema ? ` · Aviso: ${a.problema}` : ""}`}
          </p>
        </section>

        <section className="flex flex-col gap-2 text-cuerpo-sm text-muted-foreground">
          <TituloBloque>Escala de calificación</TituloBloque>
          {datos.escala === "literal"
            ? <p>{LITERALES.map((l) => `${l}: ${ETIQUETA_LITERAL[l]}`).join(" · ")}</p>
            : <p>Escala vigesimal de 0 a 20. Aprobado desde {APROBADO_VIGESIMAL}.</p>}
        </section>
        <p className="border-t border-borde-sutil pt-4 text-cuerpo-sm text-muted-foreground">Firmada por la dirección de {datos.colegio.nombre}.</p>
      </article>
      {personal && datos.emision && (
        <section aria-labelledby="rectificaciones" className="flex flex-col gap-3">
          <TituloBloque
            id="rectificaciones"
            descripcion="La libreta emitida no se edita. Si hay un error, pide una rectificación: dirección la revisa y, si la aprueba, se emite una versión nueva. La anterior se conserva."
          >
            Rectificaciones
          </TituloBloque>
          <div className="rounded-[14px] border border-borde-sutil bg-superficie px-4 sm:px-5">
            {rectificaciones.length > 0 && (
              <ul className="divide-y divide-borde-sutil">
                {rectificaciones.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 py-4 text-sm">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.curso} · {r.competencia}</span>
                      <span>{r.anterior ?? "sin calificar"} → <strong>{r.nuevo}</strong></span>
                      <EstadoRectificacion estado={r.estado} />
                    </p>
                    <p className="text-cuerpo-sm text-muted-foreground">Motivo: {r.motivo}{r.evidencia ? ` · Evidencia: ${r.evidencia}` : ""}</p>
                    <p className="text-cuerpo-sm text-muted-foreground">
                      Pidió {r.solicitadaPor} el {fechaLima(r.solicitadaAt)}
                      {r.resueltaPor && r.resueltaAt && ` · resolvió ${r.resueltaPor} el ${fechaLima(r.resueltaAt)}`}
                      {r.version && ` · versión ${r.version}`}
                    </p>
                    {ctx.rol === "direccion" && r.estado === "pendiente" && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        <BotonConfirmar
                          etiqueta="Aprobar" variante="default"
                          titulo="¿Aprobar la rectificación?"
                          descripcion="Se emite una versión nueva de la libreta con esta calificación corregida y se avisa a la familia. La versión anterior se conserva."
                          confirmar="Aprobar y emitir"
                          accion={resolverRectificacionAction.bind(null, slug, r.id, "aprobada")}
                        />
                        <BotonConfirmar
                          etiqueta="Rechazar" variante="outline"
                          titulo="¿Rechazar la rectificación?"
                          descripcion="La libreta emitida no cambia."
                          confirmar="Rechazar"
                          accion={resolverRectificacionAction.bind(null, slug, r.id, "rechazada")}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {rectificaciones.length === 0 && <p className="py-4 text-cuerpo-sm text-muted-foreground">Todavía no hay rectificaciones de esta libreta.</p>}
            {competenciasRectificables.length > 0 && (
              <details className="border-t border-borde-sutil py-4 text-sm">
                <summary className="cursor-pointer font-medium text-primary underline-offset-4 hover:underline">Pedir una rectificación</summary>
                <div className="mt-3 max-w-xl">
                  <FormRectificacion slug={slug} alumnoId={alumno.id} periodoId={periodo.id} escala={datos.escala} competencias={competenciasRectificables} />
                </div>
              </details>
            )}
          </div>
        </section>
      )}
      {familia && <p className="text-sm"><Link href={`/notas?alumno=${alumno.id}&periodo=${periodo.id}`} className="enlace">Ver el detalle de notas</Link></p>}
    </div>
  );
}

function EstadoRectificacion({ estado }: { estado: "pendiente" | "aprobada" | "rechazada" }) {
  const v = {
    pendiente: { Icono: Clock, texto: "Pendiente", clase: "bg-superficie-2 text-muted-foreground" },
    aprobada: { Icono: CheckCircle2, texto: "Aprobada", clase: "bg-llego-fondo text-llego" },
    rechazada: { Icono: XCircle, texto: "Rechazada", clase: "bg-falta-fondo text-falta" },
  }[estado];
  return (
    <span className={`inline-flex items-center gap-1 rounded-pildora px-2 py-0.5 text-etiqueta ${v.clase}`}>
      <v.Icono className="size-3.5" strokeWidth={2} aria-hidden />{v.texto}
    </span>
  );
}

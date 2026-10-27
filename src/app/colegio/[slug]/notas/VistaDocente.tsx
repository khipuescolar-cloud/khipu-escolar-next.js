import { CalendarDays, Lock, Plus } from "lucide-react";
import Link from "next/link";
import { Alerta } from "@/components/ui/Alerta";
import { Campo } from "@/components/ui/Campo";
import { Tarjeta } from "@/components/ui/Tarjeta";
import { FormAccion } from "@/components/FormAccion";
import { ETIQUETA_LITERAL, LITERALES, formatearNumero } from "@/lib/calificaciones";
import { fechaLima } from "@/lib/fechas";
import { calificacionesPeriodo, cursosDelDocente, grillaNotas, listarPeriodos, periodoEnCurso } from "@/lib/server/notas";
import type { TenantContext } from "@/lib/server/tenant";
import {
  crearCompetenciaAction, crearEvaluacionAction, editarEvaluacionAction, eliminarCompetenciaAction, eliminarEvaluacionAction,
} from "./actions";
import { FilaCalificacion } from "./FilaCalificacion";
import { GrillaNotas } from "./GrillaNotas";

type SP = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const SECCIONES = [
  { id: "notas", nombre: "Notas por evaluación" },
  { id: "periodo", nombre: "Calificación del periodo" },
  { id: "competencias", nombre: "Competencias" },
] as const;

export async function VistaDocente({ ctx, slug, sp }: { ctx: TenantContext; slug: string; sp: SP }) {
  const [cursos, periodos] = await Promise.all([cursosDelDocente(ctx), listarPeriodos(ctx)]);
  const curso = cursos.find((c) => c.id === uno(sp.curso)) ?? cursos[0];
  const periodo = periodos.find((p) => p.id === uno(sp.periodo)) ?? periodoEnCurso(periodos);
  const seccion = SECCIONES.find((s) => s.id === uno(sp.seccion))?.id ?? "notas";
  const esDireccion = ctx.rol === "direccion";

  const encabezado = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">Notas</h1>
        <p className="text-sm text-pizarra">
          Escala {ctx.tenant.escalaCalificacion === "literal" ? "literal (AD, A, B, C)" : "vigesimal (0 a 20)"}.
        </p>
      </div>
      {esDireccion && (
        <Link href="/notas/periodos" className="inline-flex items-center gap-2 rounded-md border border-arena bg-superficie px-4 py-2.5 text-sm font-semibold hover:bg-superficie-2">
          <CalendarDays className="h-4 w-4" strokeWidth={2} aria-hidden /> Gestionar periodos
        </Link>
      )}
    </div>
  );

  if (!curso || !periodo) {
    return (
      <div className="flex flex-col gap-4">
        {encabezado}
        <Alerta tipo="info">
          {!curso ? "Todavía no tienes cursos asignados." : "Dirección aún no ha creado los periodos del año."}
        </Alerta>
      </div>
    );
  }

  const base = `curso=${curso.id}&periodo=${periodo.id}`;

  return (
    <div className="flex flex-col gap-5">
      {encabezado}

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-arena bg-superficie p-4">
        <input type="hidden" name="seccion" value={seccion} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Curso</span>
          <select name="curso" defaultValue={curso.id} className="rounded-md border border-arena bg-superficie px-3 py-2.5">
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.salon.nombre}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Periodo</span>
          <select name="periodo" defaultValue={periodo.id} className="rounded-md border border-arena bg-superficie px-3 py-2.5">
            {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.anio}{p.cerrado ? " (cerrado)" : ""}</option>)}
          </select>
        </label>
        <button className="rounded-md bg-acento px-4 py-2.5 text-sm font-semibold text-sobre-acento hover:opacity-90">Ver</button>
      </form>

      {periodo.cerrado && (
        <div className="flex items-center gap-2 rounded-md bg-superficie-2 px-3 py-2.5 text-sm">
          <Lock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
          <p><span className="font-semibold">Periodo cerrado.</span> Solo puedes mirar las notas; ya no se pueden cambiar.</p>
        </div>
      )}
      {esDireccion && !periodo.cerrado && <Alerta tipo="info">Estás viendo las notas como dirección. Solo los profesores del curso pueden editarlas.</Alerta>}

      <nav aria-label="Secciones" className="flex flex-wrap gap-2">
        {SECCIONES.map((s) => (
          <Link
            key={s.id}
            href={`/notas?${base}&seccion=${s.id}`}
            aria-current={s.id === seccion ? "page" : undefined}
            className={`rounded-pildora px-4 py-2 text-sm font-semibold ${s.id === seccion ? "bg-acento text-sobre-acento" : "border border-arena bg-superficie hover:bg-superficie-2"}`}
          >
            {s.nombre}
          </Link>
        ))}
      </nav>

      {seccion === "notas" && <SeccionNotas ctx={ctx} slug={slug} cursoId={curso.id} periodoId={periodo.id} />}
      {seccion === "periodo" && <SeccionPeriodo ctx={ctx} slug={slug} cursoId={curso.id} periodoId={periodo.id} sp={sp} />}
      {seccion === "competencias" && <SeccionCompetencias ctx={ctx} slug={slug} cursoId={curso.id} periodoId={periodo.id} />}
    </div>
  );
}

async function SeccionNotas({ ctx, slug, cursoId, periodoId }: { ctx: TenantContext; slug: string; cursoId: string; periodoId: string }) {
  const g = await grillaNotas(ctx, cursoId, periodoId);
  const puedeCrear = ctx.rol === "profesor" && !g.periodo.cerrado;
  const selectCompetencia = (defecto?: string | null) => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">Competencia</span>
      <select name="competenciaId" defaultValue={defecto ?? ""} className="rounded-md border border-arena bg-superficie px-3 py-2.5">
        <option value="">Sin competencia</option>
        {g.competencias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
      </select>
    </label>
  );
  return (
    <div className="flex flex-col gap-5">
      {g.escala === "literal" && (
        <p className="text-sm text-pizarra">
          {LITERALES.map((l) => `${l}: ${ETIQUETA_LITERAL[l]}`).join(" · ")}
        </p>
      )}
      <GrillaNotas slug={slug} escala={g.escala} editable={g.editable} alumnos={g.alumnos} evaluaciones={g.evaluaciones} notas={g.notas} />

      {puedeCrear && (
        <Tarjeta>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5" strokeWidth={2} aria-hidden />Nueva evaluación</h2>
          <FormAccion accion={crearEvaluacionAction.bind(null, slug)} etiqueta="Crear evaluación" className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="cursoId" value={cursoId} />
            <input type="hidden" name="periodoId" value={periodoId} />
            <Campo etiqueta="Título" name="titulo" required maxLength={120} placeholder="Práctica 2" />
            {selectCompetencia()}
            <Campo etiqueta="Fecha" name="fecha" type="date" required defaultValue={fechaLima(new Date())} />
            <Campo etiqueta="Peso" name="peso" type="number" min={0.01} step={0.01} defaultValue={1} required ayuda="Cuánto cuenta en el promedio." />
          </FormAccion>
        </Tarjeta>
      )}

      {puedeCrear && g.evaluaciones.length > 0 && (
        <Tarjeta>
          <h2 className="mb-3 text-lg font-semibold">Editar evaluaciones</h2>
          <ul className="flex flex-col gap-2">
            {g.evaluaciones.map((e) => (
              <li key={e.id}>
                <details className="rounded-md border border-arena px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">{e.titulo} · {e.fecha} · peso {formatearNumero(e.peso)}</summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <FormAccion accion={editarEvaluacionAction.bind(null, slug, e.id)} etiqueta="Guardar cambios" variante="secundario" className="grid gap-3 sm:grid-cols-2">
                      <Campo etiqueta="Título" name="titulo" required defaultValue={e.titulo} />
                      {selectCompetencia(e.competenciaId)}
                      <Campo etiqueta="Fecha" name="fecha" type="date" required defaultValue={e.fecha} />
                      <Campo etiqueta="Peso" name="peso" type="number" min={0.01} step={0.01} required defaultValue={e.peso} />
                    </FormAccion>
                    <FormAccion accion={eliminarEvaluacionAction.bind(null, slug, e.id)} etiqueta="Eliminar evaluación" variante="peligro" />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
    </div>
  );
}

async function SeccionPeriodo({ ctx, slug, cursoId, periodoId, sp }: { ctx: TenantContext; slug: string; cursoId: string; periodoId: string; sp: SP }) {
  const c = await calificacionesPeriodo(ctx, cursoId, periodoId);
  const fila = c.filas.find((f) => f.competencia.id === uno(sp.competencia)) ?? c.filas[0];
  if (!fila) {
    return <Alerta tipo="info">Primero agrega las competencias del curso en la pestaña «Competencias».</Alerta>;
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-pizarra">
        La calificación sugerida sale de las notas del periodo
        {c.escala === "vigesimal" ? " (promedio con pesos, redondeado)" : " (la más frecuente; si empatan, la más reciente)"}.
        Tú la confirmas o la cambias.
        {c.escala === "literal" && " En B y C la conclusión descriptiva es obligatoria."}
      </p>
      <nav aria-label="Competencias" className="flex flex-wrap gap-2">
        {c.filas.map((f) => (
          <Link
            key={f.competencia.id}
            href={`/notas?curso=${cursoId}&periodo=${periodoId}&seccion=periodo&competencia=${f.competencia.id}`}
            aria-current={f.competencia.id === fila.competencia.id ? "page" : undefined}
            className={`rounded-pildora px-3 py-1.5 text-sm ${f.competencia.id === fila.competencia.id ? "bg-acento font-semibold text-sobre-acento" : "border border-arena bg-superficie hover:bg-superficie-2"}`}
          >
            {f.competencia.nombre}
          </Link>
        ))}
      </nav>
      <ul className="flex flex-col gap-3">
        {fila.alumnos.map((a) => (
          <li key={a.alumno.id}>
            <FilaCalificacion
              slug={slug} escala={c.escala} editable={c.editable}
              alumno={a.alumno} competenciaId={fila.competencia.id} periodoId={periodoId}
              guardado={a.guardado} sugerido={a.sugerido} cantidadNotas={a.cantidadNotas}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

async function SeccionCompetencias({ ctx, slug, cursoId, periodoId }: { ctx: TenantContext; slug: string; cursoId: string; periodoId: string }) {
  const g = await grillaNotas(ctx, cursoId, periodoId);
  const puedeEditar = ctx.rol === "profesor";
  return (
    <div className="flex flex-col gap-4">
      <Tarjeta>
        <h2 className="mb-3 text-lg font-semibold">Competencias de {g.curso.nombre}</h2>
        {g.competencias.length === 0 ? (
          <p className="text-sm text-pizarra">Este curso aún no tiene competencias.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {g.competencias.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-arena pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{c.nombre}</p>
                  {c.descripcion && <p className="text-sm text-pizarra">{c.descripcion}</p>}
                </div>
                {puedeEditar && (
                  <FormAccion accion={eliminarCompetenciaAction.bind(null, slug, c.id)} etiqueta="Eliminar" variante="fantasma" />
                )}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
      {puedeEditar && (
        <Tarjeta>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Plus className="h-5 w-5" strokeWidth={2} aria-hidden />Nueva competencia</h2>
          <FormAccion accion={crearCompetenciaAction.bind(null, slug)} etiqueta="Agregar competencia">
            <input type="hidden" name="cursoId" value={cursoId} />
            <Campo etiqueta="Nombre" name="nombre" required maxLength={200} placeholder="Resuelve problemas de cantidad" />
            <Campo etiqueta="Descripción (opcional)" name="descripcion" maxLength={500} />
          </FormAccion>
        </Tarjeta>
      )}
    </div>
  );
}

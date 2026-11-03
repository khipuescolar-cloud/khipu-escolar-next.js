import {
  BookMarked, CalendarDays, CheckCircle2, Download, Eye, EyeOff, GraduationCap, History, Info, ListChecks, Lock, Pencil, Plus, Send, Target,
} from "lucide-react";
import Link from "next/link";
import { DialogoAccion } from "@/components/academico/DialogoAccion";
import { NavegacionPildoras } from "@/components/academico/NavegacionPildoras";
import { Alerta } from "@/components/ui/Alerta";
import { Boton } from "@/components/ui/Boton";
import { Campo } from "@/components/ui/Campo";
import { Selector } from "@/components/ui/Selector";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { ETIQUETA_LITERAL, INSTRUMENTOS, LITERALES, NOMBRE_INSTRUMENTO, formatearNumero, textoCalculo, type Instrumento } from "@/lib/calificaciones";
import { fechaLima, formatoHora } from "@/lib/fechas";
import { Textarea } from "@/components/ui/textarea";
import { desempenosParaEvaluar } from "@/lib/server/cneb";
import {
  calificacionesPeriodo, cierreDeCurso, cursosDelDocente, grillaNotas, historialEvaluacion, informesProgreso, listarPeriodos, periodoEnCurso,
} from "@/lib/server/notas";
import type { TenantContext } from "@/lib/server/tenant";
import {
  cerrarCursoAction, compartirInformeAction, crearCompetenciaAction, crearEvaluacionAction, reabrirCursoAction, editarEvaluacionAction,
  eliminarCompetenciaAction, eliminarEvaluacionAction, publicarEvaluacionAction,
} from "./actions";
import { CompetenciaYDesempenos } from "./CompetenciaYDesempenos";
import { CompetenciasYDesempenos } from "./CompetenciasYDesempenos";
import { FilaInforme } from "./FilaInforme";
import { FilaCalificacion } from "./FilaCalificacion";
import { GrillaNotas } from "./GrillaNotas";
import { ImportarNotas } from "./ImportarNotas";
import { SeccionCneb } from "./SeccionCneb";

type SP = Record<string, string | string[] | undefined>;
const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const SECCIONES = [
  { id: "notas", nombre: "Registro auxiliar" },
  { id: "informe", nombre: "Informe de progreso" },
  { id: "periodo", nombre: "Calificación del periodo" },
  { id: "competencias", nombre: "Competencias" },
  { id: "cneb", nombre: "Capacidades y desempeños" },
  { id: "excel", nombre: "Importar y exportar" },
] as const;

export async function VistaDocente({ ctx, slug, sp }: { ctx: TenantContext; slug: string; sp: SP }) {
  const [cursos, todos] = await Promise.all([cursosDelDocente(ctx), listarPeriodos(ctx)]);
  const curso = cursos.find((c) => c.id === uno(sp.curso)) ?? cursos[0];
  // Cada nivel tiene su organización del año (bimestres, trimestres o semestres): solo los periodos del nivel del curso.
  const periodos = curso ? todos.filter((p) => p.niveles.includes(curso.salon.nivel)) : todos;
  const periodo = periodos.find((p) => p.id === uno(sp.periodo)) ?? periodoEnCurso(periodos);
  const seccion = SECCIONES.find((s) => s.id === uno(sp.seccion))?.id ?? "notas";
  const esDireccion = ctx.rol === "direccion";

  const descripcion = `Escala ${ctx.tenant.escalaCalificacion === "literal" ? "literal (AD, A, B, C)" : "vigesimal (0 a 20)"}.`;
  const botonPeriodos = esDireccion && (
    <Link href="/notas/periodos" className={buttonVariants({ variant: "outline" })}>
      <CalendarDays strokeWidth={2} aria-hidden /> Gestionar periodos
    </Link>
  );

  if (!curso || !periodo) {
    return (
      <div>
        <EncabezadoPagina titulo="Notas" descripcion={descripcion} acciones={botonPeriodos} />
        <EstadoVacio
          icono={!curso ? GraduationCap : CalendarDays}
          titulo={!curso ? "Todavía no tienes cursos asignados" : "Aún no hay periodos del año"}
          descripcion={!curso ? "Cuando dirección te asigne un curso, podrás registrar notas aquí." : "Dirección aún no ha creado los periodos del año."}
        />
      </div>
    );
  }

  const base = `curso=${curso.id}&periodo=${periodo.id}`;
  const cierre = await cierreDeCurso(ctx, curso.id, periodo.id);
  const puedeCrear = ctx.rol === "profesor" && !periodo.cerrado && !cierre && seccion === "notas";

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoPagina
        titulo="Notas"
        descripcion={descripcion}
        acciones={
          <>
            {botonPeriodos}
            {puedeCrear && <BotonNuevaEvaluacion slug={slug} ctx={ctx} cursoId={curso.id} periodoId={periodo.id} />}
          </>
        }
      />

      <Card>
        <CardContent>
          <form method="get" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <input type="hidden" name="seccion" value={seccion} />
            <Selector etiqueta="Curso" name="curso" defaultValue={curso.id}>
              {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.salon.nombre}</option>)}
            </Selector>
            <Selector etiqueta="Periodo" name="periodo" defaultValue={periodo.id}>
              {periodos.map((p) => <option key={p.id} value={p.id}>{p.nombre} {p.anio}{p.cerrado ? " (cerrado)" : ""}</option>)}
            </Selector>
            <Boton type="submit">Ver</Boton>
          </form>
        </CardContent>
      </Card>

      <CierreCursoCard
        slug={slug} esDireccion={esDireccion} cursoId={curso.id} periodoId={periodo.id} nombreCurso={curso.nombre}
        periodoCerrado={periodo.cerrado} cierre={cierre}
      />

      {periodo.cerrado && (
        <Alerta tipo="aviso">
          <Lock className="mr-1 inline size-3.5 align-[-2px]" strokeWidth={2} aria-hidden />
          <strong>Periodo cerrado.</strong> Solo puedes mirar las notas; ya no se pueden cambiar.
        </Alerta>
      )}
      {cierre && !periodo.cerrado && (
        <Alerta tipo="aviso">
          <Lock className="mr-1 inline size-3.5 align-[-2px]" strokeWidth={2} aria-hidden />
          <strong>Notas del curso cerradas.</strong> Ya no se pueden cambiar notas ni evaluaciones de este curso en este periodo.
        </Alerta>
      )}
      {esDireccion && !periodo.cerrado && <Alerta tipo="info">Estás viendo las notas como dirección. Solo los profesores del curso pueden editarlas.</Alerta>}

      <NavegacionPildoras
        etiqueta="Secciones"
        items={SECCIONES.map((s) => ({ href: `/notas?${base}&seccion=${s.id}`, texto: s.nombre, activo: s.id === seccion }))}
      />

      {seccion === "notas" && <SeccionNotas ctx={ctx} slug={slug} cursoId={curso.id} periodoId={periodo.id} />}
      {seccion === "informe" && <SeccionInforme ctx={ctx} slug={slug} cursoId={curso.id} periodoId={periodo.id} sp={sp} />}
      {seccion === "periodo" && <SeccionPeriodo ctx={ctx} slug={slug} cursoId={curso.id} periodoId={periodo.id} sp={sp} />}
      {seccion === "excel" && <SeccionExcel ctx={ctx} slug={slug} cursoId={curso.id} periodoId={periodo.id} />}
      {seccion === "competencias" && <SeccionCompetencias ctx={ctx} slug={slug} cursoId={curso.id} periodoId={periodo.id} />}
      {seccion === "cneb" && <SeccionCneb ctx={ctx} slug={slug} cursoId={curso.id} />}
    </div>
  );
}

function CierreCursoCard({
  slug, esDireccion, cursoId, periodoId, nombreCurso, periodoCerrado, cierre,
}: {
  slug: string; esDireccion: boolean; cursoId: string; periodoId: string; nombreCurso: string; periodoCerrado: boolean;
  cierre: { cerradoAt: Date; por: string } | null;
}) {
  const cerrado = periodoCerrado || cierre !== null;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Cierre de notas de {nombreCurso}</p>
          <p className="flex items-center gap-1.5 text-sm">
            {cerrado ? <Lock className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden /> : <CheckCircle2 className="size-4 text-llego" strokeWidth={2} aria-hidden />}
            <span className="font-semibold">{periodoCerrado ? "Periodo cerrado" : cierre ? "Cerrado" : "Abierto"}</span>
            {cierre && !periodoCerrado && <span className="text-muted-foreground">· por {cierre.por} el {fechaLima(cierre.cerradoAt)}</span>}
          </p>
        </div>
        {!periodoCerrado && !cierre && (
          <BotonConfirmar
            etiqueta={<><Lock strokeWidth={2} aria-hidden />Cerrar notas del curso</>}
            titulo={`¿Cerrar las notas de ${nombreCurso}?`}
            descripcion="Ya no se podrán cambiar notas ni evaluaciones de este curso en este periodo. Dirección puede reabrirlas si hace falta."
            confirmar="Cerrar notas del curso"
            accion={cerrarCursoAction.bind(null, slug, cursoId, periodoId)}
          />
        )}
        {!periodoCerrado && cierre && esDireccion && (
          <BotonConfirmar
            etiqueta="Reabrir notas del curso"
            titulo={`¿Reabrir las notas de ${nombreCurso}?`}
            descripcion="El profesor podrá volver a cambiar notas y evaluaciones de este curso en este periodo."
            confirmar="Reabrir notas del curso"
            accion={reabrirCursoAction.bind(null, slug, cursoId, periodoId)}
          />
        )}
      </CardContent>
    </Card>
  );
}

async function SeccionExcel({ ctx, slug, cursoId, periodoId }: { ctx: TenantContext; slug: string; cursoId: string; periodoId: string }) {
  const g = await grillaNotas(ctx, cursoId, periodoId);
  const bloqueo = ctx.rol !== "profesor" ? "Solo el profesor del curso puede importar notas." : g.editable ? null : g.cursoCerrado ? "Las notas de este curso están cerradas en este periodo." : "Este periodo está cerrado.";
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="font-titulo text-cuerpo font-semibold">Exportar a Excel (CSV)</h2>
          <CardDescription>Una fila por alumno y una columna por evaluación. Se abre en Excel con tildes y columnas separadas por «;».</CardDescription>
        </CardHeader>
        <CardContent>
          <a href={`/api/notas/exportar?curso=${cursoId}&periodo=${periodoId}`} className={buttonVariants({ variant: "outline" })}>
            <Download strokeWidth={2} aria-hidden />Descargar CSV
          </a>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-titulo text-cuerpo font-semibold">Importar notas</h2>
          <CardDescription>
            Usa el CSV descargado como base. Identificamos al alumno por su código o su nombre y cada columna por el título de la evaluación.
            Valores: {g.escala === "literal" ? "AD, A, B o C" : "números de 0 a 20"}. Las celdas vacías no borran notas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportarNotas slug={slug} cursoId={cursoId} periodoId={periodoId} bloqueo={bloqueo} />
        </CardContent>
      </Card>
    </div>
  );
}

async function BotonNuevaEvaluacion({ slug, ctx, cursoId, periodoId }: { slug: string; ctx: TenantContext; cursoId: string; periodoId: string }) {
  const g = await grillaNotas(ctx, cursoId, periodoId);
  const opciones = await desempenosParaEvaluar(ctx, cursoId);
  return (
    <DialogoAccion
      disparador={<><Plus strokeWidth={2} aria-hidden />Nueva evaluación</>}
      titulo="Programar evaluación"
      descripcion="Prográmala con su fecha. Aparecerá en el registro auxiliar con una columna por cada competencia que evalúe."
      etiqueta="Crear evaluación"
      accion={crearEvaluacionAction.bind(null, slug)}
    >
      <input type="hidden" name="cursoId" value={cursoId} />
      <input type="hidden" name="periodoId" value={periodoId} />
      <Campo etiqueta="Título" name="titulo" required maxLength={120} placeholder="Prueba escrita 1" />
      <SelectorInstrumento />
      <Campo etiqueta="Fecha" name="fecha" type="date" required defaultValue={fechaLima(new Date())} />
      <CampoPeso usaPeso={g.calculo !== "ninguna"} />
      <CampoDescripcion />
      <label className="flex cursor-pointer items-start gap-2.5 text-sm sm:col-span-2">
        <input type="checkbox" name="avisar" defaultChecked className="mt-0.5 size-4 shrink-0 accent-primary" />
        <span>
          <span className="font-medium">Avisar a las familias que está programada</span>
          <span className="block text-muted-foreground">Las notas quedan en borrador hasta que publiques los resultados.</span>
        </span>
      </label>
      <CompetenciasYDesempenos competencias={g.competencias} porCompetencia={opciones.porCompetencia} textoGrado={opciones.textoGrado} />
    </DialogoAccion>
  );
}

async function SeccionNotas({ ctx, slug, cursoId, periodoId }: { ctx: TenantContext; slug: string; cursoId: string; periodoId: string }) {
  const g = await grillaNotas(ctx, cursoId, periodoId);
  const puedeEditar = g.editable;
  const opciones = puedeEditar ? await desempenosParaEvaluar(ctx, cursoId) : { porCompetencia: {}, textoGrado: null };
  return (
    <div className="flex flex-col gap-5">
      {g.escala === "literal" && (
        <p className="flex items-start gap-2 text-cuerpo-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden />
          {LITERALES.map((l) => `${l}: ${ETIQUETA_LITERAL[l]}`).join(" · ")}
        </p>
      )}
      <p className="max-w-prose text-cuerpo-sm text-muted-foreground">
        Las evaluaciones van agrupadas por competencia.{" "}
        {textoCalculo(g.escala, g.calculo)
          ? <>El promedio provisional de cada competencia se calcula al momento con {textoCalculo(g.escala, g.calculo)}.</>
          : <>La calificación de cada competencia en el periodo la pones tú en «Calificación del periodo».</>}
      </p>
      <GrillaNotas
        // Se remonta cuando cambian las columnas o las notas (p. ej. NSP puestos al crear una evaluación).
        key={`${g.evaluaciones.map((e) => e.id).join(",")}|${g.notas.length}`}
        slug={slug} escala={g.escala} calculo={g.calculo} editable={g.editable} alumnos={g.alumnos}
        competencias={g.competencias} evaluaciones={g.evaluaciones} notas={g.notas}
        estadosNsp={g.estadosNsp.nsp} conflictos={g.estadosNsp.conflictos}
      />

      {g.evaluaciones.length > 0 && (
        <ListaEvaluaciones ctx={ctx} slug={slug} g={g} puedeEditar={puedeEditar} opciones={opciones} />
      )}
    </div>
  );
}

/**
 * Evaluaciones del periodo agrupadas (una evaluación puede tener varias columnas, una por competencia): estado
 * (Programada = borrador / Publicada), «Publicar resultados» (entra en el resumen académico del día), historial y, por columna,
 * editar y eliminar.
 */
async function ListaEvaluaciones({
  ctx, slug, g, puedeEditar, opciones,
}: {
  ctx: TenantContext; slug: string; g: Awaited<ReturnType<typeof grillaNotas>>; puedeEditar: boolean;
  opciones: Awaited<ReturnType<typeof desempenosParaEvaluar>>;
}) {
  const grupos = [...new Set(g.evaluaciones.map((e) => e.grupoId))].map((grupoId) => g.evaluaciones.filter((e) => e.grupoId === grupoId));
  const historiales = await Promise.all(grupos.map((cols) => historialEvaluacion(ctx, cols[0].grupoId)));
  const conNota = new Set(g.notas.map((n) => n.evaluacionId));
  const usaPeso = g.calculo !== "ninguna";
  return (
    <Card>
      <CardHeader>
        <h2 className="font-titulo text-cuerpo font-semibold">Evaluaciones del periodo</h2>
        <CardDescription>
          Las notas de una evaluación programada son un borrador: la familia las ve cuando publicas los resultados.
          {puedeEditar && " Al eliminar una columna también se borran sus notas."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {grupos.map((cols, i) => {
            const e = cols[0];
            const publicada = cols.every((c) => c.estado === "publicada");
            const hayNotas = cols.some((c) => conNota.has(c.id));
            const historial = historiales[i];
            return (
              <li key={e.grupoId} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {e.titulo}
                      {publicada ? (
                        <span className="inline-flex items-center gap-1 rounded-pildora bg-llego-fondo px-2 py-0.5 text-etiqueta text-llego"><Eye className="size-3.5" strokeWidth={2} aria-hidden />Publicada</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-pildora bg-muted px-2 py-0.5 text-etiqueta text-muted-foreground"><EyeOff className="size-3.5" strokeWidth={2} aria-hidden />Programada · borrador</span>
                      )}
                    </p>
                    <p className="text-cuerpo-sm text-muted-foreground">
                      {e.instrumento && `${NOMBRE_INSTRUMENTO[e.instrumento]} · `}{e.fecha}
                      {publicada && e.publicadaAt && ` · publicada el ${fechaLima(e.publicadaAt)}`}
                    </p>
                    {e.descripcion && <p className="mt-1 max-w-prose text-cuerpo-sm">{e.descripcion}</p>}
                  </div>
                  {ctx.rol === "profesor" && hayNotas && !publicada && (
                      <BotonConfirmar
                        etiqueta={<><Send strokeWidth={2} aria-hidden />Publicar resultados<span className="sr-only"> de {e.titulo}</span></>}
                        titulo={`¿Publicar los resultados de «${e.titulo}»?`}
                        descripcion="Las familias verán las notas y recibirán una notificación en Khipu (y en su celular si activaron las notificaciones). Después, cada cambio pedirá un motivo y se avisará a esa familia."
                        confirmar="Publicar resultados"
                        accion={publicarEvaluacionAction.bind(null, slug, e.grupoId)}
                      />
                  )}
                </div>
                <ul className="flex flex-col gap-2">
                  {cols.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2">
                      <p className="min-w-0 text-cuerpo-sm">
                        <span className="font-medium">{g.competencias.find((x) => x.id === c.competenciaId)?.nombre ?? "Sin competencia"}</span>
                        <span className="text-muted-foreground">
                          {usaPeso && ` · peso ${formatearNumero(c.peso)}`}
                          {c.desempenoIds.length > 0 && ` · ${c.desempenoIds.length} ${c.desempenoIds.length === 1 ? "desempeño" : "desempeños"}`}
                        </span>
                      </p>
                      {puedeEditar && (
                        <div className="flex items-center gap-1">
                          <DialogoAccion
                            disparador={<><Pencil strokeWidth={2} aria-hidden />Editar<span className="sr-only"> {c.columna}</span></>}
                            variante="outline"
                            titulo={`Editar ${c.columna}`}
                            descripcion={cols.length > 1 ? "Título, fecha, instrumento y descripción cambian en todas las columnas de esta evaluación." : undefined}
                            etiqueta="Guardar cambios"
                            accion={editarEvaluacionAction.bind(null, slug, c.id)}
                          >
                            <Campo etiqueta="Título" name="titulo" required defaultValue={c.titulo} />
                            <SelectorInstrumento defecto={c.instrumento} />
                            <CampoDescripcion defecto={c.descripcion} />
                            <CompetenciaYDesempenos
                              competencias={g.competencias} porCompetencia={opciones.porCompetencia} textoGrado={opciones.textoGrado}
                              defecto={c.competenciaId} marcados={c.desempenoIds}
                            />
                            <Campo etiqueta="Fecha" name="fecha" type="date" required defaultValue={c.fecha} />
                            <CampoPeso usaPeso={usaPeso} defecto={c.peso} />
                          </DialogoAccion>
                          <Link href={`/notas/criterios?evaluacion=${c.id}`} className={buttonVariants({ variant: "ghost" })}>
                            <ListChecks strokeWidth={2} aria-hidden />Criterios<span className="sr-only"> de {c.columna}</span>
                          </Link>
                          <BotonConfirmar
                            etiqueta="Eliminar" variante="ghost" peligro
                            titulo={`¿Eliminar «${c.columna}»?`}
                            descripcion="Se borran también las notas de esta columna. No se puede deshacer."
                            confirmar="Eliminar columna"
                            accion={eliminarEvaluacionAction.bind(null, slug, c.id)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {historial.length > 0 && (
                  <details className="text-cuerpo-sm">
                    <summary className="cursor-pointer font-medium text-primary">
                      <History className="mr-1 inline size-3.5 align-[-2px]" strokeWidth={2} aria-hidden />Historial de cambios ({historial.length})
                    </summary>
                    <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
                      {historial.map((h) => (
                        <li key={h.id} className="text-muted-foreground">
                          <span className="tabular-nums">{fechaLima(h.cambiadoAt)} {formatoHora(h.cambiadoAt)}</span> · {h.alumno}
                          {h.competencia && ` · ${h.competencia}`}:{" "}
                          {h.campo === "recuperacion"
                            ? <strong className="text-foreground">Recuperación {h.nuevo?.toLowerCase()}</strong>
                            : <strong className="text-foreground">{h.anterior ?? "sin nota"} → {h.nuevo ?? "sin nota"}</strong>}
                          {" "}· {h.por}
                          {h.tipo !== "registro" && <> · {NOMBRE_TIPO_CAMBIO[h.tipo]}</>}
                          {h.motivo && <> · «{h.motivo}»</>}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

const NOMBRE_TIPO_CAMBIO: Record<string, string> = {
  registro: "Borrador",
  correccion_digitacion: "Corrección por error de digitación",
  recuperacion: "Recuperación autorizada",
  cambio_asistencia: "Cambio asociado a asistencia",
  consecuencia_vencimiento: "Consecuencia por vencimiento",
  otra: "Otra modificación autorizada",
  decision_recuperacion: "Decisión de recuperación",
};

function CampoDescripcion({ defecto }: { defecto?: string | null }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
      <span className="font-medium">Descripción <span className="font-normal text-muted-foreground">(opcional: temas, qué traer)</span></span>
      <Textarea name="descripcion" rows={2} maxLength={500} defaultValue={defecto ?? ""} />
    </label>
  );
}

/** El peso solo sirve a la sugerencia provisional del colegio; sin sugerencia queda oculto (vale 1). */
function CampoPeso({ usaPeso, defecto = 1 }: { usaPeso: boolean; defecto?: number }) {
  if (!usaPeso) return <input type="hidden" name="peso" value={defecto} />;
  return <Campo etiqueta="Peso" name="peso" type="number" min={0.01} step={0.01} required defaultValue={defecto} ayuda="Solo lo usa la sugerencia provisional del colegio." />;
}

function SelectorInstrumento({ defecto }: { defecto?: Instrumento | null }) {
  return (
    <Selector etiqueta="Instrumento" name="instrumento" defaultValue={defecto ?? ""}>
      <option value="">Sin indicar</option>
      {INSTRUMENTOS.map((i) => <option key={i} value={i}>{NOMBRE_INSTRUMENTO[i]}</option>)}
    </Selector>
  );
}

async function SeccionInforme({ ctx, slug, cursoId, periodoId, sp }: { ctx: TenantContext; slug: string; cursoId: string; periodoId: string; sp: SP }) {
  const inf = await informesProgreso(ctx, cursoId, periodoId);
  const fila = inf.filas.find((f) => f.competencia.id === uno(sp.competencia)) ?? inf.filas[0];
  if (!fila) {
    return (
      <EstadoVacio
        icono={Target}
        titulo="Aún no hay competencias en este curso"
        descripcion="Primero agrega las competencias del curso en la pestaña «Competencias»."
      />
    );
  }
  const puedeCompartir = inf.editable && inf.escritos > 0;
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex max-w-prose flex-col gap-1">
            <p className="text-sm font-medium">Informe de progreso a mitad del periodo</p>
            <p className="text-cuerpo-sm text-muted-foreground">
              Por cada competencia, cuéntale a la familia qué ha logrado su hijo o hija, qué necesita mejorar y qué recomiendas reforzar.
              Las familias lo ven en «Notas» cuando lo compartes.
            </p>
            <p className="flex items-center gap-1.5 text-cuerpo-sm">
              {inf.envio ? <CheckCircle2 className="size-4 text-llego" strokeWidth={2} aria-hidden /> : <Lock className="size-4 text-muted-foreground" strokeWidth={2} aria-hidden />}
              <span className="font-semibold">{inf.envio ? "Compartido con las familias" : "Aún no compartido"}</span>
              {inf.envio && <span className="text-muted-foreground">· por {inf.envio.por} el {fechaLima(inf.envio.enviadoAt)}</span>}
              <span className="text-muted-foreground">· {inf.escritos} {inf.escritos === 1 ? "informe escrito" : "informes escritos"}</span>
            </p>
          </div>
          {puedeCompartir && (
            <BotonConfirmar
              etiqueta={<><Send strokeWidth={2} aria-hidden />{inf.envio ? "Reenviar aviso" : "Compartir con las familias"}</>}
              variante={inf.envio ? "outline" : "default"}
              titulo={inf.envio ? "¿Avisar otra vez a las familias?" : "¿Compartir el informe de progreso?"}
              descripcion={
                inf.envio
                  ? "Las familias de los alumnos con informe recibirán el aviso de nuevo."
                  : "Las familias de los alumnos con informe podrán leerlo en «Notas» y recibirán un aviso. Lo que cambies después también lo verán."
              }
              confirmar={inf.envio ? "Reenviar aviso" : "Compartir"}
              accion={compartirInformeAction.bind(null, slug, cursoId, periodoId, Boolean(inf.envio))}
            />
          )}
        </CardContent>
      </Card>
      <NavegacionPildoras
        etiqueta="Competencias"
        items={inf.filas.map((f) => ({
          href: `/notas?curso=${cursoId}&periodo=${periodoId}&seccion=informe&competencia=${f.competencia.id}`,
          texto: f.competencia.nombre,
          activo: f.competencia.id === fila.competencia.id,
        }))}
      />
      <ul className="grid gap-3 lg:grid-cols-2">
        {fila.alumnos.map((a) => (
          <li key={`${fila.competencia.id}:${a.alumno.id}`}>
            <FilaInforme
              slug={slug} editable={inf.editable} alumno={a.alumno} competenciaId={fila.competencia.id} periodoId={periodoId}
              informe={a.informe} notas={a.notas}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

async function SeccionPeriodo({ ctx, slug, cursoId, periodoId, sp }: { ctx: TenantContext; slug: string; cursoId: string; periodoId: string; sp: SP }) {
  const c = await calificacionesPeriodo(ctx, cursoId, periodoId);
  const fila = c.filas.find((f) => f.competencia.id === uno(sp.competencia)) ?? c.filas[0];
  if (!fila) {
    return (
      <EstadoVacio
        icono={Target}
        titulo="Aún no hay competencias en este curso"
        descripcion="Primero agrega las competencias del curso en la pestaña «Competencias»."
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose text-cuerpo-sm text-muted-foreground">
        {textoCalculo(c.escala, c.calculo)
          ? <>Khipu sugiere una calificación provisional ({textoCalculo(c.escala, c.calculo)}). Tú la confirmas o la cambias.</>
          : <>Mira las notas del periodo de cada alumno y pon la calificación de la competencia.</>}
        {c.escala === "literal" && " En B y C la conclusión descriptiva es obligatoria."}
      </p>
      <NavegacionPildoras
        etiqueta="Competencias"
        items={c.filas.map((f) => ({
          href: `/notas?curso=${cursoId}&periodo=${periodoId}&seccion=periodo&competencia=${f.competencia.id}`,
          texto: f.competencia.nombre,
          activo: f.competencia.id === fila.competencia.id,
        }))}
      />
      <ul className="grid gap-3 lg:grid-cols-2">
        {fila.alumnos.map((a) => (
          <li key={a.alumno.id}>
            <FilaCalificacion
              slug={slug} escala={c.escala} editable={c.editable}
              alumno={a.alumno} competenciaId={fila.competencia.id} periodoId={periodoId}
              guardado={a.guardado} sugerido={a.sugerido} notas={a.notas} desempenos={a.desempenos}
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
    <Card>
      <CardHeader>
        <h2 className="font-titulo text-cuerpo font-semibold">Competencias de {g.curso.nombre}</h2>
        {puedeEditar && (
          <div className="mt-2">
            <DialogoAccion
              disparador={<><Plus strokeWidth={2} aria-hidden />Nueva competencia</>}
              variante="outline"
              titulo="Nueva competencia"
              etiqueta="Agregar competencia"
              accion={crearCompetenciaAction.bind(null, slug)}
            >
              <input type="hidden" name="cursoId" value={cursoId} />
              <div className="sm:col-span-2"><Campo etiqueta="Nombre" name="nombre" required maxLength={200} placeholder="Resuelve problemas de cantidad" /></div>
              <div className="sm:col-span-2"><Campo etiqueta="Descripción (opcional)" name="descripcion" maxLength={500} /></div>
            </DialogoAccion>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {g.competencias.length === 0 ? (
          <EstadoVacio icono={BookMarked} titulo="Este curso aún no tiene competencias" descripcion={puedeEditar ? "Agrega la primera con «Nueva competencia»." : undefined} />
        ) : (
          <ul className="divide-y">
            {g.competencias.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-medium">{c.nombre}</p>
                  {c.descripcion && <p className="text-cuerpo-sm text-muted-foreground">{c.descripcion}</p>}
                </div>
                {puedeEditar && (
                  <BotonConfirmar
                    etiqueta="Eliminar" variante="ghost" peligro
                    titulo={`¿Eliminar la competencia «${c.nombre}»?`}
                    descripcion="Se quita del curso. Si ya tiene calificaciones en la libreta, no se podrá eliminar."
                    confirmar="Eliminar competencia"
                    accion={eliminarCompetenciaAction.bind(null, slug, c.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

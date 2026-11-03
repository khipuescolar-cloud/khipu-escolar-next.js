"use client";

import { AlertTriangle, CheckCircle2, ClipboardList, Clock, EyeOff, Info, Loader2, ShieldCheck, ShieldX, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";
import { EstadoVacio } from "@/components/shell/EstadoVacio";
import { Boton } from "@/components/ui/Boton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CLASE_CAMPO } from "@/components/ui/Selector";
import { Textarea } from "@/components/ui/textarea";
import {
  LITERALES, ETIQUETA_LITERAL, NOMBRE_INSTRUMENTO, formatearNumero, interpretarValor, sugerirCalificacion, textoValor,
  type Marca, type SugerenciaPeriodo, type Escala, type Instrumento, type Literal,
} from "@/lib/calificaciones";
import { cn } from "@/lib/utils";
import { decidirRecuperacionAction, guardarNotaAction } from "./actions";
import { ComentarioNota } from "./ComentarioNota";

type Estado = { fase: "guardando" } | { fase: "guardado" } | { fase: "error"; mensaje: string };

type Evaluacion = {
  id: string; titulo: string; fecha: string; peso: number; competenciaId: string | null; instrumento: Instrumento | null;
  estado: "programada" | "publicada";
};

export type EstadoNspCelda = {
  justificacion: "sin_solicitud" | "pendiente" | "aceptada" | "rechazada";
  venceEl: string;
  plazoVencido: boolean;
  recuperacion: "autorizada" | "denegada" | null;
  fechaRecuperacion: string | null;
  incidencia: boolean;
  vencida: boolean;
};

type Props = {
  slug: string;
  escala: Escala;
  calculo: SugerenciaPeriodo;
  editable: boolean;
  alumnos: { id: string; nombres: string; apellidos: string }[];
  competencias: { id: string; nombre: string }[];
  evaluaciones: Evaluacion[];
  notas: { evaluacionId: string; alumnoId: string; valorLiteral: Literal | null; valorNumerico: number | null; comentario?: string | null; comentarioPrivado?: boolean; marca?: Marca | null }[];
  /** Estado de cada NSP por `evaluacionId:alumnoId` (specs/37). */
  estadosNsp?: Record<string, EstadoNspCelda>;
  /** Celdas con calificación de un alumno que, según la asistencia, faltó (no se pisan: el profesor revisa). */
  conflictos?: string[];
};

const TIPOS = [
  { valor: "correccion_digitacion", texto: "Corrección por error de digitación" },
  { valor: "cambio_asistencia", texto: "Cambio asociado a asistencia" },
  { valor: "otra", texto: "Otra modificación autorizada" },
] as const;

const valorInicial = (n: Props["notas"][number] | undefined): string => {
  if (!n) return "";
  if (n.valorLiteral) return n.valorLiteral;
  if (n.valorNumerico != null) return formatearNumero(n.valorNumerico);
  if (n.marca === "nsp") return "NSP";
  if (n.marca === "no_entrego") return "NE";
  return "";
};

/** Columnas agrupadas por competencia (en su orden); las evaluaciones sin competencia van al final. */
function agrupar(competencias: Props["competencias"], evaluaciones: Evaluacion[]) {
  const grupos = competencias
    .map((c) => ({ id: c.id, nombre: c.nombre, evaluaciones: evaluaciones.filter((e) => e.competenciaId === c.id) }))
    .filter((g) => g.evaluaciones.length > 0);
  const sueltas = evaluaciones.filter((e) => !competencias.some((c) => c.id === e.competenciaId));
  if (sueltas.length > 0) grupos.push({ id: "", nombre: "Sin competencia", evaluaciones: sueltas });
  return grupos;
}

const corta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

type Pendiente = { evaluacion: Evaluacion; alumno: Props["alumnos"][number]; valor: string; anterior: string; recuperacion: boolean };

/**
 * Registro auxiliar: alumnos × evaluaciones, agrupadas por competencia. NSP (No se presentó) lo pone Khipu según la
 * asistencia y NE (No entregó) lo marca el profesor: ninguno es un número (specs/37). En borrador cada celda se guarda
 * sola; si la evaluación está publicada, la celda tiene NSP o una consecuencia por vencimiento, se pide el tipo y el
 * motivo del cambio. Un NSP justificado muestra «Autorizar recuperación» / «No autorizar». Celdas de 40 px (specs/18 §8).
 */
export function GrillaNotas({ slug, escala, calculo, editable, alumnos, competencias, evaluaciones, notas, estadosNsp = {}, conflictos = [] }: Props) {
  const router = useRouter();
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(notas.map((n) => [`${n.evaluacionId}:${n.alumnoId}`, valorInicial(n)])),
  );
  const [guardados, setGuardados] = useState<Record<string, string>>(() =>
    Object.fromEntries(notas.map((n) => [`${n.evaluacionId}:${n.alumnoId}`, valorInicial(n)])),
  );
  const [comentarios, setComentarios] = useState<Record<string, string>>(() =>
    Object.fromEntries(notas.map((n) => [`${n.evaluacionId}:${n.alumnoId}`, n.comentario ?? ""])),
  );
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const conflicto = new Set(conflictos);

  async function guardar(evaluacionId: string, alumnoId: string, valor: string, extra: { motivo?: string; tipo?: string; fechaRecuperacion?: string } = {}) {
    const clave = `${evaluacionId}:${alumnoId}`;
    setEstados((e) => ({ ...e, [clave]: { fase: "guardando" } }));
    const r = await guardarNotaAction(slug, evaluacionId, alumnoId, valor, extra);
    setEstados((e) => ({ ...e, [clave]: r.ok ? { fase: "guardado" } : { fase: "error", mensaje: r.error } }));
    if (r.ok) {
      setGuardados((g) => ({ ...g, [clave]: valor.trim().toUpperCase() === "NE" ? "NE" : valor }));
      if (valor.trim() === "") setComentarios((m) => ({ ...m, [clave]: "" })); // sin nota no hay observación
      if (extra.motivo || extra.fechaRecuperacion) router.refresh();
    } else {
      setValores((v) => ({ ...v, [clave]: guardados[clave] ?? "" }));
    }
    return r;
  }

  /** Cambio de una celda: directo en borrador; con diálogo si hace falta motivo o es una recuperación. */
  function cambiar(e: Evaluacion, a: Props["alumnos"][number], valor: string) {
    const clave = `${e.id}:${a.id}`;
    const anterior = guardados[clave] ?? "";
    if (valor.trim().toUpperCase() === anterior.toUpperCase()) return;
    const nsp = estadosNsp[clave];
    const esNsp = anterior === "NSP";
    const recuperacion = esNsp && nsp?.recuperacion === "autorizada" && valor.trim() !== "" && valor.trim().toUpperCase() !== "NE";
    if (recuperacion || esNsp || nsp?.vencida || e.estado === "publicada") {
      setPendiente({ evaluacion: e, alumno: a, valor, anterior, recuperacion });
      return;
    }
    void guardar(e.id, a.id, valor);
  }

  const grupos = agrupar(competencias, evaluaciones);
  const conPromedio = calculo !== "ninguna";
  /** Promedio en vivo de la competencia con lo que hay en la rejilla. NSP y NE no son números: no entran. */
  function promedio(lista: Evaluacion[], alumnoId: string) {
    const items = lista.flatMap((e) => {
      const v = interpretarValor(escala, valores[`${e.id}:${alumnoId}`] ?? "");
      return v.ok && v.valor ? [{ ...v.valor, peso: e.peso, fecha: e.fecha }] : [];
    });
    return sugerirCalificacion(escala, items, calculo);
  }

  if (evaluaciones.length === 0) {
    return (
      <EstadoVacio
        icono={ClipboardList}
        titulo="Aún no hay evaluaciones en este periodo"
        descripcion="Crea la primera para empezar a poner notas."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-cuerpo-sm text-muted-foreground" aria-label="Leyenda">
        <span><strong className="text-foreground">NSP</strong>: No se presentó (faltó; lo pone la asistencia)</span>
        <span><strong className="text-foreground">NE</strong>: No entregó (asistió pero no entregó)</span>
      </p>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th scope="col" rowSpan={2} className="sticky left-0 z-10 min-w-44 border-r bg-muted px-3 py-2.5 align-bottom font-semibold">Alumno</th>
              {grupos.map((g) => (
                <th
                  key={g.id || "sueltas"} scope="colgroup" colSpan={g.evaluaciones.length + (g.id && conPromedio ? 1 : 0)}
                  className="max-w-80 border-b border-l px-3 pt-2.5 pb-1.5 text-cuerpo-sm font-semibold text-foreground"
                >
                  <span className="line-clamp-2">{g.nombre}</span>
                </th>
              ))}
            </tr>
            <tr>
              {grupos.map((g) => (
                <Fragment key={g.id || "sueltas"}>
                  {g.evaluaciones.map((e, i) => (
                    <th key={e.id} scope="col" className={cn("min-w-36 px-3 py-2 align-bottom font-semibold", i === 0 && "border-l")}>
                      <span className="block">{e.titulo}</span>
                      {e.estado === "programada" && (
                        <span className="inline-flex items-center gap-1 text-cuerpo-sm font-normal text-muted-foreground">
                          <EyeOff className="size-3" strokeWidth={2} aria-hidden />Borrador
                        </span>
                      )}
                      <span className="block text-cuerpo-sm font-normal text-muted-foreground">
                        {e.instrumento && <>{NOMBRE_INSTRUMENTO[e.instrumento]} · </>}{corta(e.fecha)}{conPromedio && ` · peso ${formatearNumero(e.peso)}`}
                      </span>
                    </th>
                  ))}
                  {g.id && conPromedio && (
                    <th scope="col" className="min-w-24 bg-secondary/60 px-3 py-2 align-bottom font-semibold">
                      <span className="block">Promedio</span>
                      <span className="block text-cuerpo-sm font-normal text-muted-foreground">provisional</span>
                    </th>
                  )}
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {alumnos.map((a) => (
              <tr key={a.id} className="border-t">
                <th scope="row" className="sticky left-0 z-10 border-r bg-card px-3 py-2 text-left font-medium">
                  {a.apellidos}, {a.nombres}
                </th>
                {grupos.map((g) => (
                  <Fragment key={g.id || "sueltas"}>
                    {g.evaluaciones.map((e, i) => {
                      const clave = `${e.id}:${a.id}`;
                      const valor = valores[clave] ?? "";
                      const estado = estados[clave];
                      const nsp = estadosNsp[clave];
                      const etiqueta = `Nota de ${a.nombres} en ${e.titulo}`;
                      return (
                        <td key={e.id} className={cn("px-3 py-2 align-top", i === 0 && "border-l")}>
                          <div className="flex items-center gap-1">
                            {editable ? (
                              escala === "literal" ? (
                                <select
                                  aria-label={etiqueta}
                                  value={valor}
                                  onChange={(ev) => {
                                    setValores((v) => ({ ...v, [clave]: ev.target.value }));
                                    cambiar(e, a, ev.target.value);
                                  }}
                                  className={cn(CLASE_CAMPO, "h-10 w-28 cursor-pointer px-2 py-1.5", valor === "NSP" && "font-semibold text-falta")}
                                >
                                  <option value="">—</option>
                                  {LITERALES.map((l) => (
                                    <option key={l} value={l}>{l} · {ETIQUETA_LITERAL[l]}</option>
                                  ))}
                                  <option value="NE">NE · No entregó</option>
                                  {valor === "NSP" && <option value="NSP" disabled>NSP · No se presentó</option>}
                                </select>
                              ) : (
                                <input
                                  aria-label={etiqueta}
                                  type="text" inputMode="text" maxLength={5} autoComplete="off"
                                  value={valor}
                                  onChange={(ev) => setValores((v) => ({ ...v, [clave]: ev.target.value }))}
                                  onBlur={(ev) => cambiar(e, a, ev.target.value)}
                                  className={cn(CLASE_CAMPO, "h-10 w-20 px-2 py-1.5 text-center tabular-nums", valor === "NSP" && "font-semibold text-falta")}
                                />
                              )
                            ) : (
                              <span className={cn("inline-flex h-10 items-center font-medium tabular-nums", valor === "NSP" && "text-falta")}>{valor === "" ? "—" : valor}</span>
                            )}
                            <ComentarioNota
                              slug={slug} evaluacionId={e.id} alumnoId={a.id} alumno={`${a.nombres} ${a.apellidos}`} evaluacion={e.titulo}
                              comentario={comentarios[clave] ?? ""} privado={notas.find((n) => n.evaluacionId === e.id && n.alumnoId === a.id)?.comentarioPrivado ?? false}
                              hayNota={valor !== ""} editable={editable}
                              alGuardar={(c) => setComentarios((m) => ({ ...m, [clave]: c }))}
                            />
                          </div>
                          {nsp && <EstadoNsp slug={slug} nsp={nsp} valor={valor} editable={editable} evaluacionId={e.id} alumno={a} />}
                          {conflicto.has(clave) && (
                            <span className="mt-1 flex items-center gap-1 text-cuerpo-sm text-tarde">
                              <AlertTriangle className="size-3" strokeWidth={2} aria-hidden />Faltó según la asistencia
                            </span>
                          )}
                          {estado && (
                            <span role="status" className={`mt-1 flex max-w-56 items-start gap-1 text-cuerpo-sm ${estado.fase === "error" ? "text-falta" : estado.fase === "guardado" ? "text-llego" : "text-muted-foreground"}`}>
                              {estado.fase === "guardando" && <><Loader2 className="mt-0.5 size-3 shrink-0 animate-spin" strokeWidth={2} aria-hidden />Guardando</>}
                              {estado.fase === "guardado" && <><CheckCircle2 className="mt-0.5 size-3 shrink-0" strokeWidth={2} aria-hidden />Guardado</>}
                              {estado.fase === "error" && <><AlertTriangle className="mt-0.5 size-3 shrink-0" strokeWidth={2} aria-hidden />{estado.mensaje}</>}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {g.id && conPromedio && <CeldaPromedio valor={promedio(g.evaluaciones, a.id)} alumno={a.nombres} competencia={g.nombre} />}
                  </Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DialogoCambio
        pendiente={pendiente}
        alCancelar={() => {
          if (pendiente) {
            const clave = `${pendiente.evaluacion.id}:${pendiente.alumno.id}`;
            setValores((v) => ({ ...v, [clave]: pendiente.anterior }));
          }
          setPendiente(null);
        }}
        alConfirmar={async (extra) => {
          if (!pendiente) return null;
          const r = await guardar(pendiente.evaluacion.id, pendiente.alumno.id, pendiente.valor, extra);
          if (r.ok) {
            toast.success(pendiente.recuperacion ? "Recuperación registrada." : "Cambio guardado con su motivo.");
            setPendiente(null);
          }
          return r.ok ? null : r.error;
        }}
      />
    </div>
  );
}

/** Estado de un NSP: justificación, plazo, recuperación (con los botones del profesor) e incidencia. */
function EstadoNsp({ slug, nsp, valor, editable, evaluacionId, alumno }: {
  slug: string; nsp: EstadoNspCelda; valor: string; editable: boolean; evaluacionId: string; alumno: Props["alumnos"][number];
}) {
  const [enCurso, iniciar] = useTransition();
  const decidir = (decision: "autorizada" | "denegada") =>
    iniciar(async () => {
      const r = await decidirRecuperacionAction(slug, evaluacionId, alumno.id, decision);
      if (r.ok) toast.success(r.mensaje ?? "Decisión registrada.");
      else toast.error(r.error);
    });
  const linea = (icono: React.ReactNode, texto: string, clase = "text-muted-foreground") => (
    <span className={cn("mt-1 flex max-w-56 items-start gap-1 text-cuerpo-sm", clase)}>{icono}{texto}</span>
  );
  const ic = (C: typeof Clock) => <C className="mt-0.5 size-3 shrink-0" strokeWidth={2} aria-hidden />;
  if (nsp.vencida) return linea(ic(Clock), "Plazo vencido: regla del colegio");
  if (valor !== "NSP") return nsp.fechaRecuperacion ? linea(ic(ShieldCheck), `Recuperación del ${corta(nsp.fechaRecuperacion)}`, "text-llego") : null;
  return (
    <>
      {nsp.incidencia && linea(ic(Info), "Inasistencia por incidencia")}
      {nsp.justificacion === "sin_solicitud" && linea(ic(Clock), nsp.plazoVencido ? "Sin justificar · plazo vencido" : `Sin justificar · hasta ${corta(nsp.venceEl)}`)}
      {nsp.justificacion === "pendiente" && linea(ic(Clock), "Justificación en revisión")}
      {nsp.justificacion === "rechazada" && linea(ic(XCircle), "Justificación rechazada", "text-falta")}
      {nsp.justificacion === "aceptada" && nsp.recuperacion === null && (
        <>
          {linea(ic(CheckCircle2), "Falta justificada", "text-llego")}
          {editable && (
            <span className="mt-1 flex flex-wrap gap-1">
              <Boton type="button" variante="secundario" tamano="sm" disabled={enCurso} onClick={() => decidir("autorizada")}>
                <ShieldCheck strokeWidth={2} aria-hidden />Autorizar recuperación<span className="sr-only"> de {alumno.nombres}</span>
              </Boton>
              <Boton type="button" variante="fantasma" tamano="sm" disabled={enCurso} onClick={() => decidir("denegada")}>
                <ShieldX strokeWidth={2} aria-hidden />No autorizar<span className="sr-only"> la recuperación de {alumno.nombres}</span>
              </Boton>
            </span>
          )}
        </>
      )}
      {nsp.recuperacion === "autorizada" && linea(ic(ShieldCheck), "Recuperación autorizada: pon la nota", "text-llego")}
      {nsp.recuperacion === "denegada" && linea(ic(ShieldX), "Recuperación no autorizada")}
    </>
  );
}

/** Pide el tipo y el motivo de un cambio (o la fecha de la recuperación) antes de guardarlo. */
function DialogoCambio({ pendiente, alCancelar, alConfirmar }: {
  pendiente: Pendiente | null;
  alCancelar: () => void;
  alConfirmar: (extra: { motivo?: string; tipo?: string; fechaRecuperacion?: string }) => Promise<string | null>;
}) {
  const [tipo, setTipo] = useState<string>("correccion_digitacion");
  const [motivo, setMotivo] = useState("");
  const [fecha, setFecha] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }));
  const [error, setError] = useState<string | null>(null);
  const [enCurso, iniciar] = useTransition();
  if (!pendiente) return null;
  const nuevo = pendiente.valor.trim() === "" ? "sin nota" : pendiente.valor.trim().toUpperCase();
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && alCancelar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">{pendiente.recuperacion ? "Registrar recuperación" : "Motivo del cambio"}</DialogTitle>
          <DialogDescription>
            {pendiente.alumno.nombres} {pendiente.alumno.apellidos} · {pendiente.evaluacion.titulo}:{" "}
            <strong>{pendiente.anterior || "sin nota"} → {nuevo}</strong>.{" "}
            {pendiente.recuperacion
              ? "La nota queda en la actividad original y el historial conserva el NSP."
              : pendiente.evaluacion.estado === "publicada"
                ? "La familia ya ve este resultado: recibirá un aviso del cambio."
                : "El cambio queda en el historial."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            iniciar(async () => {
              const e = await alConfirmar(pendiente.recuperacion ? { fechaRecuperacion: fecha, ...(motivo ? { motivo } : {}) } : { tipo, motivo });
              setError(e);
              if (!e) setMotivo("");
            });
          }}
        >
          {pendiente.recuperacion ? (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Fecha en que rindió la recuperación</span>
              <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={cn(CLASE_CAMPO, "h-10 px-3")} />
            </label>
          ) : (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">Tipo de cambio</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={cn(CLASE_CAMPO, "h-10 px-3")}>
                {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Motivo {pendiente.recuperacion && <span className="font-normal text-muted-foreground">(opcional)</span>}</span>
            <Textarea rows={2} maxLength={300} required={!pendiente.recuperacion} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </label>
          {error && <p role="alert" className="flex items-start gap-1 text-cuerpo-sm text-falta"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" strokeWidth={2} aria-hidden />{error}</p>}
          <DialogFooter>
            <Boton type="button" variante="secundario" onClick={alCancelar}>Cancelar</Boton>
            <Boton type="submit" disabled={enCurso}>
              {enCurso && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
              {pendiente.recuperacion ? "Guardar recuperación" : "Guardar cambio"}
            </Boton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CeldaPromedio({ valor, alumno, competencia }: { valor: ReturnType<typeof sugerirCalificacion>; alumno: string; competencia: string }) {
  const texto = valor ? textoValor(valor) : "—";
  return (
    <td className="bg-secondary/40 px-3 py-2 align-top">
      <span
        className="inline-flex h-10 min-w-10 items-center justify-center font-semibold tabular-nums"
        aria-label={`Promedio de ${alumno} en ${competencia}: ${valor?.valorLiteral ? `${texto}, ${ETIQUETA_LITERAL[valor.valorLiteral]}` : texto}`}
      >
        {texto}
      </span>
    </td>
  );
}

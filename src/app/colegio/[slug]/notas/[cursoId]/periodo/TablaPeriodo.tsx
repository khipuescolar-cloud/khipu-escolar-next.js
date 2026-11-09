"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type KeyboardEvent } from "react";
import { AlertTriangle, CheckCircle2, Clock, FileX, Loader2, MessageSquarePlus, MessageSquareText, Save, Send, Undo2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/shell/EncabezadoPagina";
import { Alerta } from "@/components/ui/Alerta";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { ddmm, faltantesDelPeriodo, type CeldaPeriodo, type Faltante } from "@/lib/calificacion-periodo";
import { formatearNumero, requiereConclusion, type Literal } from "@/lib/calificaciones";
import type { DatosCalificacionPeriodo } from "@/lib/server/calificacion-periodo";
import { enviarCalificacionPeriodoAction, guardarBorradorPeriodoAction, reabrirCalificacionPeriodoAction } from "./actions";
import { Evidencias } from "./Evidencias";
import { RectificarPeriodo } from "./RectificarPeriodo";

const PENDIENTE = "pendiente";
const comoTexto = (g: { valorLiteral: Literal | null; valorNumerico: number | null }) => g.valorLiteral ?? (g.valorNumerico === null ? "" : formatearNumero(g.valorNumerico).replace(",", "."));
const MAX_MOSTRADOS = 10;
const corto = (t: string) => (t.length > 38 ? `${t.slice(0, 36).trim()}…` : t);

/** «sin calificación en 3 competencias» o, si son pocas, con sus nombres cortos. */
function resumenFaltas(lista: Faltante[]): string {
  return (["calificacion", "conclusion"] as const).flatMap((tipo) => {
    const l = lista.filter((f) => f.falta === tipo);
    if (l.length === 0) return [];
    const que = tipo === "calificacion" ? "Sin calificación" : "Falta la conclusión (obligatoria en B y C)";
    return [l.length <= 2 ? `${que} en ${l.map((f) => `«${corto(f.competencia)}»`).join(" y ")}` : `${que} en ${l.length} competencias`];
  }).join(". ");
}

export function TablaPeriodo({ datos, slug, esDireccion }: { datos: DatosCalificacionPeriodo; slug: string; esDireccion: boolean }) {
  const router = useRouter();
  const [pendiente, transicion] = useTransition();
  const literal = datos.escala === "literal";
  const base = useMemo(() => {
    const m: Record<string, CeldaPeriodo> = {};
    for (const g of datos.guardadas) m[`${g.alumnoId}:${g.competenciaId}`] = { valor: comoTexto(g), conclusion: g.conclusion ?? "" };
    return m;
  }, [datos.guardadas]);
  const [guardado, setGuardado] = useState(base);
  const [celdas, setCeldas] = useState(base);
  const [conclusionAbierta, setConclusionAbierta] = useState<string | null>(null);
  const [revisar, setRevisar] = useState(false);
  const [error, setError] = useState("");
  const [confirmar, setConfirmar] = useState(false);

  const opciones = useMemo(
    () => [{ value: PENDIENTE, label: "—" }, ...(literal ? ["AD", "A", "B", "C"] : Array.from({ length: 21 }, (_, i) => String(20 - i))).map((v) => ({ value: v, label: v }))],
    [literal],
  );
  const items = useMemo(() => Object.fromEntries(opciones.map((o) => [o.value, o.label])), [opciones]);
  const editable = datos.editable;
  const evidencias = useMemo(() => {
    const m = new Map<string, DatosCalificacionPeriodo["evidencias"]>();
    for (const e of datos.evidencias) m.set(`${e.alumnoId}:${e.competenciaId}`, [...(m.get(`${e.alumnoId}:${e.competenciaId}`) ?? []), e]);
    return m;
  }, [datos.evidencias]);

  const sucias = Object.keys({ ...guardado, ...celdas }).filter((k) => (celdas[k]?.valor ?? "") !== (guardado[k]?.valor ?? "") || (celdas[k]?.conclusion ?? "") !== (guardado[k]?.conclusion ?? ""));
  const total = datos.alumnos.length * datos.competencias.length;
  const calificadas = datos.alumnos.reduce((n, a) => n + datos.competencias.filter((c) => (celdas[`${a.id}:${c.id}`]?.valor ?? "") !== "").length, 0);
  // Tras un intento de enviar, la lista se recalcula en vivo a medida que se completa.
  const faltantes: Faltante[] = useMemo(() => (revisar ? faltantesDelPeriodo(datos.alumnos, datos.competencias, celdas, datos.escala) : []), [revisar, datos, celdas]);
  const faltaClave = new Set(faltantes.map((f) => `${f.alumnoId}:${f.competenciaId}`));

  const cambiar = (clave: string, parche: Partial<CeldaPeriodo>) => {
    setError("");
    setCeldas((c) => ({ ...c, [clave]: { valor: c[clave]?.valor ?? "", conclusion: c[clave]?.conclusion ?? "", ...parche } }));
  };
  const elegir = (clave: string, valor: string) => {
    cambiar(clave, { valor });
    // En B y C la conclusión es obligatoria: se abre sola.
    if (literal && requiereConclusion(valor as Literal) && !(celdas[clave]?.conclusion ?? "").trim()) setConclusionAbierta(clave);
  };

  const aEnviar = () => sucias.flatMap((k) => {
    const [alumnoId, competenciaId] = k.split(":");
    const c = celdas[k] ?? { valor: "", conclusion: "" };
    return [{ alumnoId, competenciaId, valor: c.valor, conclusion: c.conclusion }];
  });

  const guardarBorrador = () => {
    setError("");
    transicion(async () => {
      const r = await guardarBorradorPeriodoAction(slug, { cursoId: datos.curso.id, periodoId: datos.periodo.id, celdas: aEnviar() });
      if (!r.ok) { setError(r.error); return; }
      // Lo omitido (B o C sin conclusión) sigue sin guardar; lo demás queda como borrador.
      setGuardado((g) => {
        const nuevo = { ...g };
        for (const c of aEnviar()) {
          if (literal && requiereConclusion(c.valor.toUpperCase() as Literal) && c.conclusion.trim() === "") continue;
          nuevo[`${c.alumnoId}:${c.competenciaId}`] = { valor: c.valor, conclusion: c.conclusion };
        }
        return nuevo;
      });
      toast.success(r.mensaje);
    });
  };

  const intentarEnviar = () => {
    setError("");
    setRevisar(true);
    if (faltantesDelPeriodo(datos.alumnos, datos.competencias, celdas, datos.escala).length === 0) setConfirmar(true);
  };

  const enviar = () => {
    transicion(async () => {
      const r = await enviarCalificacionPeriodoAction(slug, { cursoId: datos.curso.id, periodoId: datos.periodo.id, celdas: aEnviar() });
      setConfirmar(false);
      if (r.ok) { toast.success(r.mensaje); setRevisar(false); router.refresh(); return; }
      if ("faltantes" in r && r.faltantes) setRevisar(true);
      setError(r.error);
    });
  };

  const moverFoco = (ev: KeyboardEvent<HTMLElement>) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement) || !t.dataset.celda || t.getAttribute("aria-expanded") === "true") return;
    const delta: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };
    const d = delta[ev.key];
    if (d) {
      ev.preventDefault(); ev.stopPropagation();
      ev.currentTarget.querySelector<HTMLElement>(`[data-celda][data-row="${Number(t.dataset.row) + d[0]}"][data-col="${Number(t.dataset.col) + d[1]}"]`)?.focus();
      return;
    }
    if (!literal || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const letra = ev.key.length === 1 ? ev.key.toUpperCase() : ev.key;
    const atajo: Record<string, string> = { D: "AD", A: "A", B: "B", C: "C", Delete: "", Backspace: "" };
    if (letra in atajo) {
      ev.preventDefault(); ev.stopPropagation();
      elegir(t.dataset.clave as string, atajo[letra]);
    }
  };

  const filasFaltantes = Object.entries(Object.groupBy(faltantes, (f) => f.alumno));
  const enviada = datos.estado.estado === "enviada";
  const emitidas = new Set(datos.emitidas);

  return (
    <div className="space-y-5">
      <EncabezadoPagina
        seccion="academico"
        titulo={`Calificación del periodo · ${datos.curso.nombre}`}
        descripcion={`${datos.salon.nombre} · ${datos.periodo.nombre}. La calificación de cada competencia la decides tú; las notas del periodo son solo evidencias.`}
        acciones={<Link href={`/notas/${datos.curso.id}?periodo=${datos.periodo.id}`} className={buttonVariants({ variant: "outline" })}><Undo2 aria-hidden />Volver al registro</Link>}
      />

      {enviada && datos.estado.enviada && (
        <Alerta tipo="exito" titulo="Calificación enviada">
          La envió {datos.estado.enviada.por} el {new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" }).format(new Date(datos.estado.enviada.en))}
          {datos.salon.tutor ? ` y ya la puede ver ${datos.salon.tutor}, tutor de ${datos.salon.nombre}` : ""}. Está en solo lectura{esDireccion ? "." : "; dirección puede reabrirla si hace falta."}
        </Alerta>
      )}
      {enviada && datos.estado.esPropio && <Alerta tipo="info">{datos.emitidas.length < datos.alumnos.length ? "Si una calificación tiene un error, usa «Rectificar» en las libretas ya emitidas; dirección la revisa. Si la libreta del alumno aún no se emitió, pide a dirección reabrir el curso." : "Si una calificación tiene un error, usa «Rectificar» en su celda; dirección revisa la solicitud."}</Alerta>}
      {!enviada && datos.estado.estado === "no_disponible" && <Alerta tipo="info">Disponible desde el {ddmm(datos.estado.disponibleDesde)}, cuando termina el periodo.</Alerta>}
      {!enviada && datos.estado.periodoCerrado && <Alerta tipo="aviso">Este periodo está cerrado: ya no se puede enviar ni cambiar.</Alerta>}
      {esDireccion && !enviada && <Alerta tipo="info">Estás viendo la calificación como dirección. Solo el profesor del curso la califica y la envía.</Alerta>}
      {datos.competencias.length === 0 && <Alerta tipo="aviso">Este curso no tiene competencias activas. Agrégalas en «Competencias» antes de calificar el periodo.</Alerta>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm tabular-nums" aria-live="polite">
          <strong>{calificadas}</strong> de {total} calificaciones
          {editable && sucias.length > 0 && <span className="text-muted-foreground"> · {sucias.length} sin guardar</span>}
        </p>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={guardarBorrador} disabled={pendiente || sucias.length === 0}>
              {pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}Guardar borrador
            </Button>
            <Button onClick={intentarEnviar} disabled={pendiente || datos.competencias.length === 0}><Send aria-hidden />Enviar calificación del periodo</Button>
          </div>
        )}
        {esDireccion && enviada && (
          <BotonConfirmar
            etiqueta={<><Undo2 aria-hidden />Reabrir calificación</>}
            titulo="¿Reabrir la calificación del periodo?"
            descripcion="El profesor podrá volver a cambiarla y tendrá que enviarla de nuevo. El tutor dejará de verla como enviada."
            confirmar="Reabrir"
            accion={reabrirCalificacionPeriodoAction.bind(null, slug, datos.curso.id, datos.periodo.id)}
          />
        )}
      </div>

      {error && <Alerta tipo="error">{error}</Alerta>}
      {faltantes.length > 0 && (
        <section aria-labelledby="faltantes" className="rounded-md border border-falta/25 bg-falta-fondo px-3.5 py-3 text-sm text-falta">
          <h2 id="faltantes" className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" strokeWidth={2} aria-hidden />Falta completar antes de enviar ({faltantes.length})</h2>
          <ul className="mt-2 flex list-disc flex-col gap-0.5 pl-6">
            {filasFaltantes.slice(0, MAX_MOSTRADOS).map(([alumno, lista]) => (
              <li key={alumno}><strong>{alumno}</strong>: {resumenFaltas(lista ?? [])}</li>
            ))}
          </ul>
          {filasFaltantes.length > MAX_MOSTRADOS && <p className="mt-1 pl-6">y {filasFaltantes.length - MAX_MOSTRADOS} alumnos más. Las celdas pendientes están marcadas en la tabla.</p>}
        </section>
      )}

      <div className="overflow-x-auto rounded-lg border border-borde-sutil" role="region" aria-label="Calificación del periodo por competencia" tabIndex={0}>
        <table className="w-max min-w-full border-collapse text-sm tabular-nums" onKeyDownCapture={moverFoco}>
          <thead>
            <tr className="bg-superficie-2">
              <th rowSpan={2} scope="col" className="sticky left-0 z-20 w-32 min-w-32 border-r border-b bg-superficie-2 px-3 text-left sm:w-auto sm:min-w-56">Alumno</th>
              {datos.competencias.map((c) => (
                <th key={c.id} colSpan={2} scope="colgroup" className="min-w-72 border-r border-b px-3 py-2 text-left align-top font-semibold">
                  <span className="line-clamp-2 block max-w-72 text-pretty" title={c.nombre}>{c.nombre}</span>
                </th>
              ))}
            </tr>
            <tr className="bg-superficie-2">
              {datos.competencias.flatMap((c) => [
                <th key={`${c.id}-e`} scope="col" className="min-w-40 border-r border-b px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Evidencias</th>,
                <th key={`${c.id}-c`} scope="col" className="w-36 min-w-36 border-r border-b px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Calificación</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {datos.alumnos.map((a, fila) => (
              <tr key={a.id} className="hover:bg-accent/40">
                <th scope="row" className="sticky left-0 z-10 w-32 min-w-32 border-r border-b bg-superficie px-3 py-1 text-left text-pretty font-medium sm:w-auto sm:min-w-56">{a.nombre}</th>
                {datos.competencias.flatMap((c, col) => {
                  const clave = `${a.id}:${c.id}`;
                  const celda = celdas[clave] ?? { valor: "", conclusion: "" };
                  const obligatoria = literal && requiereConclusion(celda.valor.toUpperCase() as Literal);
                  const falta = faltaClave.has(clave);
                  const etiqueta = `${a.nombre}, ${c.nombre}`;
                  const rectificaciones = datos.rectificaciones.filter((r) => r.alumnoId === a.id && r.competenciaId === c.id);
                  const pendienteRectificacion = rectificaciones.some((r) => r.estado === "pendiente");
                  return [
                    <td key={`${clave}-e`} className="border-r border-b px-2 py-1 align-middle">
                      <Evidencias evidencias={evidencias.get(clave) ?? []} alumno={a.nombre} />
                    </td>,
                    <td key={`${clave}-c`} className={`border-r border-b px-2 py-1 align-middle ${falta ? "bg-falta-fondo" : ""}`}>
                      <div className="flex items-center gap-1">
                        {editable ? (
                          <Select value={celda.valor === "" ? PENDIENTE : celda.valor} onValueChange={(v) => elegir(clave, v === PENDIENTE ? "" : String(v ?? ""))} items={items}>
                            <SelectTrigger aria-label={`Calificación de ${etiqueta}`} data-celda data-row={fila} data-col={col} data-clave={clave} className="w-20" aria-invalid={falta && celda.valor === "" ? true : undefined}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>{opciones.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                          </Select>
                        ) : (
                          <span className="inline-flex min-h-11 min-w-12 items-center px-2 font-semibold">{celda.valor || <span className="font-normal text-muted-foreground" aria-label="Sin calificar">—</span>}</span>
                        )}
                        <Popover open={conclusionAbierta === clave} onOpenChange={(o) => setConclusionAbierta(o ? clave : null)}>
                          <PopoverTrigger
                            aria-label={`Conclusión descriptiva de ${etiqueta}${celda.conclusion ? ": escrita" : obligatoria ? ": falta (obligatoria)" : ": sin escribir"}`}
                            disabled={!editable && !celda.conclusion}
                            className={`inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-40 ${obligatoria && !celda.conclusion.trim() ? "text-falta" : celda.conclusion ? "text-primary" : "text-muted-foreground"}`}
                          >
                            {celda.conclusion ? <MessageSquareText className="size-5" strokeWidth={2} aria-hidden /> : <MessageSquarePlus className="size-5" strokeWidth={2} aria-hidden />}
                            {obligatoria && !celda.conclusion.trim() && <span className="sr-only"> obligatoria</span>}
                          </PopoverTrigger>
                          <PopoverContent className="w-80" align="end">
                            <PopoverTitle>Conclusión descriptiva</PopoverTitle>
                            <PopoverDescription>{a.nombre} · {c.nombre}. {obligatoria ? "Es obligatoria en B y C." : "Es opcional en AD y A."}</PopoverDescription>
                            <Textarea
                              rows={4} maxLength={1000} autoFocus readOnly={!editable} value={celda.conclusion}
                              onChange={(e) => cambiar(clave, { conclusion: e.target.value })}
                              aria-label={`Conclusión descriptiva de ${etiqueta}`}
                              aria-invalid={obligatoria && !celda.conclusion.trim() ? true : undefined}
                            />
                            <p className="text-xs text-muted-foreground tabular-nums">{celda.conclusion.length}/1000</p>
                            <Button variant="outline" onClick={() => setConclusionAbierta(null)}>Listo</Button>
                          </PopoverContent>
                        </Popover>
                        {enviada && emitidas.has(a.id) && !pendienteRectificacion && datos.estado.esPropio && <RectificarPeriodo slug={slug} cursoId={datos.curso.id} alumnoId={a.id} alumno={a.nombre} periodoId={datos.periodo.id} competenciaId={c.id} competencia={c.nombre} escala={datos.escala} actual={celda.valor} />}
                        {enviada && datos.estado.esPropio && !emitidas.has(a.id) && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Para corregir, pide a dirección reabrir el curso"><FileX className="size-3.5" strokeWidth={2} aria-hidden />Sin libreta emitida</span>}
                        {pendienteRectificacion && <span className="inline-flex items-center gap-1 text-xs text-tarde"><Clock className="size-3.5" strokeWidth={2} aria-hidden />Pendiente</span>}
                      </div>
                    </td>,
                  ];
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {datos.rectificaciones.length > 0 && <section aria-labelledby="rectificaciones-curso" className="rounded-lg border border-borde-sutil bg-superficie p-4">
        <h2 id="rectificaciones-curso" className="font-heading font-semibold">Rectificaciones del curso</h2>
        <ul className="mt-3 divide-y divide-borde-sutil">{datos.rectificaciones.map((r) => {
          const estado = { pendiente: { Icono: Clock, texto: "Pendiente" }, aprobada: { Icono: CheckCircle2, texto: "Aprobada" }, rechazada: { Icono: XCircle, texto: "Rechazada" } }[r.estado];
          return <li key={r.id} className="flex flex-wrap items-center gap-x-2 py-2 text-sm">
            <span className="font-medium">{datos.alumnos.find((a) => a.id === r.alumnoId)?.nombre} · {datos.competencias.find((c) => c.id === r.competenciaId)?.nombre}</span>
            <span className="inline-flex items-center gap-1"><estado.Icono className="size-4" strokeWidth={2} aria-hidden />{estado.texto}</span>
            <span className="text-muted-foreground">{r.valorAnterior ?? "sin calificar"} → {r.valorLiteral ?? (r.valorNumerico === null ? "—" : formatearNumero(r.valorNumerico))} · {r.motivo}</span>
          </li>;
        })}</ul>
      </section>}
      {editable && literal && <p className="text-sm text-muted-foreground">Teclado: las flechas te mueven entre calificaciones; D, A, B o C califican (D = AD) y Supr borra. Enter abre la lista.</p>}

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Enviar la calificación del periodo?</AlertDialogTitle>
            <AlertDialogDescription>
              {datos.curso.nombre} · {datos.salon.nombre} · {datos.periodo.nombre}. {datos.salon.tutor ? `Se la enviarás a ${datos.salon.tutor}, tutor del salón. ` : "El salón no tiene tutor asignado. "}
              Después ya no podrás cambiarla; solo dirección puede reabrirla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pendiente}>Cancelar</AlertDialogCancel>
            <Button onClick={enviar} disabled={pendiente}>{pendiente ? <Loader2 className="animate-spin" aria-hidden /> : <CheckCircle2 aria-hidden />}Enviar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

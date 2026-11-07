"use client";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, CircleDashed, Loader2, PencilLine, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { BotonConfirmar } from "@/components/shell/BotonConfirmar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { textoValor } from "@/lib/calificaciones";
import { compartirInformeAction, guardarInformeAction } from "../actions";
import { cargarInformesAction } from "./actions";
import { Elegir, type Datos } from "./comun";

type Informes = Awaited<ReturnType<typeof cargarInformesAction>>;
type Estado = "sin" | "borrador" | "compartido";
const ESTADOS: Record<Estado, { texto: string; Icono: typeof CircleDashed; clase: string }> = {
  sin: { texto: "Sin informe", Icono: CircleDashed, clase: "text-muted-foreground" },
  borrador: { texto: "Borrador", Icono: PencilLine, clase: "text-tarde" },
  compartido: { texto: "Compartido", Icono: CheckCircle2, clase: "text-llego" },
};
const PARTES = [
  { clave: "logros", etiqueta: "Qué logró", ayuda: "Lo que ya hace bien en esta competencia." },
  { clave: "mejorar", etiqueta: "Qué necesita mejorar", ayuda: "Dónde todavía tiene dificultades." },
  { clave: "recomendaciones", etiqueta: "Qué recomendamos reforzar", ayuda: "Qué puede hacer la familia en casa." },
] as const;

function Estatus({ estado }: { estado: Estado }) {
  const { texto, Icono, clase } = ESTADOS[estado];
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${clase}`}><Icono className="size-3.5" aria-hidden />{texto}</span>;
}

export function InformeProgreso({ abierto, onCerrar, datos, slug }: { abierto: boolean; onCerrar: () => void; datos: Datos; slug: string }) {
  const [info, setInfo] = useState<Informes | null>(null);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [alumnoId, setAlumnoId] = useState<string | null>(null);
  const [competenciaId, setCompetenciaId] = useState("");
  const periodoId = datos.periodo?.id;

  const [recarga, setRecarga] = useState(0);
  const cargar = useCallback(async () => { setRecarga((n) => n + 1); }, []);
  useEffect(() => {
    if (!abierto || !periodoId) return;
    let activo = true;
    cargarInformesAction(slug, datos.curso.id, periodoId)
      .then((r) => { if (activo) { setInfo(r); setError(""); } })
      .catch(() => { if (activo) setError("No pudimos cargar los informes. Intenta de nuevo."); });
    return () => { activo = false; };
  }, [abierto, slug, datos.curso.id, periodoId, recarga]);

  const alumnos = useMemo(() => datos.alumnos, [datos.alumnos]);
  const compId = competenciaId || info?.filas[0]?.competencia.id || "";
  const estadoDe = (id: string): Estado => {
    const escrito = info?.filas.some((f) => f.alumnos.find((a) => a.alumno.id === id)?.informe) ?? false;
    return !escrito ? "sin" : info?.envio ? "compartido" : "borrador";
  };
  const visibles = alumnos.filter((a) => `${a.apellidos} ${a.nombres}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(busqueda.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()));
  const fila = info?.filas.find((f) => f.competencia.id === compId);
  const celda = fila?.alumnos.find((a) => a.alumno.id === alumnoId);
  const alumno = alumnos.find((a) => a.id === alumnoId);

  return (
    <Sheet open={abierto} onOpenChange={(v) => { if (!v) { setAlumnoId(null); setBusqueda(""); onCerrar(); } }}>
      <SheetContent className="sm:!max-w-5xl">
        <SheetHeader>
          <SheetTitle>Informe de progreso</SheetTitle>
          <SheetDescription>{datos.curso.nombre} · {datos.periodo ? `${datos.periodo.nombre} ${datos.periodo.anio}` : "Sin periodo"}</SheetDescription>
        </SheetHeader>
        <div className="grid min-h-0 flex-1 gap-4 px-4 pb-4 md:grid-cols-[17rem_minmax(0,1fr)]">
          {!info && !error && <p className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-2"><Loader2 className="size-4 animate-spin" aria-hidden />Cargando informes…</p>}
          {error && <p role="alert" className="text-sm text-destructive md:col-span-2">{error}</p>}
          {info && (
            <>
              <section aria-label="Alumnos" className={`min-h-0 flex-col gap-3 ${alumnoId ? "hidden md:flex" : "flex"}`}>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar alumno" aria-label="Buscar alumno" className="pl-9" />
                </div>
                <ul className="min-h-0 divide-y divide-borde-sutil overflow-y-auto rounded-md border border-borde-sutil">
                  {visibles.map((a) => (
                    <li key={a.id}>
                      <button type="button" onClick={() => setAlumnoId(a.id)} aria-current={a.id === alumnoId ? "true" : undefined}
                        className={`flex min-h-12 w-full flex-col items-start justify-center px-3 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-ring ${a.id === alumnoId ? "bg-accent" : "hover:bg-accent/40"}`}>
                        <span className="text-sm font-medium">{a.apellidos}, {a.nombres}</span>
                        <Estatus estado={estadoDe(a.id)} />
                      </button>
                    </li>
                  ))}
                  {visibles.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">Ningún alumno coincide.</li>}
                </ul>
              </section>
              <section aria-label="Informe del alumno" className={`min-h-0 overflow-y-auto ${alumnoId ? "block" : "hidden md:block"}`}>
                {!alumno || !fila ? (
                  <p className="rounded-md border border-dashed border-borde-sutil p-6 text-sm text-muted-foreground">{info.filas.length ? "Elige un alumno de la lista para escribir su informe." : "Este curso aún no tiene competencias."}</p>
                ) : (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setAlumnoId(null)}><ArrowLeft aria-hidden />Atrás</Button>
                      <h3 className="font-heading text-lg font-semibold">{alumno.apellidos}, {alumno.nombres}</h3>
                      <Estatus estado={estadoDe(alumno.id)} />
                    </div>
                    <div className="grid gap-1.5">
                      <span className="text-sm font-medium">Competencia</span>
                      <Elegir value={compId} onChange={setCompetenciaId} opciones={info.filas.map((f) => ({ value: f.competencia.id, label: f.competencia.nombre }))} etiqueta="Competencia del informe" className="w-full" />
                    </div>
                    <div className="grid gap-1.5">
                      <span className="text-sm font-medium">Notas del periodo en esta competencia</span>
                      {celda?.notas.length ? (
                        <ul className="flex flex-wrap gap-2">{celda.notas.map((n, i) => <li key={i} className="rounded-full border border-borde-sutil bg-superficie-2 px-3 py-1 text-sm"><span className="font-semibold tabular-nums">{textoValor(n.valor)}</span> · {n.titulo}</li>)}</ul>
                      ) : <p className="text-sm text-muted-foreground">Todavía no hay notas en esta competencia.</p>}
                    </div>
                    <Editor key={`${alumno.id}:${compId}:${celda?.informe ? "g" : "n"}`} slug={slug} alumnoId={alumno.id} competenciaId={compId} periodoId={periodoId ?? ""} informe={celda?.informe ?? null} editable={info.editable} onGuardado={cargar} />
                    {info.editable && (
                      <div className="grid gap-1.5 rounded-md bg-superficie-2 p-3">
                        <p className="text-sm text-muted-foreground">{info.envio ? `Compartido el ${new Intl.DateTimeFormat("es-PE", { dateStyle: "long" }).format(info.envio.enviadoAt)}. Lo que cambies después lo ve la familia.` : "Se comparten los informes escritos de todo el curso; las familias reciben un aviso y los leen en «Notas»."}</p>
                        <BotonConfirmar
                          className="self-start"
                          variante={info.envio ? "outline" : "default"}
                          etiqueta={<><Send aria-hidden />{info.envio ? "Reenviar aviso a la familia" : "Compartir con la familia"}</>}
                          titulo={info.envio ? "¿Avisar otra vez a las familias?" : "¿Compartir el informe de progreso?"}
                          descripcion={info.envio ? "Las familias de los alumnos con informe recibirán el aviso de nuevo." : "Las familias de los alumnos con informe podrán leerlo en «Notas» y recibirán un aviso. Lo que cambies después también lo verán."}
                          confirmar={info.envio ? "Reenviar aviso" : "Compartir"}
                          accion={async () => { const r = await compartirInformeAction(slug, datos.curso.id, periodoId ?? "", Boolean(info.envio)); if (r.ok) await cargar(); return r; }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Editor({ slug, alumnoId, competenciaId, periodoId, informe, editable, onGuardado }: {
  slug: string; alumnoId: string; competenciaId: string; periodoId: string; informe: { logros: string; mejorar: string; recomendaciones: string } | null; editable: boolean; onGuardado: () => Promise<void>;
}) {
  const [textos, setTextos] = useState(informe ?? { logros: "", mejorar: "", recomendaciones: "" });
  const [error, setError] = useState("");
  const [pendiente, transicion] = useTransition();
  const guardar = () => transicion(async () => {
    const r = await guardarInformeAction(slug, { alumnoId, competenciaId, periodoId, ...textos });
    if (!r.ok) { setError(r.error); return; }
    setError(""); toast.success(r.mensaje ?? "Informe guardado."); await onGuardado();
  });
  if (!editable) {
    return informe ? (
      <dl className="grid gap-2 text-sm">{PARTES.filter((p) => informe[p.clave]).map((p) => <div key={p.clave}><dt className="font-medium">{p.etiqueta}</dt><dd className="text-muted-foreground">{informe[p.clave]}</dd></div>)}</dl>
    ) : <p className="text-sm text-muted-foreground">Sin informe.</p>;
  }
  return (
    <div className="grid gap-3">
      {PARTES.map((p) => (
        <label key={p.clave} className="grid gap-1.5 text-sm">
          <span className="font-medium">{p.etiqueta} <span className="font-normal text-muted-foreground">· {p.ayuda}</span></span>
          <Textarea rows={3} maxLength={600} value={textos[p.clave]} onChange={(e) => setTextos((t) => ({ ...t, [p.clave]: e.target.value }))} />
        </label>
      ))}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button className="self-start" onClick={guardar} disabled={pendiente}>{pendiente && <Loader2 className="animate-spin" aria-hidden />}Guardar</Button>
    </div>
  );
}

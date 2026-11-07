"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { crearCalificacionAction } from "./actions";
import { Elegir, fechaIso, opcionesDeNota, uuidCliente, type Datos } from "./comun";

export function NuevaCalificacion({ datos, slug, abierto, onCerrar, onGuardada }: {
  datos: Datos; slug: string; abierto: boolean; onCerrar: () => void; onGuardada: (evaluacionId: string | null, mensaje?: string) => void;
}) {
  const [pendiente, transicion] = useTransition();
  const [paso, setPaso] = useState(1);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState(() => fechaIso(new Date()));
  const [periodoId, setPeriodoId] = useState(datos.periodo?.id ?? "");
  const [competenciaId, setCompetenciaId] = useState("");
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(false);
  const [clave, setClave] = useState(() => uuidCliente());
  const [error, setError] = useState("");
  const opciones = opcionesDeNota(datos.escala);
  const todos = datos.escala === "literal" ? "A" : "20";

  const reiniciar = () => {
    setPaso(1); setNombre(""); setDescripcion(""); setNotas({}); setObservaciones({}); setVisible(false); setCompetenciaId(""); setError(""); setClave(uuidCliente());
  };
  const cancelar = () => { reiniciar(); onCerrar(); };
  const cambiarFecha = (v: string) => {
    setFecha(v);
    const p = datos.periodos.find((p) => fechaIso(p.inicio) <= v && fechaIso(p.fin) >= v && !p.cerrado);
    if (p) setPeriodoId(p.id);
  };
  const continuar = () => {
    if (!nombre.trim()) { setError("Escribe el nombre de la actividad."); return; }
    const sinNota = datos.alumnos.find((a) => (observaciones[a.id] ?? "").trim() && !notas[a.id]);
    if (sinNota) { setError(`${sinNota.apellidos}, ${sinNota.nombres}: Pon una nota para guardar la observación.`); return; }
    setError(""); setPaso(2);
  };
  const guardar = () => {
    setError("");
    transicion(async () => {
      const r = await crearCalificacionAction(slug, {
        cursoId: datos.curso.id, periodoId, competenciaId, claveIdempotencia: clave, nombre, descripcion, fecha, observacionVisible: visible,
        notas: datos.alumnos.map((a) => ({ alumnoId: a.id, valor: notas[a.id] ?? "", observacion: observaciones[a.id] ?? "" })),
      });
      if (!r.ok) { setError(r.error); return; }
      reiniciar();
      onGuardada(r.evaluacionId ?? null, r.mensaje);
    });
  };

  return (
    <Sheet open={abierto} onOpenChange={(v) => { if (!v) onCerrar(); }}>
      <SheetContent className="sm:!max-w-3xl">
        <SheetHeader>
          <SheetTitle>Nueva calificación</SheetTitle>
          <SheetDescription>Paso {paso} de 2 · {paso === 1 ? "Actividad y notas" : "Competencia"}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4">
          {paso === 1 ? (
            <>
              <label className="grid gap-1 font-medium">Nombre<Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} required /></label>
              <label className="grid gap-1 font-medium">Descripción (opcional)<Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={500} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 font-medium">Fecha de la actividad<Input type="date" value={fecha} onChange={(e) => cambiarFecha(e.target.value)} /></label>
                <div className="grid gap-1 font-medium">
                  <span>Periodo</span>
                  <Elegir value={periodoId} onChange={setPeriodoId} opciones={datos.periodos.map((p) => ({ value: p.id, label: `${p.nombre} ${p.anio}` }))} etiqueta="Periodo de la actividad" className="w-full" />
                </div>
              </div>
              <div className="divide-y rounded-md border">
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 font-medium">
                  <span>Alumnos</span>
                  <Button variant="ghost" size="sm" onClick={() => setNotas(Object.fromEntries(datos.alumnos.map((a) => [a.id, todos])))}>Todos {todos}</Button>
                </div>
                <label className="flex min-h-11 items-center justify-between gap-3 bg-superficie-2 px-3 py-2">
                  <span className="text-sm"><span className="font-medium">Observaciones visibles para la familia</span><br /><span className="text-muted-foreground">{visible ? "La familia las verá cuando publiques los resultados." : "Privadas: solo las ven tú, el tutor y dirección."}</span></span>
                  <Switch checked={visible} onCheckedChange={setVisible} aria-label="Observaciones visibles para la familia" />
                </label>
                <div className="hidden grid-cols-[minmax(0,1fr)_8rem_minmax(0,1.3fr)] gap-3 px-3 py-1.5 text-xs font-medium text-muted-foreground sm:grid" aria-hidden>
                  <span>Alumno</span><span>Nota</span><span>Observación (opcional)</span>
                </div>
                {datos.alumnos.map((a) => (
                  <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1.3fr)]">
                    <span>{a.apellidos}, {a.nombres}</span>
                    <Elegir value={notas[a.id] || "pendiente"} onChange={(v) => setNotas((prev) => ({ ...prev, [a.id]: v === "pendiente" ? "" : v }))} opciones={opciones} etiqueta={`Nota de ${a.nombres}`} className="w-32" />
                    <Input
                      value={observaciones[a.id] ?? ""} onChange={(e) => setObservaciones((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      maxLength={500} placeholder="Observación (opcional)" aria-label={`Observación de ${a.nombres}`} className="col-span-2 sm:col-span-1"
                    />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="font-heading text-lg font-semibold">¿A qué competencia corresponde esta calificación?</h3>
              <p className="text-muted-foreground">Elige una competencia activa de {datos.curso.nombre}.</p>
              <div className="grid gap-2">
                {datos.competencias.map((c) => (
                  <button key={c.id} onClick={() => setCompetenciaId(c.id)} aria-pressed={competenciaId === c.id} className={`min-h-12 rounded-md border px-4 py-2 text-left focus-visible:outline-2 focus-visible:outline-ring ${competenciaId === c.id ? "border-primary bg-accent font-semibold" : "border-borde-sutil"}`}>{c.nombre}</button>
                ))}
              </div>
            </>
          )}
          {error && <p role="alert" className="text-destructive">{error}</p>}
        </div>
        <SheetFooter>
          {paso === 1 ? <Button variant="outline" onClick={cancelar}>Cancelar</Button> : <Button variant="outline" onClick={() => { setError(""); setPaso(1); }}>Atrás</Button>}
          <Button disabled={pendiente || (paso === 2 && !competenciaId)} onClick={paso === 1 ? continuar : guardar}>
            {pendiente ? "Guardando…" : paso === 1 ? "Continuar" : "Guardar calificación"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

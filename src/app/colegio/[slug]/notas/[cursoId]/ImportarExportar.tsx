"use client";
import { useRef, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed, Download, FileSpreadsheet, FileUp, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { VistaPreviaRegistro } from "@/lib/server/registro-notas-archivos";
import { importarRegistroAction, previsualizarImportacionRegistroAction } from "./actions";
import { Elegir, fechaIso, uuidCliente, type Datos } from "./comun";

const MAX_BYTES = 3_000_000;

/** Descargar plantilla, importar con vista previa y exportar el registro (specs/47). */
export function ImportarExportar({ abierto, onCerrar, datos, slug, onImportada }: { abierto: boolean; onCerrar: () => void; datos: Datos; slug: string; onImportada: (id: string | null) => void }) {
  const periodoId = datos.periodo?.id ?? "";
  const base = `/api/notas`;
  const consulta = `curso=${datos.curso.id}&periodo=${periodoId}`;
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(() => fechaIso(new Date()));
  const [competenciaId, setCompetenciaId] = useState("");
  const [visible, setVisible] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<VistaPreviaRegistro | null>(null);
  const [error, setError] = useState("");
  const [clave, setClave] = useState(() => uuidCliente());
  const [pendiente, transicion] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  const formulario = (f: File) => {
    const d = new FormData();
    d.set("cursoId", datos.curso.id); d.set("periodoId", periodoId); d.set("competenciaId", competenciaId); d.set("nombre", nombre); d.set("fecha", fecha);
    d.set("claveIdempotencia", clave); if (visible) d.set("observacionVisible", "on"); d.set("archivo", f);
    return d;
  };
  const revisar = (f: File | null = archivo) => {
    if (!f) return;
    setError("");
    transicion(async () => {
      const r = await previsualizarImportacionRegistroAction(slug, formulario(f));
      if (!r.ok) { setError(r.error); setVista(null); } else setVista(r.vista);
    });
  };
  const elegir = (f: File | undefined) => {
    setVista(null); setError(""); setArchivo(f ?? null);
    if (!f) return;
    if (f.size > MAX_BYTES) { setError("El archivo es demasiado grande (máximo 3 MB)."); setArchivo(null); return; }
    revisar(f);
  };
  const importar = () => {
    if (!archivo) return;
    setError("");
    transicion(async () => {
      const r = await importarRegistroAction(slug, formulario(archivo));
      if (!r.ok) { setError(r.error); return; }
      toast.success(r.mensaje ?? "Notas importadas.");
      setVista(null); setArchivo(null); setNombre(""); setCompetenciaId(""); setClave(uuidCliente());
      if (entrada.current) entrada.current.value = "";
      onImportada(r.evaluacionId ?? null);
    });
  };
  const puedeImportar = datos.puedeEditar;
  const listo = !!vista && !vista.bloqueo && vista.filas.length > 0;

  return (
    <Sheet open={abierto} onOpenChange={(v) => { if (!v) onCerrar(); }}>
      <SheetContent className="sm:!max-w-2xl">
        <SheetHeader>
          <SheetTitle>Importar / Exportar</SheetTitle>
          <SheetDescription>{datos.curso.nombre} · {datos.periodo ? `${datos.periodo.nombre} ${datos.periodo.anio}` : "Sin periodo"}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
          {puedeImportar && (
            <section aria-labelledby="sec-plantilla" className="grid gap-3">
              <h3 id="sec-plantilla" className="font-heading text-base font-semibold">1. Descargar plantilla</h3>
              <p className="text-sm text-muted-foreground">Trae la lista de alumnos del curso. Llena solo la nota (y, si quieres, una observación) y súbela abajo. Una plantilla es para una actividad.</p>
              <div className="flex flex-wrap gap-2">
                <a href={`${base}/plantilla?${consulta}&formato=xlsx`} className={buttonVariants()}><FileSpreadsheet aria-hidden />Descargar plantilla (Excel)</a>
                <a href={`${base}/plantilla?${consulta}&formato=csv`} className={buttonVariants({ variant: "outline" })}><Download aria-hidden />Plantilla CSV</a>
              </div>
            </section>
          )}
          {puedeImportar && (
            <section aria-labelledby="sec-importar" className="grid gap-3">
              <h3 id="sec-importar" className="font-heading text-base font-semibold">2. Importar notas</h3>
              <label className="grid gap-1 text-sm font-medium">Nombre de la actividad<Input value={nombre} onChange={(e) => { setNombre(e.target.value); setVista(null); }} maxLength={120} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium">Fecha de la actividad<Input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setVista(null); }} /></label>
                <div className="grid gap-1 text-sm font-medium"><span>Competencia</span>
                  <Elegir value={competenciaId} onChange={(v) => { setCompetenciaId(v); setVista(null); }} opciones={datos.competencias.map((c) => ({ value: c.id, label: c.nombre }))} etiqueta="Competencia de la actividad importada" className="w-full" />
                </div>
              </div>
              <label className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-superficie-2 px-3 text-sm">
                <span><span className="font-medium">Observaciones visibles para la familia</span><br /><span className="text-muted-foreground">{visible ? "La familia las verá al publicar." : "Privadas por defecto."}</span></span>
                <Switch checked={visible} onCheckedChange={(v) => { setVisible(v); setVista(null); }} aria-label="Observaciones del archivo visibles para la familia" />
              </label>
              <label className="grid gap-1 text-sm font-medium">Archivo (Excel .xlsx o CSV)
                <input ref={entrada} type="file" accept=".xlsx,.csv,text/csv" onChange={(e) => elegir(e.target.files?.[0])} className={`${buttonVariants({ variant: "outline" })} h-auto w-full cursor-pointer py-2 file:mr-3 file:font-medium`} />
              </label>
              {archivo && !vista && !pendiente && <Button variant="outline" className="self-start" onClick={() => revisar()}>Revisar archivo</Button>}
              {pendiente && !vista && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden />Revisando el archivo…</p>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {vista && (
                <div className="grid gap-3" aria-live="polite" data-testid="vista-previa">
                  <p className="flex items-center gap-2 text-sm font-medium"><FileUp className="size-4" aria-hidden />Vista previa de {archivo?.name}</p>
                  {vista.bloqueo && <p role="alert" className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle className="size-4" aria-hidden />{vista.bloqueo}</p>}
                  <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                    <li className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-llego" aria-hidden />Válidas: {vista.filas.length}</li>
                    <li className="flex items-center gap-1.5"><AlertTriangle className="size-4 text-falta" aria-hidden />Con error: {vista.errores.length}</li>
                    <li className="flex items-center gap-1.5"><CircleDashed className="size-4 text-muted-foreground" aria-hidden />Pendientes: {vista.pendientes}</li>
                  </ul>
                  {vista.errores.length > 0 && (
                    <div className="rounded-lg border border-falta/40 bg-falta-fondo p-3 text-sm">
                      <p className="font-medium text-falta">Estas filas no se importarán</p>
                      <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">{vista.errores.slice(0, 50).map((e, i) => <li key={i}>Fila {e.linea}: {e.mensaje}</li>)}</ul>
                    </div>
                  )}
                  {vista.filas.length > 0 && (
                    <div className="max-h-64 overflow-auto rounded-lg border">
                      <table className="w-full text-sm"><thead className="sticky top-0 bg-muted text-left"><tr><th className="px-3 py-2">Alumno</th><th className="px-3 py-2">Nota</th><th className="px-3 py-2">Observación</th></tr></thead>
                        <tbody>{vista.filas.slice(0, 200).map((f) => <tr key={f.alumnoId} className="border-t"><td className="px-3 py-1.5">{f.alumno}</td><td className="px-3 py-1.5 font-semibold tabular-nums">{f.nota}</td><td className="px-3 py-1.5 text-muted-foreground">{f.observacion}</td></tr>)}</tbody></table>
                    </div>
                  )}
                  <Button className="self-start" disabled={pendiente || !listo} onClick={importar}>{pendiente && <Loader2 className="animate-spin" aria-hidden />}<Upload aria-hidden />Importar {vista.filas.length} {vista.filas.length === 1 ? "nota" : "notas"}</Button>
                  {vista.bloqueo && <Button variant="outline" className="self-start" disabled={pendiente} onClick={() => revisar()}>Revisar de nuevo</Button>}
                </div>
              )}
            </section>
          )}
          <section aria-labelledby="sec-exportar" className="grid gap-3">
            <h3 id="sec-exportar" className="font-heading text-base font-semibold">{puedeImportar ? "3. " : ""}Exportar registro</h3>
            <p className="text-sm text-muted-foreground">CSV del curso y periodo: alumnos por actividades agrupadas por competencia, con las observaciones (las privadas van marcadas).</p>
            <a href={`${base}/exportar?${consulta}`} className={`${buttonVariants({ variant: "outline" })} self-start`}><Download aria-hidden />Exportar registro (CSV)</a>
          </section>
          {!puedeImportar && <p className="text-sm text-muted-foreground">Solo quien dicta el curso, con las notas abiertas, puede importar notas.</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}

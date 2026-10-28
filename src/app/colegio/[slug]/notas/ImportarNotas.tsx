"use client";

import { AlertTriangle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Alerta } from "@/components/ui/Alerta";
import { buttonVariants } from "@/components/ui/button";
import { MAX_BYTES_CSV_NOTAS } from "@/lib/notas-csv";
import type { VistaPreviaImportacion } from "@/lib/server/notas";
import { cn } from "@/lib/utils";
import { importarNotasAction, previsualizarImportacionAction } from "./actions";

/** Elige un CSV, muestra la vista previa con errores por fila y, al confirmar, guarda solo las notas válidas. */
export function ImportarNotas({ slug, cursoId, periodoId, bloqueo }: { slug: string; cursoId: string; periodoId: string; bloqueo: string | null }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [vista, setVista] = useState<VistaPreviaImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  async function elegir(archivo: File | undefined) {
    setVista(null);
    setError(null);
    setTexto(null);
    if (!archivo) return;
    if (archivo.size > MAX_BYTES_CSV_NOTAS) return setError("El archivo es demasiado grande (máximo 500 KB).");
    const contenido = await archivo.text();
    setNombre(archivo.name);
    setTexto(contenido);
    iniciar(async () => setVista(await previsualizarImportacionAction(slug, cursoId, periodoId, contenido)));
  }

  const confirmar = () =>
    iniciar(async () => {
      if (texto === null) return;
      const r = await importarNotasAction(slug, cursoId, periodoId, texto);
      if (!r.ok) return setError(r.error);
      toast.success(r.mensaje ?? "Notas importadas.");
      setVista(null);
      setTexto(null);
      setNombre("");
      if (entrada.current) entrada.current.value = "";
    });

  return (
    <div className="flex flex-col gap-4">
      {bloqueo && <Alerta tipo="aviso">{bloqueo}</Alerta>}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">Archivo CSV</span>
        <input
          ref={entrada} type="file" accept=".csv,text/csv" disabled={Boolean(bloqueo)}
          onChange={(e) => void elegir(e.target.files?.[0])}
          className={cn(buttonVariants({ variant: "outline" }), "h-auto w-full cursor-pointer py-2 file:mr-3 file:font-medium sm:w-fit")}
        />
      </label>
      {pendiente && !vista && <p className="flex items-center gap-2 text-cuerpo-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />Revisando el archivo…</p>}
      {error && <Alerta tipo="error">{error}</Alerta>}

      {vista && (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-medium">
            <FileUp className="size-4" strokeWidth={2} aria-hidden />Vista previa de {nombre}
          </p>
          <p className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-llego" strokeWidth={2} aria-hidden />
            Válidas: {vista.cambios.length}
            <span className="text-muted-foreground">· Vacías (no cambian nada): {vista.vacias}</span>
          </p>
          {vista.errores.length > 0 && (
            <div className="rounded-lg border border-falta/40 bg-falta-fondo p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-falta"><AlertTriangle className="size-4" strokeWidth={2} aria-hidden />{vista.errores.length} {vista.errores.length === 1 ? "problema" : "problemas"} (esas celdas no se importarán)</p>
              <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
                {vista.errores.slice(0, 50).map((e, i) => <li key={i}>Fila {e.linea}: {e.mensaje}</li>)}
              </ul>
            </div>
          )}
          {vista.columnasIgnoradas.length > 0 && <p className="text-cuerpo-sm text-muted-foreground">Columnas ignoradas (no son evaluaciones de este periodo): {vista.columnasIgnoradas.join(", ")}.</p>}
          {vista.cambios.length > 0 && (
            <div className="max-h-72 overflow-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted text-left"><tr><th className="px-3 py-2">Alumno</th><th className="px-3 py-2">Evaluación</th><th className="px-3 py-2">Nota</th></tr></thead>
                <tbody>
                  {vista.cambios.slice(0, 200).map((c) => (
                    <tr key={`${c.alumnoId}:${c.evaluacionId}`} className="border-t">
                      <td className="px-3 py-1.5">{c.alumno}</td><td className="px-3 py-1.5">{c.evaluacion}</td><td className="px-3 py-1.5 tabular-nums">{c.texto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {vista.cambios.length > 200 && <p className="text-cuerpo-sm text-muted-foreground">Se muestran las primeras 200 filas.</p>}
          <div>
            <button type="button" onClick={confirmar} disabled={pendiente || !vista.editable || vista.cambios.length === 0} className={buttonVariants()}>
              {pendiente && <Loader2 className="animate-spin" strokeWidth={2} aria-hidden />}
              Importar {vista.cambios.length} {vista.cambios.length === 1 ? "nota" : "notas"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { IconoAdjunto } from "@/components/adjuntos/IconoAdjunto";
import { Alerta } from "@/components/ui/Alerta";
import { ACCEPT_ADJUNTOS, formatoTamano, MAX_ADJUNTOS, MAX_BYTES_ADJUNTO, TIPOS_ADJUNTO_TEXTO, type AdjuntoVista } from "@/lib/adjuntos";

/**
 * Campos de adjuntos para un formulario con server action: `adjuntos` (archivos nuevos) y, al editar,
 * `quitarAdjuntos` (ids marcados). Muestra la lista de archivos elegidos y avisa si no cumplen los límites
 * (el servidor vuelve a validar).
 */
export function CamposAdjuntos({ existentes = [], id = "adjuntos" }: { existentes?: AdjuntoVista[]; id?: string }) {
  const [elegidos, setElegidos] = useState<File[]>([]);
  const [quitar, setQuitar] = useState<string[]>([]);
  const entrada = useRef<HTMLInputElement>(null);
  const disponibles = MAX_ADJUNTOS - (existentes.length - quitar.length);
  const problema =
    elegidos.length > disponibles
      ? `Solo puedes adjuntar ${MAX_ADJUNTOS} archivos en total.`
      : elegidos.find((f) => f.size > MAX_BYTES_ADJUNTO)
        ? `«${elegidos.find((f) => f.size > MAX_BYTES_ADJUNTO)!.name}» pesa más de 10 MB.`
        : null;

  function alElegir(lista: FileList | null) {
    setElegidos(Array.from(lista ?? []));
  }

  function descartar(indice: number) {
    const siguiente = elegidos.filter((_, i) => i !== indice);
    setElegidos(siguiente);
    if (entrada.current) {
      const datos = new DataTransfer();
      siguiente.forEach((f) => datos.items.add(f));
      entrada.current.files = datos.files;
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:col-span-2">
      {existentes.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-medium">Archivos adjuntos actuales</legend>
          {existentes.map((a) => (
            <label key={a.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm has-[:checked]:border-falta/40 has-[:checked]:bg-falta-fondo">
              <IconoAdjunto mimeType={a.mimeType} nombre={a.nombre} />
              <span className="min-w-0 flex-1 truncate">{a.nombre} <span className="text-xs text-muted-foreground">({formatoTamano(a.bytes)})</span></span>
              <input
                type="checkbox"
                name="quitarAdjuntos"
                value={a.id}
                className="size-5 accent-primary"
                onChange={(e) => setQuitar((q) => (e.target.checked ? [...q, a.id] : q.filter((x) => x !== a.id)))}
              />
              <span className="text-xs font-medium">Quitar</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor={id} className="flex items-center gap-1.5 font-medium">
          <Paperclip className="size-4" strokeWidth={2} aria-hidden /> Adjuntar archivos (opcional)
        </label>
        <input
          ref={entrada}
          id={id}
          type="file"
          name="adjuntos"
          multiple
          accept={ACCEPT_ADJUNTOS}
          onChange={(e) => alElegir(e.target.files)}
          aria-describedby={`${id}-ayuda`}
          className="min-h-10 text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-card file:px-3 file:text-sm file:font-semibold"
        />
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          Hasta {MAX_ADJUNTOS} archivos de 10 MB: {TIPOS_ADJUNTO_TEXTO}.
        </p>
      </div>
      {elegidos.length > 0 && (
        <ul aria-label="Archivos elegidos" className="flex flex-col gap-1.5">
          {elegidos.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex min-h-11 items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
              <IconoAdjunto mimeType={f.type} nombre={f.name} />
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatoTamano(f.size)}</span>
              <button type="button" onClick={() => descartar(i)} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent" aria-label={`Quitar ${f.name} de la selección`}>
                <X className="size-4" strokeWidth={2} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {problema && <Alerta tipo="aviso">{problema}</Alerta>}
    </div>
  );
}

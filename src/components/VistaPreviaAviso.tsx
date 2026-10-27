"use client";

import { Mail } from "lucide-react";
import { MARCADOR_ALUMNO } from "@/lib/vista-previa";

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Vista previa del correo que recibirá la familia (specs/04 y 06). */
export function VistaPreviaAviso({ asunto, html, alumno }: { asunto: string; html: string; alumno: string }) {
  const nombre = escapar(alumno);
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-start gap-2 text-sm text-muted-foreground">
        <Mail className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        Asunto: <strong className="text-foreground">{asunto.replaceAll(MARCADOR_ALUMNO, alumno)}</strong>
      </figcaption>
      <iframe
        title={`Vista previa del correo para la familia de ${alumno}`}
        srcDoc={html.replaceAll(MARCADOR_ALUMNO, nombre)}
        sandbox=""
        className="h-80 w-full rounded-md border border bg-white"
      />
    </figure>
  );
}

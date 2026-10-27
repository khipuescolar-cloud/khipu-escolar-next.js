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
      <figcaption className="flex items-center gap-2 text-sm text-pizarra">
        <Mail className="h-4 w-4" strokeWidth={2} aria-hidden />
        Asunto: <strong className="text-tinta">{asunto.replaceAll(MARCADOR_ALUMNO, alumno)}</strong>
      </figcaption>
      <iframe
        title={`Vista previa del correo para la familia de ${alumno}`}
        srcDoc={html.replaceAll(MARCADOR_ALUMNO, nombre)}
        sandbox=""
        className="h-80 w-full rounded-md border border-arena bg-white"
      />
    </figure>
  );
}

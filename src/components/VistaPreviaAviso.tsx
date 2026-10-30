"use client";

import { Mail } from "lucide-react";
import { hora12 } from "@/lib/fechas";
import { HORA_MARCADOR_INGRESO, MARCADOR_ALUMNO } from "@/lib/vista-previa";

function escapar(texto: string) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Vista previa del correo que recibirá la familia (specs/04 y 06). `horaIngreso` (HH:mm): en la falta a clase de una
 * lista de curso, la hora de ingreso al colegio del alumno elegido reemplaza a la del marcador.
 */
export function VistaPreviaAviso({ asunto, html: plantilla, alumno, horaIngreso }: { asunto: string; html: string; alumno: string; horaIngreso?: string }) {
  const nombre = escapar(alumno);
  const html = horaIngreso ? plantilla.replaceAll(hora12(HORA_MARCADOR_INGRESO), hora12(horaIngreso)) : plantilla;
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex items-start gap-2 text-cuerpo-sm text-muted-foreground">
        <Mail className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        Asunto: <strong className="text-foreground">{asunto.replaceAll(MARCADOR_ALUMNO, alumno)}</strong>
      </figcaption>
      <iframe
        title={`Vista previa del correo para la familia de ${alumno}`}
        srcDoc={html.replaceAll(MARCADOR_ALUMNO, nombre)}
        sandbox=""
        className="h-80 w-full rounded-lg border bg-white"
      />
    </figure>
  );
}

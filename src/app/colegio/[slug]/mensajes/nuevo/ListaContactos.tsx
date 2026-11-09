"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Boton } from "@/components/ui/Boton";
import type { Interlocutor } from "@/lib/server/mensajes";
import { abrirConversacionAction } from "../actions";
import { iniciales } from "../ListaConversaciones";

export function ListaContactos({ posibles, rol }: { posibles: Interlocutor[]; rol: "apoderado" | "profesor" }) {
  const [busqueda, setBusqueda] = useState("");
  const visibles = posibles.filter((p) => (p.etiqueta + " " + p.alumnoNombre).toLocaleLowerCase("es-PE").includes(busqueda.toLocaleLowerCase("es-PE")));
  const grupos = Object.groupBy(visibles, (p) => p.alumnoNombre);
  return <>
    <div className="relative px-3 pb-3"><Search aria-hidden className="absolute top-3 left-6 size-5 text-muted-foreground" /><label htmlFor="buscar-contacto" className="sr-only">Buscar contacto o alumno</label><input id="buscar-contacto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar contacto o alumno" className="h-11 w-full rounded-md border border-input bg-muted pr-3 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-ring" /></div>
    {Object.entries(grupos).map(([alumno, contactos]) => <section key={alumno}><h2 className="border-y border-border bg-muted px-4 py-2 text-sm font-semibold">{alumno}</h2><ul>{contactos?.map((p) => <li key={p.alumnoId + p.profesorId + p.apoderadoId}>
      <form action={abrirConversacionAction} className="flex min-h-20 items-center gap-3 border-b border-border px-4 py-3">
        <input type="hidden" name="alumnoId" value={p.alumnoId} /><input type="hidden" name="contraparteId" value={rol === "apoderado" ? p.profesorId : p.apoderadoId} />
        <Avatar size="lg"><AvatarFallback className="bg-sec-suave font-semibold text-sec-tinta">{iniciales(p.etiqueta)}</AvatarFallback></Avatar>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{p.etiqueta.split(" · ")[0]}</span><span className="block truncate text-sm text-muted-foreground">{p.etiqueta.split(" · ")[1]}</span></span>
        <Boton type="submit" variante="secundario">Escribir</Boton>
      </form>
    </li>)}</ul></section>)}
    {visibles.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">No hay contactos que coincidan.</p>}
  </>;
}

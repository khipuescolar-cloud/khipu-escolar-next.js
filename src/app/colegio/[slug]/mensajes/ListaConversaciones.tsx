"use client";

import Link from "next/link";
import { MessageSquarePlus, Search } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type FilaConversacion = {
  id: string;
  etiqueta: string;
  noLeidos: number;
  ultimoMensaje: { propio: boolean; cuerpo: string; createdAt: Date } | null;
  puedeEscribir: boolean;
};

/** Iniciales (máx. 2) del nombre que precede al « · » de la etiqueta. */
export function iniciales(etiqueta: string): string {
  const nombre = etiqueta.split(" · ")[0] ?? etiqueta;
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export function fechaLista(valor: Date | string) {
  const fecha = new Date(valor);
  const hoy = new Date();
  const local = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  if (local(fecha) === local(hoy)) return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(fecha);
  if (local(fecha) === local(new Date(hoy.getTime() - 86400000))) return "Ayer";
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "2-digit", year: "2-digit" }).format(fecha);
}

/** Lista de conversaciones. `compacta` (junto a un hilo abierto) omite la vista previa del último mensaje. */
export function ListaConversaciones({ filas, activa, puedeCrear = true }: { filas: FilaConversacion[]; activa?: string; puedeCrear?: boolean }) {
  const [busqueda, setBusqueda] = useState("");
  const visibles = filas.filter((c) => c.etiqueta.toLocaleLowerCase("es-PE").includes(busqueda.toLocaleLowerCase("es-PE")));
  return (
    <aside className="flex min-h-0 w-full flex-col border-b border-border bg-card md:w-[22.5rem] md:shrink-0 md:border-r md:border-b-0"><div className="flex h-16 items-center justify-between border-b border-border px-4"><h1 className="font-heading text-xl font-semibold">Chats</h1>{puedeCrear && <Link href="/mensajes/nuevo" aria-label="Nuevo mensaje" title="Nuevo mensaje" className="flex size-11 items-center justify-center rounded-full text-primary hover:bg-accent"><MessageSquarePlus aria-hidden /></Link>}</div><div className="relative border-b border-border p-3"><Search aria-hidden className="absolute top-6 left-6 size-5 text-muted-foreground" /><label htmlFor="buscar-chat" className="sr-only">Buscar chat por nombre o alumno</label><input id="buscar-chat" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o alumno" className="h-11 w-full rounded-md border border-input bg-muted pr-3 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-ring" /></div><ul className="min-h-0 flex-1 overflow-y-auto" aria-label="Conversaciones">
      {visibles.map((c) => (
        <li key={c.id}>
          <Link
            href={`/mensajes/${c.id}`}
            aria-current={c.id === activa ? "page" : undefined}
            className={cn("flex min-h-20 items-center gap-3 px-4 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset", c.id === activa && "bg-accent")}
          >
            <Avatar size="lg">
              <AvatarFallback className="bg-sec-suave text-sm font-semibold text-sec-tinta">{iniciales(c.etiqueta)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate text-sm", c.noLeidos > 0 ? "font-bold" : "font-semibold")}>{c.etiqueta.split(" · ")[0]}</span><span className="block truncate text-sm text-muted-foreground">{c.etiqueta.split(" · ")[1]?.replace(" — ", " · ")}</span>
              {(
                <span className="block truncate text-sm text-muted-foreground">
                  {c.ultimoMensaje ? `${c.ultimoMensaje.propio ? "Tú: " : ""}${c.ultimoMensaje.cuerpo}` : "Sin mensajes todavía"}
                </span>
              )}
            </span>
            <span className="flex flex-col items-end gap-2 self-start text-xs text-muted-foreground">{c.ultimoMensaje && <time dateTime={new Date(c.ultimoMensaje.createdAt).toISOString()}>{fechaLista(c.ultimoMensaje.createdAt)}</time>}{c.noLeidos > 0 && <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-sec-tinta px-2 text-xs font-semibold text-fondo tabular-nums">{c.noLeidos}<span className="sr-only"> sin leer</span></span>}</span>
          </Link>
        </li>
      ))}
    </ul></aside>
  );
}

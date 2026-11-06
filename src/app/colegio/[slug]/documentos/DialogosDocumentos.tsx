"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Download, ExternalLink, Folder, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatoTamano } from "@/lib/adjuntos";
import { cn } from "@/lib/utils";
import type { CarpetaOpcion } from "@/lib/server/documentos";
import { moverDirectoAction, renombrarDirectoAction } from "./actions";
import { Icono, tipoLegible, type Item } from "./tipos-documentos";

/** Renombrar (F2): carpeta o título del documento. */
export function DialogoRenombrar({ item, onCerrar, onListo }: { item: Item | null; onCerrar: () => void; onListo: () => void }) {
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const id = item?.id;
  useEffect(() => { if (item) queueMicrotask(() => { setNombre(item.nombre); setError(null); setTimeout(() => entrada.current?.select(), 50); }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setEnviando(true); setError(null);
    const r = await renombrarDirectoAction(item.tipo, item.id, nombre).catch(() => ({ ok: false as const, error: "No se pudo renombrar." }));
    setEnviando(false);
    if (r.ok) { toast.success("Nombre actualizado."); onListo(); onCerrar(); } else setError(r.error);
  };
  return <Dialog open={!!item} onOpenChange={(v) => { if (!v) onCerrar(); }}>
    <DialogContent>
      <form onSubmit={enviar} className="grid gap-4">
        <DialogHeader><DialogTitle>Renombrar</DialogTitle><DialogDescription>El nombre debe ser único en esta ubicación.</DialogDescription></DialogHeader>
        <label className="block space-y-1.5 text-sm font-medium">Nombre<Input ref={entrada} value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={item?.tipo === "carpeta" ? 80 : 150} required aria-invalid={!!error} /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={onCerrar}>Cancelar</Button><Button type="submit" loading={enviando}>Guardar</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

/** Mover a… con selector de carpetas (árbol plano con sangría), para uno o varios elementos. */
export function DialogoMover({ items, opciones, onCerrar, onListo }: { items: Item[]; opciones: CarpetaOpcion[]; onCerrar: () => void; onListo: () => void }) {
  const [destino, setDestino] = useState<string | null | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clave = items.map((i) => i.id).join(",");
  useEffect(() => { queueMicrotask(() => { setDestino(undefined); setError(null); }); }, [clave]);
  const ambitos = new Set(items.map((i) => i.ambito));
  const ambito = items[0]?.ambito ?? "unidad";
  const excluidos = useMemo(() => {
    const fuera = new Set(items.filter((i) => i.tipo === "carpeta").map((i) => i.id));
    let cambio = true;
    while (cambio) { cambio = false; for (const o of opciones) if (o.parentId && fuera.has(o.parentId) && !fuera.has(o.id)) { fuera.add(o.id); cambio = true; } }
    return fuera;
  }, [items, opciones]);
  const lista = opciones.filter((o) => o.ambito === ambito && o.editable && !excluidos.has(o.id));
  const actual = items.length === 1 ? (items[0].carpetaId ?? null) : undefined;
  const mover = async () => {
    if (destino === undefined) return;
    setEnviando(true); setError(null);
    const r = await moverDirectoAction(items.map((i) => ({ tipo: i.tipo, id: i.id })), destino).catch(() => ({ ok: false as const, error: "No se pudo mover." }));
    setEnviando(false);
    if (r.ok) { toast.success(r.mensaje ?? "Movido."); onListo(); onCerrar(); } else setError(r.error);
  };
  const opcion = (id: string | null, etiqueta: string, nivel: number, Icon: typeof Folder) => <li key={id ?? "raiz"}><button type="button" role="radio" aria-checked={destino === id} disabled={actual === id} onClick={() => setDestino(id)} style={{ paddingLeft: `${0.75 + nivel * 1.25}rem` }} className={cn("flex min-h-11 w-full items-center gap-2 rounded-md pr-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", destino === id ? "bg-sec-suave font-semibold text-sec-tinta" : "hover:bg-accent")}><Icon className="size-4 shrink-0 text-sec-trazo" strokeWidth={2} aria-hidden /><span className="truncate">{etiqueta}</span>{actual === id && <span className="ml-auto text-xs text-muted-foreground">Ubicación actual</span>}</button></li>;
  return <Dialog open={items.length > 0} onOpenChange={(v) => { if (!v) onCerrar(); }}>
    <DialogContent>
      <DialogHeader><DialogTitle>Mover {items.length === 1 ? `«${items[0].nombre}»` : `${items.length} elementos`}</DialogTitle><DialogDescription>Elige la carpeta de destino.</DialogDescription></DialogHeader>
      {ambitos.size > 1 ? <p role="alert" className="text-sm text-destructive">Elige elementos de una sola sección (Mi unidad o Biblioteca) para moverlos juntos.</p> : <ul role="radiogroup" aria-label="Carpeta de destino" className="max-h-[45dvh] space-y-0.5 overflow-y-auto rounded-lg border border-borde-sutil p-1">
        {opcion(null, ambito === "unidad" ? "Mi unidad" : "Biblioteca del colegio", 0, FolderOpen)}
        {lista.map((o) => opcion(o.id, o.ruta.split(" / ").pop() ?? o.ruta, o.ruta.split(" / ").length, Folder))}
      </ul>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button variant="outline" onClick={onCerrar}>Cancelar</Button><Button onClick={() => void mover()} loading={enviando} disabled={destino === undefined || ambitos.size > 1}>Mover aquí</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

/** Vista previa: PDF e imágenes en el modal; DOCX y XLSX como tarjeta con «Descargar». */
export function VistaPrevia({ item, onCerrar }: { item: Item | null; onCerrar: () => void }) {
  const a = item?.archivo;
  const pdf = a?.mimeType === "application/pdf";
  const imagen = a?.mimeType.startsWith("image/");
  return <Dialog open={!!item} onOpenChange={(v) => { if (!v) onCerrar(); }}>
    <DialogContent className="sm:max-w-4xl" aria-describedby={undefined}>
      <DialogHeader><DialogTitle className="truncate">{item?.nombre}</DialogTitle><DialogDescription>{item && `${tipoLegible(item)}${item.tamano !== null ? ` · ${formatoTamano(item.tamano)}` : ""}`}</DialogDescription></DialogHeader>
      {item && a && (pdf ? <iframe title={`Vista previa de ${item.nombre}`} src={`/archivos/${a.id}?vista=1`} className="h-[62dvh] w-full rounded-lg border border-borde-sutil bg-background" />
        : imagen ? <Image unoptimized alt={item.nombre} src={`/archivos/${a.id}?vista=1`} width={1000} height={700} className="max-h-[62dvh] w-full rounded-lg border border-borde-sutil bg-superficie-2 object-contain" />
        : <div className="flex flex-col items-center gap-3 rounded-lg border border-borde-sutil bg-superficie-2 px-6 py-10 text-center"><span className="flex size-16 items-center justify-center rounded-xl bg-sec-suave"><Icono item={item} className="size-8" /></span><p className="font-medium">{a.nombre}</p><p className="max-w-sm text-muted-foreground">Este tipo de archivo no se muestra aquí. Descárgalo para abrirlo en tu computadora o celular.</p></div>)}
      <DialogFooter>
        {pdf && a && <a href={`/archivos/${a.id}?vista=1`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-superficie-elevada px-4 text-sm font-semibold hover:bg-superficie-2"><ExternalLink className="size-4" strokeWidth={2} aria-hidden /> Abrir en otra pestaña</a>}
        {a && <a href={`/archivos/${a.id}`} download={a.nombre} className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Download className="size-4" strokeWidth={2} aria-hidden /> Descargar</a>}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Building2, Download, Share2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatoTamano } from "@/lib/adjuntos";
import type { CarpetaOpcion } from "@/lib/server/documentos";
import { cargarActividadDocumentoAction, cargarDetalleAccesosAction } from "./actions";
import { ETIQUETA_ROL, GRUPOS_ROL, fecha, fechaHora, iniciales, tipoLegible, Icono, type Item } from "./tipos-documentos";

type Detalle = Awaited<ReturnType<typeof cargarDetalleAccesosAction>>;
type Actividad = Awaited<ReturnType<typeof cargarActividadDocumentoAction>>;

function Fila({ nombre, sub, grupo, derecha }: { nombre: string; sub: string; grupo?: boolean; derecha: string }) {
  return <li className="flex min-h-12 items-center gap-3 py-1.5"><span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sec-suave text-xs font-semibold text-sec-tinta">{grupo ? <Users className="size-4 text-sec-trazo" strokeWidth={2} /> : iniciales(nombre)}</span><span className="min-w-0 flex-1"><span className="block truncate font-medium">{nombre}</span><span className="block truncate text-xs text-muted-foreground">{sub}</span></span><span className="shrink-0 text-xs text-muted-foreground">{derecha}</span></li>;
}

/** Panel lateral de detalles (hoja inferior en móvil): metadatos, quién tiene acceso y actividad reciente. */
export function PanelDetalles({ item, opciones, onCerrar, onCompartir, extra }: { item: Item | null; opciones: CarpetaOpcion[]; onCerrar: () => void; onCompartir: (i: Item) => void; extra?: ReactNode }) {
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [actividad, setActividad] = useState<Actividad | null>(null);
  const id = item?.id;
  const tipo = item?.tipo;
  useEffect(() => {
    if (!id || !tipo) return;
    queueMicrotask(() => { setDetalle(null); setActividad(null); });
    void cargarDetalleAccesosAction(tipo, id).then(setDetalle).catch(() => setDetalle(null));
    void cargarActividadDocumentoAction(tipo, id).then(setActividad).catch(() => setActividad([]));
  }, [id, tipo]);
  const ubicacion = item ? (opciones.find((o) => o.id === item.carpetaId)?.ruta ?? (item.ambito === "unidad" ? "Mi unidad" : "Biblioteca del colegio")) : "";
  const todos = detalle ? [...detalle.entradas.map((e) => ({ ...e, desde: null as string | null })), ...detalle.heredadas.map((h) => ({ ...h, membershipId: h.email ? "x" : null }))] : [];
  return <Sheet open={!!item} onOpenChange={(v) => { if (!v) onCerrar(); }}>
    <SheetContent side="right" movil="abajo" className="sm:max-w-md" aria-describedby={undefined}>
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2"><Icono item={item ?? { tipo: "carpeta" }} /><span className="truncate">{item?.nombre}</span></SheetTitle>
        <SheetDescription>Detalles</SheetDescription>
      </SheetHeader>
      {item && <SheetBody className="gap-5 pb-5 text-sm">
        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2.5">
          <dt className="text-muted-foreground">Tipo</dt><dd>{tipoLegible(item)}</dd>
          <dt className="text-muted-foreground">Tamaño</dt><dd className="tabular-nums">{item.tamano === null ? (item.tipo === "carpeta" ? "—" : "—") : formatoTamano(item.tamano)}</dd>
          <dt className="text-muted-foreground">Ubicación</dt><dd className="break-words">{ubicacion}</dd>
          <dt className="text-muted-foreground">Propietario</dt><dd>{item.propietario}</dd>
          <dt className="text-muted-foreground">Creado</dt><dd className="tabular-nums">{fecha.format(item.creado)}</dd>
          <dt className="text-muted-foreground">Modificado</dt><dd className="tabular-nums">{fecha.format(item.modificado)}</dd>
        </dl>
        <section aria-label="Quién tiene acceso" className="space-y-1">
          <h3 className="text-sm font-semibold">Quién tiene acceso</h3>
          {!detalle ? <div role="status" aria-busy className="h-12 motion-safe:animate-pulse rounded-lg bg-sec-suave"><span className="sr-only">Cargando</span></div> : <ul className="divide-y divide-borde-sutil">
            {detalle.propietario && <Fila nombre={detalle.propietario.nombre} sub={ETIQUETA_ROL[detalle.propietario.rol] ?? detalle.propietario.rol} derecha="Propietario" />}
            {todos.map((e) => <Fila key={`${e.id}-${e.desde ?? "h"}`} nombre={e.nombre} grupo={!e.email} sub={e.email ? (ETIQUETA_ROL[e.rolDestino ?? ""] ?? "") : (("desde" in e && e.desde) ? `Heredado de «${e.desde}»` : "Grupo")} derecha={e.nivel === "editor" ? "Editor" : "Lector"} />)}
            {detalle.general.roles.length > 0 && <li className="flex min-h-12 items-center gap-3 py-1.5"><span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sec-suave"><Building2 className="size-4 text-sec-trazo" strokeWidth={2} /></span><span className="min-w-0 flex-1"><span className="block font-medium">Todo el colegio</span><span className="block text-xs text-muted-foreground">{detalle.general.roles.map((r) => GRUPOS_ROL.find((g) => g.rol === r)?.plural ?? r).join(", ")}</span></span><span className="shrink-0 text-xs text-muted-foreground">Lector</span></li>}
            {todos.length === 0 && detalle.general.roles.length === 0 && <li className="py-2 text-muted-foreground">Solo el propietario y dirección.</li>}
          </ul>}
        </section>
        <section aria-label="Actividad reciente" className="space-y-1">
          <h3 className="text-sm font-semibold">Actividad reciente</h3>
          {!actividad ? <div role="status" aria-busy className="h-10 motion-safe:animate-pulse rounded-lg bg-sec-suave"><span className="sr-only">Cargando</span></div> : actividad.length ? <ul className="divide-y divide-borde-sutil">{actividad.map((a, i) => <li key={i} className="flex min-h-10 items-center justify-between gap-3 py-1.5"><span>{a.texto}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fechaHora.format(a.createdAt)}</span></li>)}</ul> : <p className="py-2 text-muted-foreground">Todavía no hay actividad.</p>}
        </section>
        <div className="flex flex-wrap gap-2">
          {item.gestionable && <Button variant="outline" onClick={() => onCompartir(item)}><Share2 aria-hidden /> Compartir</Button>}
          {item.archivo && <a href={`/archivos/${item.archivo.id}`} download={item.archivo.nombre} className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-input bg-superficie-elevada px-4 text-sm font-semibold hover:bg-superficie-2"><Download className="size-4" strokeWidth={2} aria-hidden /> Descargar</a>}
          {extra}
        </div>
      </SheetBody>}
    </SheetContent>
  </Sheet>;
}

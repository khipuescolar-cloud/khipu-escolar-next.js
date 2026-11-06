"use client";

import type { ReactNode } from "react";
import { ContextMenu } from "@base-ui/react/context-menu";
import { MoreVertical, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Icono, type Item } from "./tipos-documentos";

export type Accion = { id: string; etiqueta: string; icono: LucideIcon; alElegir: () => void; destructiva?: boolean; separadorAntes?: boolean };

const CLASE_ITEM = "flex min-h-11 w-full cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0";

/** Botón ⋮: menú desplegable en escritorio; en móvil avisa para abrir la hoja inferior. */
export function BotonOpciones({ item, acciones, alAbrirMovil }: { item: Item; acciones: Accion[]; alAbrirMovil: (i: Item) => void }) {
  const movil = useIsMobile();
  const etiqueta = `Opciones de ${item.nombre}`;
  if (movil) return <Button variant="ghost" size="icon" aria-label={etiqueta} onClick={() => alAbrirMovil(item)}><MoreVertical strokeWidth={2} aria-hidden /></Button>;
  return <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={etiqueta} />}><MoreVertical strokeWidth={2} aria-hidden /></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-56">
      {acciones.map((a) => <div key={a.id}>{a.separadorAntes && <DropdownMenuSeparator />}<DropdownMenuItem className="min-h-11" variant={a.destructiva ? "destructive" : "default"} onClick={a.alElegir}><a.icono strokeWidth={2} aria-hidden /> {a.etiqueta}</DropdownMenuItem></div>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}

/** Clic derecho sobre una fila o tarjeta: el mismo menú que el botón ⋮. `render` es el elemento que recibe el clic derecho. */
export function MenuContextual({ acciones, render, children }: { acciones: Accion[]; render: React.ReactElement<Record<string, unknown>>; children: ReactNode }) {
  return <ContextMenu.Root>
    <ContextMenu.Trigger render={render}>{children}</ContextMenu.Trigger>
    <ContextMenu.Portal>
      <ContextMenu.Positioner className="isolate z-50 outline-none">
        <ContextMenu.Popup className="z-50 min-w-56 overflow-hidden rounded-lg border border-borde-sutil bg-popover p-1 text-popover-foreground shadow-md outline-none">
          {acciones.map((a) => <div key={a.id}>{a.separadorAntes && <ContextMenu.Separator className="-mx-1 my-1 h-px bg-borde-sutil" />}<ContextMenu.Item onClick={a.alElegir} className={cn(CLASE_ITEM, a.destructiva && "text-destructive data-highlighted:bg-destructive/10 data-highlighted:text-destructive")}><a.icono strokeWidth={2} aria-hidden /> {a.etiqueta}</ContextMenu.Item></div>)}
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  </ContextMenu.Root>;
}

/** Hoja inferior con las acciones (móvil). */
export function HojaAcciones({ item, acciones, onCerrar }: { item: Item | null; acciones: Accion[]; onCerrar: () => void }) {
  return <Sheet open={!!item} onOpenChange={(v) => { if (!v) onCerrar(); }}>
    <SheetContent side="bottom" movil="abajo" aria-describedby={undefined}>
      <SheetHeader><SheetTitle className="flex items-center gap-2">{item && <Icono item={item} />}<span className="truncate">{item?.nombre}</span></SheetTitle><SheetDescription className="sr-only">Acciones disponibles</SheetDescription></SheetHeader>
      <ul className="px-2 pb-4">{acciones.map((a) => <li key={a.id} className={cn(a.separadorAntes && "mt-1 border-t border-borde-sutil pt-1")}><button type="button" onClick={() => { onCerrar(); a.alElegir(); }} className={cn("flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent", a.destructiva && "text-destructive")}><a.icono className="size-5 shrink-0" strokeWidth={2} aria-hidden /> {a.etiqueta}</button></li>)}</ul>
    </SheetContent>
  </Sheet>;
}
